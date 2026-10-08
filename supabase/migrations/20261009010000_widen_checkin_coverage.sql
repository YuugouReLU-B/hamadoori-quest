-- 位置情報チェックインの範囲から漏れていたイベント関連の場所を含める（依頼者の指定。
-- 方針: 半径は余裕を持って広めに取り、関連の場所が1か所も漏れないようにする）。
--
-- いずれも、管理画面ですでに直されている場合（値が以前のままでない場合）は上書きしない。

-- 浜フェス（道の駅なみえ）: 臨時駐車場⑧（双葉町産業交流センター、10日のシャトルバス
-- 発着地）が会場から約4.9〜5.0km。3,000m → 6,000m
UPDATE public.missions SET radius_meters = 6000, updated_at = now()
WHERE slug = 'event-hamafes' AND radius_meters = 3000;

-- かわうちワイナリー収穫祭: 10日夜の食事会の会場「cafe & gallery 秋風舎」
-- （川内村下川内字牛淵509）がワイナリーから約12〜13km。3,000m → 15,000m
UPDATE public.missions SET radius_meters = 15000, updated_at = now()
WHERE slug = 'event-kawauchi-winery-harvest' AND radius_meters = 3000;

-- 全日本サーフィン選手権（北泉海岸）: 予備日の10/16も押せるように終了日を延ばす
UPDATE public.missions SET event_end_date = '2026-10-16', updated_at = now()
WHERE slug = 'event-kitaizumi-surfing' AND event_end_date = '2026-10-15';
