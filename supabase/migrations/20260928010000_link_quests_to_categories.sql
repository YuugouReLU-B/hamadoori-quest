-- クエストをカテゴリに紐付ける（これが無いと一覧に出ない）
--
-- mission_category_view は mission_category_link を JOIN しているため、
-- 紐付けが無いクエストは is_hidden = false にしても画面に出てこない。
--
--   FROM mission_category c
--     JOIN mission_category_link l ON c.id = l.category_id
--     JOIN missions m ON l.mission_id = m.id
--   WHERE c.del_flg = false AND l.del_flg = false AND m.is_hidden = false
--
-- 20260927010000 でクエストを登録したとき、この紐付けを作っていなかったため
-- 公開しても本番のトップに1件も出ていなかった。
--
-- 対応表は mission_data/category_links.yaml が正で、mission:sync が反映する
-- 仕組みになっている。ただし mission:sync は deploy.yml から外してあり
-- （管理画面が正なので毎デプロイ流さない方針）、本番の service role key も
-- 手元に無いため、ここでマイグレーションとして流す。
--
-- slug で JOIN しているので、本番に存在しないクエスト（seed-cleanup など）は
-- 自動的に飛ばされる。主キーは (mission_id, category_id) なので
-- ON CONFLICT DO NOTHING で冪等。

INSERT INTO public.mission_category_link (mission_id, category_id, sort_no, del_flg)
SELECT m.id, c.id, v.sort_no, false
FROM (VALUES
  -- 公式LINE登録をしよう
  ('add-supporter-line-friend',             'official-line-registration', 100),
  -- 紹介クエスト。表示上の見出しは quest_category（SNS登録）で決まるので、
  -- ここは一覧に出すための紐付けとして PERMANENT のカテゴリに寄せている
  ('referral',                              'official-line-registration', 200),

  -- プレイヤーを訪問しよう
  ('visit-turtle-cycle',                    'visit-checkpoints', 100),
  ('visit-kawauchi-winery',                 'visit-checkpoints', 200),
  ('visit-noma-horse-village',              'visit-checkpoints', 300),
  ('visit-fukudosha',                       'visit-checkpoints', 400),
  ('visit-zuzu-warehouse',                  'visit-checkpoints', 500),
  ('visit-tokichiro-gama',                  'visit-checkpoints', 600),
  ('visit-hotel-futabatei',                 'visit-checkpoints', 700),

  -- イベントに参加しよう（開催日の早い順）
  ('event-kitaizumi-surf-festival',         'attend-events',  50),
  ('event-kawauchi-hillclimb',              'attend-events', 100),
  ('event-kitaizumi-surfing',               'attend-events', 200),
  ('event-hamadori-food-art',               'attend-events', 300),
  ('event-hamafes',                         'attend-events', 400),
  ('event-kawauchi-winery-harvest',         'attend-events', 500),
  ('event-kokai-chakai',                    'attend-events', 600),
  ('event-hamakaido-trail',                 'attend-events', 700),
  ('event-iwaki-cosplay',                   'attend-events', 800),
  ('event-kiwi-harvest',                    'attend-events', 900),
  ('event-haccoba-fukudosha-tokyo',         'attend-events', 1000),
  ('event-fukushima-hitono-kagayaki-tokyo', 'attend-events', 1100)
) AS v(mission_slug, category_slug, sort_no)
JOIN public.missions m ON m.slug = v.mission_slug
JOIN public.mission_category c ON c.slug = v.category_slug
ON CONFLICT (mission_id, category_id) DO NOTHING;
