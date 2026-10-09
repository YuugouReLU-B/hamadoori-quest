-- 依頼者から届いたイベント一覧（2026-10-09）と本番の登録内容を突き合わせ、
-- 食い違っていたものを一覧の内容にそろえる（依頼者の指定）。
--
-- ミッションは管理画面で編集するのが正なので、いずれも管理画面ですでに直されている
-- 場合（値が以前のままでない場合）は上書きしない。

-- かわうちワイナリー収穫祭: 10/10・11の2日間開催なのに終了日が10/10で、
-- 11日にチェックインできなかった。種別も一覧では特設（浜通り）。
UPDATE public.missions SET
  event_end_date = '2026-10-11',
  quest_category = 'SPECIAL_HAMADORI',
  updated_at = now()
WHERE slug = 'event-kawauchi-winery-harvest'
  AND event_end_date = '2026-10-10'
  AND quest_category = 'PERMANENT';

-- 食と藝術プロジェクト（富岡町）: 本文が「詳細を見る」のリンクだけだった。
-- 一覧の説明文と開催概要を入れ、タグを付ける。
UPDATE public.missions SET
  content = E'scene # 0「トミオカさんへの手紙」\n浜通り食と藝術プロジェクト2026\n富岡町をリサーチしてきたアートユニット「ムスヒラ」(料理人・三澤真也/美術家・樋口裕一/詩人・野宮有姫)が、それぞれの手法でトミオカさんへの手紙をしたためました。\n\n<a href="https://www.instagram.com/p/DdGceWHiQCt/?stkn=MW4waHI2a2JuaHc2NA==" target="_blank" rel="noopener noreferrer">詳細を見る</a>',
  supplement = E'2026年10月10日(土)\nJR富岡駅前ひろば集合\n受付時間: 16:30〜17:30（到着した人から順次出発／所要時間50〜80分程度）\n料金: 3,000円（お弁当・第二部ドリンクチケット付）\n定員: 10名（要予約）',
  tag1 = 'アート',
  tag2 = '要予約',
  updated_at = now()
WHERE slug = 'event-hamadori-food-art'
  AND content = '<a href="https://www.instagram.com/p/DdGceWHiQCt/?stkn=MW4waHI2a2JuaHc2NA==" target="_blank" rel="noopener noreferrer">詳細を見る</a>'
  AND supplement IS NULL;

-- 茶室「空舟」: 一覧では日付のない常設スポット（100pt）。開催日10/18が入って
-- いたため、10/19以降は一覧から消えてチェックインもできなくなるところだった。
UPDATE public.missions SET
  event_date = NULL,
  event_end_date = NULL,
  event_category = 'SPOT',
  points = 100,
  updated_at = now()
WHERE slug = 'event-kokai-chakai'
  AND event_date = '2026-10-18'
  AND points = 200;

-- キウイ: 一般的な農園紹介から、11/1の「キウイ初収穫感謝祭」の内容に差し替える。
-- 地図はキウイの国（37.3987077, 140.9665481）で座標は今のままと同じ。
-- 報告会の会場CREVAおおくまも半径3,000mに入るので座標・半径は変えない。
UPDATE public.missions SET
  title = 'キウイ初収穫感謝祭＠大熊町に行こう！',
  content = E'■ キウイ初収穫感謝祭\n日時：11月1日（日）\n・11:00〜12:00　初収穫報告会\n　会場：CREVAおおくま\n・13:00〜16:00　一般開放・収穫体験\n　会場：キウイの国（大熊町）\n13:00〜16:00には、直売所で初収穫キウイの予約注文も受け付けます。\n発送（送料別）または直売所でのお受け取りをお選びいただけます。\n数に限りがあるため、予定数に達し次第、受付を終了いたします。\n\n<a href="https://forms.gle/uWuQe9HMPWXcx6fA8" target="_blank" rel="noopener noreferrer">詳細を見る</a>',
  google_map_url = 'https://maps.app.goo.gl/q8oqZS6F1UnkRSaA7',
  updated_at = now()
WHERE slug = 'event-kiwi-harvest'
  AND title = 'キウイ収穫体験＠大熊町に行こう！';

-- 浜街道トレイル・月の下アートセンター（10/22）: 一覧では特設（浜通り）。
UPDATE public.missions SET
  quest_category = 'SPECIAL_HAMADORI',
  updated_at = now()
WHERE slug IN ('event-hamakaido-trail', 'quest-1de63405-copy-1791548985726')
  AND quest_category = 'PERMANENT';

-- 夜の森ピクニック: 一覧では複合イベント。
UPDATE public.missions SET
  event_category = 'MIXED',
  updated_at = now()
WHERE slug = 'quest-3b73af36'
  AND event_category = 'FOOD';
