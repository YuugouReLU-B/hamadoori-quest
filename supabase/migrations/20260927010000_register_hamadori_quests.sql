-- 浜通りのクエストを登録し直す
--
-- 埋めかけで非表示のまま残っていたクエストを作り直し、いただいた一覧の内容で
-- 登録する。全件 is_hidden = true で入れ、座標が揃ってから公開する。
--
-- GEO_CHECKIN は latitude / longitude / radius_meters が揃っていないと
-- チェックインが成立しない（redeem-geo-checkin.ts:56-58）。座標が無いものを
-- 公開すると「押しても達成できないクエスト」になるため、非表示で登録する。
--
-- 半径は依頼者の判断でスポット1000m / イベント3000m（従来は300m / 1000m）。
--
-- 詳細URLに対応する列が無いので、説明文の末尾にリンクとして入れている。
-- 説明文は mission-details.tsx:127 が innerHTML で描画するため <a> が効く。
-- 補足（supplement）はプレーンテキスト描画なのでリンクは入れていない。

-- ==============================================
-- Part 1: テストデータを達成記録ごと削除する
-- ==============================================
-- quest-1cc59e44「テストイベント」。座標が東京（35.65, 139.68）を指しており、
-- 動作確認で作られたもの。達成が1件付いているため FK
-- （achievements_mission_id_fkey は ON DELETE を持たない）で消せない。
-- 付与済みXPを差し引いてから、達成記録 → クエストの順に消す。

-- 付与したXPを user_levels から差し引く（0未満にはしない）
UPDATE public.user_levels ul
SET xp = GREATEST(0, ul.xp - sub.total), updated_at = now()
FROM (
  SELECT xt.user_id, xt.season_id, SUM(xt.xp_amount) AS total
  FROM xp_transactions xt
  JOIN achievements a ON a.id = xt.source_id
  JOIN missions m ON m.id = a.mission_id
  WHERE m.slug = 'quest-1cc59e44'
  GROUP BY xt.user_id, xt.season_id
) sub
WHERE ul.user_id = sub.user_id AND ul.season_id = sub.season_id;

-- xp_transactions.source_id は FK ではないので自分で消す
DELETE FROM public.xp_transactions xt
USING achievements a, missions m
WHERE xt.source_id = a.id AND a.mission_id = m.id AND m.slug = 'quest-1cc59e44';

-- mission_artifacts は achievements の CASCADE で一緒に消える
DELETE FROM public.achievements a
USING missions m
WHERE a.mission_id = m.id AND m.slug = 'quest-1cc59e44';

DELETE FROM public.missions WHERE slug = 'quest-1cc59e44';

-- ==============================================
-- Part 2: 埋めかけのクエストを削除する
-- ==============================================
-- いずれも達成記録ゼロ（2026-09-27 に本番を確認）。達成があるものは
-- event-okuma-hackathon-2026（3件）だけで、そちらは Part 4 で更新する。
-- mission_category_link / mission_qr_codes などは ON DELETE CASCADE。

DELETE FROM public.missions WHERE slug IN (
  'event-fukushima-hitono-kagayaki-tokyo',
  'event-haccoba-fukudosha-tokyo',
  'event-hamadori-food-art',
  'event-hamafes',
  'event-hamakaido-trail',
  'event-iwaki-cosplay',
  'event-kawauchi-hillclimb',
  'event-kawauchi-winery-harvest',
  'event-kitaizumi-surfing',
  'event-kiwi-harvest',
  'event-kokai-chakai',
  'noma-horse-village',
  'visit-fukudosha',
  'visit-hotel-futabatei',
  'visit-kawauchi-winery',
  'visit-noma-horse-village',
  'visit-tokichiro-gama',
  'visit-turtle-cycle',
  'visit-zuzu-warehouse'
) AND id NOT IN (SELECT mission_id FROM achievements);

-- ==============================================
-- Part 3: クエストを登録する
-- ==============================================
-- すべて is_hidden = true。座標が揃ってから別途まとめて公開する。
-- icon_url は入れない（event_category から getEventCategoryIcon が選ぶ）。

