-- 陶吉郎窯の地図と座標を、浪江町大堀の工房に差し替える（依頼者の指定）。
-- https://maps.app.goo.gl/UTJz1dvR4Q4qtAZ76
--   → 「大堀相馬焼 陶吉郎窯 大堀工房」 37.4728338, 140.9411865
-- 以前はいわき市の窯を指していたため、浪江の工房ではチェックインできなかった。
--
-- ミッションは管理画面で編集するのが正なので、管理画面ですでに直されている
-- 場合（地図URLが以前の値でない場合）は上書きしない。
UPDATE public.missions SET
  latitude = 37.4728338,
  longitude = 140.9411865,
  google_map_url = 'https://maps.app.goo.gl/UTJz1dvR4Q4qtAZ76',
  updated_at = now()
WHERE slug = 'visit-tokichiro-gama'
  AND google_map_url = 'https://maps.app.goo.gl/a9ymDHdgANnQ6sc99';
