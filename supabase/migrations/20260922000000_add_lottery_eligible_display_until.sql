-- 応募終了日を保持する。値は /admin/lottery から手入力するので、ここでは投入しない。
ALTER TABLE public.lottery_settings
  ADD COLUMN eligible_display_until DATE;

COMMENT ON COLUMN public.lottery_settings.eligible_display_until IS
  '応募受付の最終日（この日を含み、日本時間の翌日0時に終了）。NULLなら終了しない。';

-- 開始日は「トークンとボタンの表示開始日」から「応募フォームが開く日」へ意味を変える。
COMMENT ON COLUMN public.lottery_settings.eligible_display_from IS
  '応募フォームが開く日（日本時間の0時から）。NULLなら日付条件なし。ポイント条件と併用する。';
