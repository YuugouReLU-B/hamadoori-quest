-- 古いいわきのコスプレクエスト（event-iwaki-cosplay）を削除する（依頼者の指定）。
--
-- 9/27の一括登録で会場・地図が無いまま非公開で入れ、座標が入らずに残っていた。
-- 10/9に管理画面で「平コスハロウィン@いわきに参加しよう！」（quest-f123972b、
-- 会場・日程付き）が作られて公開されており、管理画面で紛らわしいため消す。
--
-- 達成記録が無い（achievements は ON DELETE NO ACTION）、非公開のままのときだけ消す。
-- カテゴリの紐付けなどは ON DELETE CASCADE で一緒に消える。
DELETE FROM public.missions m
WHERE m.slug = 'event-iwaki-cosplay'
  AND m.is_hidden = true
  AND NOT EXISTS (SELECT 1 FROM public.achievements a WHERE a.mission_id = m.id);
