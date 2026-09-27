-- クエストに座標を入れ、揃ったものを公開する
--
-- GEO_CHECKIN は latitude / longitude / radius_meters が揃わないとチェックインが
-- 成立しない（redeem-geo-checkin.ts:56-58）。座標が入ったものだけ公開し、
-- 残りは非表示のままにする。
--
-- 座標の出どころ:
--   - 依頼者からいただいた Google マップの短縮URLを展開して取得（4件）
--   - 会場が既存スポットと同じものは、その座標を使い回す（2件）
--
-- 更新条件に latitude IS NULL を入れてあるので、この間に /admin で入力されて
-- いた場合は上書きしない。

-- ==============================================
-- Part 1: 座標を入れる
-- ==============================================

-- キウイの国（大熊町）。https://maps.app.goo.gl/wdJ3tqDFZ8z7HdCW9
UPDATE public.missions SET
  latitude = 37.3987077, longitude = 140.9639732,
  google_map_url = 'https://maps.app.goo.gl/wdJ3tqDFZ8z7HdCW9',
  updated_at = now()
WHERE slug = 'event-kiwi-harvest' AND latitude IS NULL;

-- 六本木ヒルズアリーナ。https://maps.app.goo.gl/zr8d4EiNdnm32AGh8
UPDATE public.missions SET
  latitude = 35.6597066, longitude = 139.7275305,
  google_map_url = 'https://maps.app.goo.gl/zr8d4EiNdnm32AGh8',
  updated_at = now()
WHERE slug = 'event-fukushima-hitono-kagayaki-tokyo' AND latitude IS NULL;

-- 北泉海岸（南相馬市）。https://maps.app.goo.gl/GjRrDaoQaCd4fzP29
UPDATE public.missions SET
  latitude = 37.6591709, longitude = 141.0087704,
  google_map_url = 'https://maps.app.goo.gl/GjRrDaoQaCd4fzP29',
  updated_at = now()
WHERE slug = 'event-kitaizumi-surf-festival' AND latitude IS NULL;

-- おおくまハッカソン。座標は本番に入っている値をそのまま使い、地図URLだけ足す
UPDATE public.missions SET
  google_map_url = 'https://maps.app.goo.gl/d8XAjfRnzCoVvxEA6',
  updated_at = now()
WHERE slug = 'event-okuma-hackathon-2026' AND google_map_url IS NULL;

-- 収穫祭の会場はかわうちワイナリーそのものなので、スポットの座標を使い回す
UPDATE public.missions SET
  latitude = 37.39627131168363, longitude = 140.7375328799335,
  google_map_url = 'https://maps.app.goo.gl/2WhNLLQ3v7nRPiq77',
  updated_at = now()
WHERE slug = 'event-kawauchi-winery-harvest' AND latitude IS NULL;

-- 公界茶会。詳細URLが nomavalley.jp なのでノーマの谷を会場とみなし、
-- スポットの座標を使い回す。会場が違っていたら座標だけ差し替える
UPDATE public.missions SET
  latitude = 37.503972, longitude = 140.929806,
  google_map_url = 'https://maps.app.goo.gl/Lx41bXNyaGb84io47',
  updated_at = now()
WHERE slug = 'event-kokai-chakai' AND latitude IS NULL;

-- ==============================================
-- Part 2: 座標が揃ったものを公開する
-- ==============================================
-- 座標と半径が両方入っているクエストだけを公開する。条件を明示的に書いて
-- あるので、座標が無いもの（visit-tokichiro-gama や会場未定のイベント）は
-- 自動的に非表示のまま残る。
--
-- referred-signup は紹介URLからの自動達成用で、一覧に出すものではないため
-- 除外する。

UPDATE public.missions SET is_hidden = false, updated_at = now()
WHERE required_artifact_type = 'GEO_CHECKIN'
  AND is_hidden = true
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND radius_meters IS NOT NULL;
