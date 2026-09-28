-- クエストにタグを入れる。
--
-- カードには地域チップとカテゴリのアイコンが既に出ているので、タグはそこと
-- 重複しない「何ができるか」「参加条件」に絞る。3つ埋めるとカード幅から
-- 必ず溢れるため、いったん2つまでにしている。
--
-- 説明文が入っていない3件（食と藝術プロジェクト、公界茶会、いわきコスプレ）は
-- 内容が判断できないので触らない。おおくまハッカソンは既にタグが入っている。

UPDATE public.missions AS m
SET tag1 = v.tag1, tag2 = v.tag2
FROM (VALUES
  -- 常設スポット
  ('visit-turtle-cycle',                    '自転車',       '買える'),
  ('visit-kawauchi-winery',                 'ワイン',       '要予約'),
  ('visit-noma-horse-village',              '馬',           '要予約'),
  ('visit-fukudosha',                       '本',           '要予約'),
  ('visit-zuzu-warehouse',                  '展示',         '買える'),
  ('visit-tokichiro-gama',                  '大堀相馬焼',   '見学'),
  ('visit-hotel-futabatei',                 '泊まれる',     '食事処'),
  -- 浜通りのイベント
  ('event-kawauchi-hillclimb',              '自転車',       '要エントリー'),
  -- 同じ北泉海岸の大会が2つあるので、性格の違いで書き分ける
  ('event-kitaizumi-surfing',               'サーフィン',   '全国大会'),
  ('event-kitaizumi-surf-festival',         'サーフィン',   'ビーチクリーン'),
  ('event-hamafes',                         '日本酒',       '入場無料'),
  ('event-kawauchi-winery-harvest',         '収穫体験',     'ワイン'),
  ('event-hamakaido-trail',                 'ウォーキング', '要エントリー'),
  ('event-kiwi-harvest',                    '収穫体験',     'キウイ'),
  -- 東京のイベント
  ('event-fukushima-hitono-kagayaki-tokyo', 'マルシェ',     '入場無料'),
  ('event-haccoba-fukudosha-tokyo',         'クラフトサケ', '本')
) AS v(slug, tag1, tag2)
WHERE m.slug = v.slug;