INSERT INTO public.missions (
  id, slug, title, content, quest_category, event_category, region, required_artifact_type, points, difficulty, max_achievement_count, is_featured, is_hidden, latitude, longitude, radius_meters, google_map_url, supplement, event_date, event_end_date
) VALUES
  (gen_random_uuid(), 'visit-turtle-cycle', 'タートルサイクル＠富岡町を訪れよう！', 'TURTLE CYCLE. 2025年10月に開業したスポーツバイクショップ。当店のバイクは全て店長の川崎隼輔（川チュン）が組んでいます。一般車の修理も対応可能。

<a href="https://r-and-t.jp/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'PERMANENT', 'SPOT', 'TOMIOKA', 'GEO_CHECKIN', 100, 1, 1, false, true, 37.33374540519472, 141.01949456445575, 1000, 'https://maps.app.goo.gl/CwindaYwkJgu5Ctp7', '営業時間:10時-19時/水曜定休', NULL, NULL),
  (gen_random_uuid(), 'visit-kawauchi-winery', 'かわうちワイナリー＠川内村を訪れよう！', 'かわうちワイン株式会社が営む、阿武隈高地の標高約750mのワイナリー。自社畑でぶどうを育て、醸造から販売まで手がけています。「この村とともに歩む」を掲げ、村の景色のなかでワインを届けています。

<a href="https://kawauchi-wine.com/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'PERMANENT', 'SPOT', 'KAWAUCHI', 'GEO_CHECKIN', 100, 1, 1, false, true, 37.39627131168363, 140.7375328799335, 1000, 'https://maps.app.goo.gl/2WhNLLQ3v7nRPiq77', '訪問希望は事前にメールでお問い合わせください。
https://kawauchi-wine.com/pages/contact', NULL, NULL),
  (gen_random_uuid(), 'visit-noma-horse-village', 'ノーマの谷＠浪江町を訪れよう！', '「馬と共に生きる庭」を掲げるノーマ・ホースヴィレッジ。相馬行胤さんと高橋大就さんが共同代表を務める驫／SOMA が運営し、浪江町室原で馬とふれあう体験ができます（体験は予約制）。

<a href="https://nomavalley.jp/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'PERMANENT', 'SPOT', 'NAMIE', 'GEO_CHECKIN', 100, 1, 1, false, true, 37.503972, 140.929806, 1000, 'https://maps.app.goo.gl/Lx41bXNyaGb84io47', '営業時間:10時-16時/火曜・水曜定休', NULL, NULL),
  (gen_random_uuid(), 'visit-fukudosha', '福土舎＠南相馬市を訪れよう！', '福島の人と仕事、食の物語を本にする出版社。南相馬市小高の小高パイオニアヴィレッジに拠点を置き、本・音声ガイド・イベントを組み合わせた「常磐線読書ジャーニー」に取り組んでいます。

<a href="https://fukudosha.theshop.jp/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'PERMANENT', 'SPOT', 'MINAMISOMA', 'GEO_CHECKIN', 100, 1, 1, false, true, 37.5629632086727, 140.99171733901954, 1000, 'https://share.google/cAYTusgHv0aHXeNF9', '事前予約制で訪問可能
https://fukudosha.theshop.jp/', NULL, NULL),
  (gen_random_uuid(), 'visit-zuzu-warehouse', '図図倉庫＠飯舘村を訪れよう！', '飯舘村に残された元ホームセンターを改装した「環境と対話する実験基地」。村で続けられてきた環境の観測・研究の常設展示やショップ、シェアオフィスがあり、土づくりのブランド「zutto soil」の商品も並びます。

<a href="https://www.zuttosoko.com/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'PERMANENT', 'SPOT', 'IITATE', 'GEO_CHECKIN', 100, 1, 1, false, true, 37.69749404530086, 140.74133861018936, 1000, 'https://maps.app.goo.gl/HM3xR1dSbYwbfwwG7', '営業時間:11時-17時 / 日曜・月曜定休', NULL, NULL),
  (gen_random_uuid(), 'visit-tokichiro-gama', '陶吉郎窯＠浪江町を訪れよう！', '300年以上の歴史を持つ大堀相馬焼の窯元。原発事故で離散した産地に戻り、次代の職人を育てながら、浪江の酒や水産など地域の産業と組んだ器づくりで、この土地の文化を伝えています。

<a href="https://www.toukichirougama.com/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'PERMANENT', 'SPOT', 'NAMIE', 'GEO_CHECKIN', 100, 1, 1, false, true, NULL, NULL, 1000, 'https://maps.app.goo.gl/a9ymDHdgANnQ6sc99', '営業時間10-18時 / 火曜定休', NULL, NULL),
  (gen_random_uuid(), 'visit-hotel-futabatei', 'ホテル双葉邸＠広野町を訪れよう！', '双葉郡広野の温もりの宿　ホテル双葉邸。
ホテル１階お食事処「ひまわり」は、ホテルへご滞在中のご朝食・夕食にはもちろん、ホテルへご宿泊にならないお客様のお食事のみもご利用いただけます。美味しい料理を囲んで、お仲間との楽しい時間をお過ごしください。

<a href="https://www.futabatei.me/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'PERMANENT', 'SPOT', 'HIRONO', 'GEO_CHECKIN', 100, 1, 1, false, true, 37.23770460368381, 141.0000445408577, 1000, 'https://maps.app.goo.gl/dQTGmFvkD4Amh6pH8', '連絡いただければ基本いつでも対応可能', NULL, NULL),
  (gen_random_uuid(), 'event-kawauchi-hillclimb', 'かわうちヒルクライム＠川内村へ！', '阿武隈高地を駆け上がる「川内村ヒルクライム・グランフォンド川内」。10月3日は川内小中学園から高塚高原までの約15km、4日は39kmと81kmのコースを走ります。ふくしま復興サイクルシリーズの一戦です。

<a href="https://fukushima-cycle-series.jp/event2cp/1024/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'SPECIAL_HAMADORI', 'SPORTS', 'KAWAUCHI', 'GEO_CHECKIN', 200, 1, 1, false, true, NULL, NULL, 3000, NULL, NULL, '2026-10-03', '2026-10-04'),
  (gen_random_uuid(), 'event-kitaizumi-surfing', '全日本サーフィン選手権＠北泉へ！', '全国70支部の予選を勝ち抜いた代表選手が集まる「第60回全日本サーフィン選手権大会」。日本サーフィン連盟が主催し、10月8日から15日まで、南相馬市の北泉海岸が舞台になります。

<a href="https://www.nsa-surf.org/match/60th_alljapan_2026/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'SPECIAL_HAMADORI', 'SPORTS', 'MINAMISOMA', 'GEO_CHECKIN', 200, 1, 1, false, true, 37.659442646314695, 141.0188125549679, 3000, 'https://maps.app.goo.gl/GjRrDaoQaCd4fzP29', NULL, '2026-10-08', '2026-10-15'),
  (gen_random_uuid(), 'event-hamadori-food-art', '食と藝術プロジェクト＠富岡町へ！', '<a href="https://invisible.tokyo/works/hamadoori-foodandart" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'SPECIAL_HAMADORI', 'ART', 'TOMIOKA', 'GEO_CHECKIN', 200, 1, 1, false, true, NULL, NULL, 3000, NULL, NULL, '2026-10-10', NULL),
  (gen_random_uuid(), 'event-hamafes', '浜フェス＠道の駅なみえへ行こう！', '福島県が開く「浜フェス2026 〜来て、見て、食べて、浜通り〜」。道の駅なみえに浜通りの日本酒と料理が並ぶ「浜フェスバル」やステージ、被災地をめぐるツアーが集まります。入場無料です。

<a href="https://hamadori-coast.com/about-hamafes2026/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'SPECIAL_HAMADORI', 'MIXED', 'NAMIE', 'GEO_CHECKIN', 200, 1, 1, false, true, NULL, NULL, 3000, NULL, NULL, '2026-10-10', '2026-10-11'),
  (gen_random_uuid(), 'event-kawauchi-winery-harvest', 'かわうちワイナリー収穫祭＠川内村へ', 'かわうちワイナリーの「収穫祭2026」。標高約750mの畑でぶどうの収穫を体験し、川内村の食材とかわうちワインを味わう食事会やライブを楽しめます。10月10日・11日の2日間の開催です。

<a href="https://kawauchi-wine.com/blogs/event" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'SPECIAL_HAMADORI', 'FOOD', 'KAWAUCHI', 'GEO_CHECKIN', 200, 1, 1, false, true, NULL, NULL, 3000, NULL, NULL, '2026-10-10', '2026-10-11'),
  (gen_random_uuid(), 'event-kokai-chakai', '公界茶会＠浪江町に行こう！', '<a href="https://nomavalley.jp/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'SPECIAL_HAMADORI', 'ART', 'NAMIE', 'GEO_CHECKIN', 200, 1, 1, false, true, NULL, NULL, 3000, NULL, NULL, '2026-10-18', NULL),
  (gen_random_uuid(), 'event-hamakaido-trail', '浜街道トレイルウォーク＠大熊町へ', '福島民友新聞社が主催する「ふくしま浜街道トレイルウォークinおおくま・とみおか」。大熊町と富岡町を歩き、富岡ワイナリーや夜の森公園をめぐります。17.3kmの縦断コースと、7km台の町内コースがあります。

<a href="https://www.minyu-net.com/news/detail/2026090911445654633" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'SPECIAL_HAMADORI', 'SPORTS', 'WIDE', 'GEO_CHECKIN', 200, 1, 1, false, true, NULL, NULL, 3000, NULL, NULL, '2026-10-25', NULL),
  (gen_random_uuid(), 'event-iwaki-cosplay', 'コスプレイベント＠いわき市へ！', '<a href="https://www.instagram.com/cosstar_official/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'SPECIAL_HAMADORI', 'ART', 'IWAKI', 'GEO_CHECKIN', 200, 1, 1, false, true, NULL, NULL, 3000, NULL, NULL, '2026-10-25', NULL),
  (gen_random_uuid(), 'event-kiwi-harvest', 'キウイ収穫体験＠大熊町に行こう！', '大熊町でキウイ栽培を復活させるため2024年に開園した農園「キウイの国」（株式会社ReFruits）。和歌山大学在学中に創業した原口拓也さんが育てるキウイを、畑で収穫しながら味わえます。

<a href="https://www.kiwinokuni.com/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'SPECIAL_HAMADORI', 'FOOD', 'OKUMA', 'GEO_CHECKIN', 200, 1, 1, false, true, NULL, NULL, 3000, NULL, NULL, '2026-11-14', NULL),
  (gen_random_uuid(), 'event-haccoba-fukudosha-tokyo', 'haccoba×福土舎コラボ＠東京へ！', '南相馬市小高に本社を置くクラフトサケ醸造所 haccoba と、福島の人と食の物語を本にする福土舎のコラボイベント。浜通りの酒と本を入口に、東京で浜通りに出会えます。

<a href="https://haccoba.com/" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'SPECIAL_TOKYO', 'FOOD', 'TOKYO', 'GEO_CHECKIN', 100, 1, 1, false, true, NULL, NULL, 3000, NULL, NULL, '2026-10-23', NULL),
  (gen_random_uuid(), 'event-fukushima-hitono-kagayaki-tokyo', 'HITONO-KAGAYAKI＠六本木へ！', '福島県が六本木ヒルズアリーナで開く「FUKUSHIMA HITONO-KAGAYAKI FES」。浜通りで挑戦する人たちが集まり、地元の食が並ぶマルシェや対話の場が開かれます。入場無料です。

<a href="https://mirai-work.life/lp/roppongievent" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'SPECIAL_TOKYO', 'MIXED', 'TOKYO', 'GEO_CHECKIN', 100, 1, 1, false, true, NULL, NULL, 3000, NULL, NULL, '2026-11-07', '2026-11-08'),
  (gen_random_uuid(), 'event-kitaizumi-surf-festival', '北泉サーフフェス＠南相馬市へ！', '北泉海岸で開かれる「KITAIZUMI SURF FESTIVAL 2026」。ショートボードの男女とU12キッズが波を競い、ビーチクリーンも行われます。10月2日から4日、7時から17時までの開催です。

<a href="https://kitaizumi-surffestival.com" target="_blank" rel="noopener noreferrer">詳細を見る</a>', 'SPECIAL_HAMADORI', 'SPORTS', 'MINAMISOMA', 'GEO_CHECKIN', 200, 1, 1, false, true, NULL, NULL, 3000, NULL, NULL, '2026-10-02', '2026-10-04')
ON CONFLICT (slug) DO NOTHING;

-- ==============================================
-- Part 4: おおくまハッカソンを更新する
-- ==============================================
-- 達成が3件付いているので削除せず、内容だけ揃える。
-- 座標は本番に入っている値をそのまま使い、半径だけ新方針（3000m）に合わせる。

UPDATE public.missions SET
  title = 'おおくまハッカソン最終発表＠大熊町',
  content = '学生団体 ReLU Branch が開く「おおくまハッカソン2026」の最終発表会。全国から集まった学生や若手エンジニアが、大熊町のキウイ農家の現場課題に挑み、8月末の現地開発を経てつくったものを発表します。

<a href="https://note.com/relu_branch/n/n242d31a479d3" target="_blank" rel="noopener noreferrer">詳細を見る</a>',
  quest_category = 'SPECIAL_HAMADORI',
  event_category = 'MIXED',
  region = 'OKUMA',
  points = 200,
  radius_meters = 3000,
  address = '福島県双葉郡大熊町下野上大野１１６−５',
  event_date = '2026-09-15',
  updated_at = now()
WHERE slug = 'event-okuma-hackathon-2026';

-- ==============================================
-- Part 5: 既存クエストの半径を新方針に合わせる
-- ==============================================
-- 削除対象外で座標を持っているものも、スポット1000m / イベント3000m に揃える。

UPDATE public.missions
SET radius_meters = CASE WHEN quest_category = 'PERMANENT' THEN 1000 ELSE 3000 END,
    updated_at = now()
WHERE required_artifact_type = 'GEO_CHECKIN'
  AND radius_meters IS NOT NULL
  AND radius_meters <> CASE WHEN quest_category = 'PERMANENT' THEN 1000 ELSE 3000 END;

