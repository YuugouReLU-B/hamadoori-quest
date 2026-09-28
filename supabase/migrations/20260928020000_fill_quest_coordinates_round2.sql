-- クエストの座標を追加で埋め、公開する（2回目）
--
-- いただいた Google マップの短縮URLを展開して取得した。展開時は
-- 表示中心（URLの @lat,lng）ではなく地点ピン（!3d / !4d）を使っている。
-- @ は地図のビューポート中心で、地点から数km ずれることがあるため。
--
-- 実際、食と藝術は @ が 37.3163,140.9298（富岡町中心から約7km内陸）だったが、
-- ピンは 37.3402,141.0135 で富岡町中心。ピンが正しい。

-- ==============================================
-- Part 1: 新しく座標が取れたもの
-- ==============================================

-- 川内村（川内小中学園あたり）。https://maps.app.goo.gl/9YYXNtm9VjN3CDHDA
-- 開催が 10/3 と近いので優先して入れる
UPDATE public.missions SET
  latitude = 37.343584, longitude = 140.8030727,
  google_map_url = 'https://maps.app.goo.gl/9YYXNtm9VjN3CDHDA',
  updated_at = now()
WHERE slug = 'event-kawauchi-hillclimb' AND latitude IS NULL;

-- 富岡町中心。https://maps.app.goo.gl/inBkC5N5VCdHxp1fA
UPDATE public.missions SET
  latitude = 37.3402019, longitude = 141.013543,
  google_map_url = 'https://maps.app.goo.gl/inBkC5N5VCdHxp1fA',
  updated_at = now()
WHERE slug = 'event-hamadori-food-art' AND latitude IS NULL;

-- 道の駅なみえ。https://maps.app.goo.gl/RaUAK6zhLmhDeawH8
UPDATE public.missions SET
  latitude = 37.4964949, longitude = 141.0001659,
  google_map_url = 'https://maps.app.goo.gl/RaUAK6zhLmhDeawH8',
  updated_at = now()
WHERE slug = 'event-hamafes' AND latitude IS NULL;

-- 陶吉郎窯。地図が指すのはいわき市だが、地域は浪江町のままにする（依頼者の判断）。
-- 大堀相馬焼の産地は浪江町で、窯そのものは避難先のいわきにあるという整理。
-- https://maps.app.goo.gl/a9ymDHdgANnQ6sc99
UPDATE public.missions SET
  latitude = 37.0764857, longitude = 140.9746695,
  google_map_url = 'https://maps.app.goo.gl/a9ymDHdgANnQ6sc99',
  updated_at = now()
WHERE slug = 'visit-tokichiro-gama' AND latitude IS NULL;

-- ==============================================
-- Part 2: 推測で入れていた2件を、専用の地図URLの値に差し替える
-- ==============================================
-- 20260927020000 では会場が分からず、近いスポットの座標を流用していた。
-- 今回それぞれの地図URLをもらえたので、そちらを正とする。
-- 既に値が入っているため IS NULL の条件は付けない。

-- かわうちワイナリー収穫祭。畑側。流用していたワイナリー本体とほぼ同じ位置だった
UPDATE public.missions SET
  latitude = 37.3960554, longitude = 140.7375929,
  google_map_url = 'https://maps.app.goo.gl/NAhanq8YUB1vwGC36',
  updated_at = now()
WHERE slug = 'event-kawauchi-winery-harvest';

-- 公界茶会。流用していたノーマの谷から約250m。会場の推測は当たっていた
UPDATE public.missions SET
  latitude = 37.5060668, longitude = 140.9309086,
  google_map_url = 'https://maps.app.goo.gl/hETeFrpohpydY4gC8',
  updated_at = now()
WHERE slug = 'event-kokai-chakai';

-- 浜街道トレイルウォーク。集合場所のクマSUNテラス（大熊町大字下野上字大野116-6）。
-- https://maps.app.goo.gl/fN38yHZTyn5qvH3v5
--
-- 半径だけ 10000m にする。コースが大熊町〜富岡町の約17.3kmあり、既定の
-- 3000m だと富岡側の終点で届かないため。歩いている途中どこでも達成できる
-- ようにする（依頼者の「トレイルのような距離があるものは広く取る」方針）。
-- 起点をもっと厳密にしたい場合は 3000m に戻す。
UPDATE public.missions SET
  latitude = 37.4098895, longitude = 140.9825867,
  radius_meters = 10000,
  google_map_url = 'https://maps.app.goo.gl/fN38yHZTyn5qvH3v5',
  address = '福島県双葉郡大熊町大字下野上字大野116-6 クマSUNテラス',
  updated_at = now()
WHERE slug = 'event-hamakaido-trail' AND latitude IS NULL;

-- ==============================================
-- Part 3: 座標が揃ったものを公開する
-- ==============================================
-- 20260927020000 と同じ条件。座標が無いものは非表示のまま残る。

UPDATE public.missions SET is_hidden = false, updated_at = now()
WHERE required_artifact_type = 'GEO_CHECKIN'
  AND is_hidden = true
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND radius_meters IS NOT NULL;
