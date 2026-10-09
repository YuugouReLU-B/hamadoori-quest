-- 管理画面で作られたクエストのうち、地域(region)が空で、カードと詳細に地域チップが
-- 出ていなかったものに地域を入れる（依頼者の指定）。
-- 月の下アートセンターは地域の代わりにタグ1へ「富岡町」を入れていたので外す。
--
-- 管理画面ですでに直されている場合（値が以前のままでない場合）は上書きしない。

-- 夜の森ピクニック（夜の森公園）
UPDATE public.missions SET region = 'TOMIOKA', updated_at = now()
WHERE slug = 'quest-3b73af36' AND region IS NULL;

-- 平コスハロウィン（いわき平 LATOV）
UPDATE public.missions SET region = 'IWAKI', updated_at = now()
WHERE slug = 'quest-f123972b' AND region IS NULL;

-- 標葉祭り（CREVAおおくま・クマSUNテラス）
UPDATE public.missions SET region = 'OKUMA', updated_at = now()
WHERE slug = 'quest-88f1b95c' AND region IS NULL;

-- 月の下アートセンター（10/22・富岡町）
UPDATE public.missions SET region = 'TOMIOKA', tag1 = NULL, updated_at = now()
WHERE slug = 'quest-1de63405-copy-1791548985726' AND region IS NULL AND tag1 = '富岡町';
