-- 社内エージェント whale 用の DB ログイン（whale_agent）を作る。
--
-- できること
--   読む  : public スキーマのテーブル・ビューすべて（秘密値を持つ4テーブルを除く）
--   作る  : クエスト（missions）を非公開（is_hidden = true）で作る。
--           あわせてカテゴリの紐付け（mission_category_link）とリンク先（mission_main_links）
--   直す  : 一度も公開されていないクエストと、その紐付け・リンク先だけ
-- できないこと
--   公開する（is_hidden を false にする）／公開済みのクエストを変える／消す
--
-- 「一度でも公開されたか」は is_hidden だけでは分からないので、first_published_at を足す。
-- 公開（is_hidden = false）になった瞬間にトリガーが日時を入れ、以後は消さない。
-- このマイグレーション以前からある行は、非表示のものも含めて全件「公開済み扱い」で埋める。
-- 過去に公開されたかどうか分からないため。whale に直させてよい下書きは、人が
--   update missions set first_published_at = null where id = '...' and is_hidden;
-- で個別に解除する。
--
-- 制限は DB で強制する（アプリ側のチェックに頼らない）。パスワードはここでは設定しない。
-- 本番適用後、SQL Editor で人が設定する:
--   alter role whale_agent with password '<十分に長いランダム値>';

-- 1. 公開履歴 ---------------------------------------------------------------

alter table public.missions
  add column if not exists first_published_at timestamptz;

comment on column public.missions.first_published_at is
  '初めて公開（is_hidden = false）された日時。一度入ったら消えない。null は一度も公開されていない下書き';

update public.missions
   set first_published_at = coalesce(first_published_at, now())
 where first_published_at is null;

create or replace function public.missions_track_first_published()
returns trigger
language plpgsql
as $$
begin
  if new.is_hidden = false and new.first_published_at is null then
    new.first_published_at := now();
  end if;
  -- 一度入った公開日時は誰も消せない（下書きに戻すことはできない）。
  -- ただし人（whale_agent 以外）は、既存行の解除のために null へ戻せる。
  if tg_op = 'UPDATE' and old.first_published_at is not null
     and new.first_published_at is null and current_user = 'whale_agent' then
    raise exception 'whale_agent は公開履歴を消せません';
  end if;
  return new;
end;
$$;

drop trigger if exists missions_track_first_published on public.missions;
create trigger missions_track_first_published
  before insert or update on public.missions
  for each row execute function public.missions_track_first_published();

-- 2. ロール ------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'whale_agent') then
    create role whale_agent login noinherit nocreatedb nocreaterole;
  end if;
end;
$$;

grant usage on schema public to whale_agent;

-- 3. 読む --------------------------------------------------------------------
-- RLS が有効なテーブルは GRANT だけでは読めないので、whale_agent 向けの SELECT ポリシーを
-- 全テーブルに付ける。秘密値を持つテーブルは GRANT もポリシーも付けない。
--   mission_qr_codes          QR の秘密値（見えると達成を偽装できる）
--   lottery_tokens            抽選トークン
--   tiktok_user_connections   利用者の TikTok 連携トークン
--   youtube_user_connections  利用者の YouTube 連携トークン

do $$
declare
  r record;
  secret text[] := array['mission_qr_codes', 'lottery_tokens',
                         'tiktok_user_connections', 'youtube_user_connections'];
begin
  for r in
    select c.relname, c.relkind
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p', 'v', 'm')
       and not (c.relname = any (secret))
  loop
    execute format('grant select on public.%I to whale_agent', r.relname);
    if r.relkind in ('r', 'p') then
      execute format('drop policy if exists whale_agent_read on public.%I', r.relname);
      execute format(
        'create policy whale_agent_read on public.%I for select to whale_agent using (true)',
        r.relname);
    end if;
  end loop;
end;
$$;

-- 念のため明示的に外す（過去に PUBLIC へ付いていた権限があっても読めないように）
revoke all on public.mission_qr_codes, public.lottery_tokens,
              public.tiktok_user_connections, public.youtube_user_connections
  from whale_agent;

-- 4. 作る・直す ---------------------------------------------------------------
-- DELETE は付けない。カラム単位ではなくトリガーで中身を確かめる。

grant insert, update on public.missions to whale_agent;
grant insert, update on public.mission_category_link to whale_agent;
grant insert, update on public.mission_main_links to whale_agent;

create or replace function public.whale_agent_guard_missions()
returns trigger
language plpgsql
as $$
begin
  if current_user <> 'whale_agent' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.first_published_at is not null then
      raise exception 'whale_agent は公開済みのクエストを変更できません（mission %）', old.id;
    end if;
    if new.id <> old.id then
      raise exception 'whale_agent はクエストの id を変えられません';
    end if;
  end if;
  if new.is_hidden is distinct from true then
    raise exception 'whale_agent はクエストを公開できません（is_hidden は true のまま）';
  end if;
  return new;
end;
$$;

drop trigger if exists whale_agent_guard_missions on public.missions;
create trigger whale_agent_guard_missions
  before insert or update on public.missions
  for each row execute function public.whale_agent_guard_missions();

-- 紐付け・リンク先は、親クエストが一度も公開されていないときだけ書ける。
-- 親の行は呼び出し側（whale_agent）の権限で読む。whale_agent は missions を読めるのでこれで足りる。
create or replace function public.whale_agent_guard_mission_children()
returns trigger
language plpgsql
as $$
declare
  published timestamptz;
begin
  if current_user <> 'whale_agent' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.mission_id <> old.mission_id then
    raise exception 'whale_agent は紐付け先のクエストを付け替えられません';
  end if;
  select m.first_published_at into published
    from public.missions m
   where m.id = new.mission_id;
  if not found then
    raise exception 'クエスト % がありません', new.mission_id;
  end if;
  if published is not null then
    raise exception 'whale_agent は公開済みのクエスト（%）の紐付け・リンクを変更できません', new.mission_id;
  end if;
  return new;
end;
$$;

drop trigger if exists whale_agent_guard_category_link on public.mission_category_link;
create trigger whale_agent_guard_category_link
  before insert or update on public.mission_category_link
  for each row execute function public.whale_agent_guard_mission_children();

drop trigger if exists whale_agent_guard_main_links on public.mission_main_links;
create trigger whale_agent_guard_main_links
  before insert or update on public.mission_main_links
  for each row execute function public.whale_agent_guard_mission_children();

-- RLS: 書き込みのポリシー。中身の制限は上のトリガーが持つ。
drop policy if exists whale_agent_write on public.missions;
create policy whale_agent_write on public.missions
  for insert to whale_agent with check (true);
drop policy if exists whale_agent_update on public.missions;
create policy whale_agent_update on public.missions
  for update to whale_agent using (true) with check (true);
-- using を (first_published_at is null) にすると、公開済みの行は「見えないので0件更新」で
-- 黙って終わる。whale が止められたことに気づけるよう、行は見せてトリガーで例外を出す。

drop policy if exists whale_agent_write on public.mission_category_link;
create policy whale_agent_write on public.mission_category_link
  for insert to whale_agent with check (true);
drop policy if exists whale_agent_update on public.mission_category_link;
create policy whale_agent_update on public.mission_category_link
  for update to whale_agent using (true) with check (true);

drop policy if exists whale_agent_write on public.mission_main_links;
create policy whale_agent_write on public.mission_main_links
  for insert to whale_agent with check (true);
drop policy if exists whale_agent_update on public.mission_main_links;
create policy whale_agent_update on public.mission_main_links
  for update to whale_agent using (true) with check (true);
