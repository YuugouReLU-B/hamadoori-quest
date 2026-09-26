-- 紹介クエスト2件を種として投入する
--
-- 本番（kijylemmokeegoqxalny）の missions には referral / referred-signup が
-- どちらも存在しない。20250607041000_add_referral_mission.sql が
-- id='f570446b-b1fd-f456-fc4b-935c2b493089' で REFERRAL を入れていたが、
-- その後 /admin から削除されたとみられる（2026-09-26 に本番をダンプして確認）。
--
-- mission_data/missions.yaml + `mission:sync` で入れる手もあるが、yaml(20件)と
-- 本番(23件)は中身が別物で、sync を流すと上流由来の不要なクエストが大量に
-- 入ってしまう。そのため2件だけを冪等に挿入する。
--
-- slug は UNIQUE（missions_slug_unique）なので ON CONFLICT DO NOTHING で
-- 既に存在する環境（ローカル等）には影響しない。**既存行を上書きしない**
-- ＝ /admin での編集を壊さない。

-- 紹介した側。達成回数は無制限（何人紹介してもその都度付与される）
INSERT INTO public.missions (
  id, slug, title, content, quest_category, event_category, icon_url,
  difficulty, required_artifact_type, points, max_achievement_count,
  is_featured, is_hidden
) VALUES (
  gen_random_uuid(),
  'referral',
  '友だちに浜通りクエストを紹介しよう',
  'あなた専用の紹介URLを友だちに共有しよう。紹介URLから登録が完了すると、自動で達成になります。',
  'SNS',
  NULL,
  '/img/mission-icons/refer-a-friend.png',
  1,
  'REFERRAL',
  50,
  NULL,
  false,
  false
) ON CONFLICT (slug) DO NOTHING;

-- 紹介された側。紹介URLからの登録で自動達成になるため、一覧には出さない
INSERT INTO public.missions (
  id, slug, title, content, quest_category, event_category, icon_url,
  difficulty, required_artifact_type, points, max_achievement_count,
  is_featured, is_hidden
) VALUES (
  gen_random_uuid(),
  'referred-signup',
  '紹介されて浜通りクエストを始めよう',
  '友だちの紹介URLから登録すると自動で達成になります。',
  'SNS',
  NULL,
  '/img/mission_fallback.svg',
  1,
  'REFERRED',
  50,
  1,
  false,
  true
) ON CONFLICT (slug) DO NOTHING;
