-- クエストデータの取りこぼしと座標のズレを直す。
--
-- 1. おおくまハッカソンが本番に無かったので入れ直す
-- 2. GoogleマップURLのピンではなくビューポート座標を拾っていた3件を直す
-- 3. ノーマの谷の座標をマップURLのピンに合わせる
-- 4. 初期マイグレーション由来の旧クエスト2件を消す

-- ==============================================
-- Part 1: おおくまハッカソンを登録する
-- ==============================================
-- 20260927010000 の Part 4 は event-okuma-hackathon-2026 を UPDATE する前提だったが、
-- その slug の行が本番に存在せず 0 件マッチで素通りしていた（UPDATE は 0 件でも成功する）。
-- 9/15 は過去日なので一覧・地図には出ないが、カレンダーには残る。

INSERT INTO public.missions (
  id, slug, title, content, quest_category, event_category, region, required_artifact_type, points, difficulty, max_achievement_count, is_featured, is_hidden, latitude, longitude, radius_meters, google_map_url, address, event_date, event_end_date
) VALUES (
  gen_random_uuid(),
  'event-okuma-hackathon-2026',
  'おおくまハッカソン最終発表＠大熊町',
  '学生団体 ReLU Branch が開く「おおくまハッカソン2026」の最終発表会。全国から集まった学生や若手エンジニアが、大熊町のキウイ農家の現場課題に挑み、8月末の現地開発を経てつくったものを発表します。

<a href="https://note.com/relu_branch/n/n242d31a479d3" target="_blank" rel="noopener noreferrer">詳細を見る</a>',
  'SPECIAL_HAMADORI', 'MIXED', 'OKUMA', 'GEO_CHECKIN', 200, 1, 1, false, false,
  37.4110133, 140.9831875, 3000,
  'https://maps.app.goo.gl/d8XAjfRnzCoVvxEA6',
  '福島県双葉郡大熊町下野上大野116-5',
  '2026-09-15', NULL
)
ON CONFLICT (slug) DO NOTHING;

-- カテゴリに紐付けないと mission_category_view に出てこない
INSERT INTO public.mission_category_link (mission_id, category_id)
SELECT m.id, c.id
FROM public.missions m
JOIN public.mission_category c ON c.slug = 'attend-events'
WHERE m.slug = 'event-okuma-hackathon-2026'
ON CONFLICT (mission_id, category_id) DO NOTHING;

-- ==============================================
-- Part 2: ビューポート座標を拾っていた3件を直す
-- ==============================================
-- Googleマップの共有URLを展開すると @lat,lng（表示中の地図の中心）と
-- !3d/!4d（ピンそのもの）の2種類が出てくる。前者を拾うと実際の場所からずれる。

-- 北泉サーフフェス: 海岸のピンに対して 908m 内陸にずれていた
UPDATE public.missions
SET latitude = 37.6591718, longitude = 141.0190701
WHERE slug = 'event-kitaizumi-surf-festival';

-- キウイ収穫体験: 228m のずれ
UPDATE public.missions
SET latitude = 37.3987077, longitude = 140.9665481
WHERE slug = 'event-kiwi-harvest';

-- HITONO-KAGAYAKI（六本木ヒルズアリーナ）: 233m のずれ
UPDATE public.missions
SET latitude = 35.6597066, longitude = 139.7301054
WHERE slug = 'event-fukushima-hitono-kagayaki-tokyo';

-- ==============================================
-- Part 3: ノーマの谷の座標をマップURLのピンに合わせる
-- ==============================================
-- 同じ会場で開く公界茶会（37.5060668, 140.9309086）とほぼ一致するのはピン側。
UPDATE public.missions
SET latitude = 37.5062578, longitude = 140.9311686
WHERE slug = 'visit-noma-horse-village';

-- ==============================================
-- Part 4: 旧クエスト2件を消す
-- ==============================================
-- visit-turtle-cycle / visit-kawauchi-winery を入れる前からあった行。
-- 座標が両方とも 37.7605, 140.4739 というダミー値で、カテゴリにも紐付いて
-- いないため一覧には出ないが、管理画面には並ぶ。達成記録があれば残す。

DELETE FROM public.mission_category_link
WHERE mission_id IN (
  SELECT id FROM public.missions
  WHERE slug IN ('turtle-cycle', 'kawauchi-winery')
    AND id NOT IN (SELECT mission_id FROM public.achievements)
);

DELETE FROM public.missions
WHERE slug IN ('turtle-cycle', 'kawauchi-winery')
  AND id NOT IN (SELECT mission_id FROM public.achievements);
