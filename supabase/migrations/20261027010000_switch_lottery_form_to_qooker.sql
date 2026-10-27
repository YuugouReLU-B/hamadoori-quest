-- 抽選の応募フォームを Googleフォームから Qooker のフォームへ切り替える（依頼者の指定）。
-- Qooker はURLでの事前入力が無いため、トークンの自動入力（{token} の置き換え）は
-- アプリ側からも外した。トークンは利用者がフォームに貼り付ける。
UPDATE public.lottery_settings
SET form_url = 'https://form.qooker.jp/Q/auto/ja/hamadooriquest/form/', updated_at = now()
WHERE id = 'default';
