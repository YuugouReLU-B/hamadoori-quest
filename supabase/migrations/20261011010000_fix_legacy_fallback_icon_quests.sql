-- 派生元（チームみらい）の的のアイコン /img/mission_fallback.svg が画面に出ていた件の対応。
--
-- イベント種別（event_category）が空のクエストはアイコンが代替画像になり、その代替画像が
-- 派生元のものだった（標葉祭りで発覚）。代替画像はファイルごと消した。
--
-- 「SNS登録以外はイベント種別を空にできない」は管理画面のフォームとCSV取り込みの
-- 共通スキーマ（mission-schema.ts）で縛る。DBの CHECK 制約にはしていない。新規環境では
-- 古いマイグレーションが入れた派生元のクエストや seed.sql、統合テストが作るクエストが
-- 種別なしで入るため、制約を足すとそれらがすべて壊れる。

-- 標葉祭り: イベント種別が空だった。複合イベントにする（依頼者の指定）
UPDATE public.missions SET event_category = 'MIXED', updated_at = now()
WHERE slug = 'quest-88f1b95c' AND event_category IS NULL;

-- 紹介されて登録した側の自動達成クエスト: アイコンが派生元の的の画像だった。
-- 対になる紹介クエストと同じ画像にする
UPDATE public.missions
SET icon_url = '/img/mission-icons/refer-a-friend.png', updated_at = now()
WHERE slug = 'referred-signup' AND icon_url = '/img/mission_fallback.svg';
