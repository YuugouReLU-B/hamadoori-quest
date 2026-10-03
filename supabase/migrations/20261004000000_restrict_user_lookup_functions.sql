-- auth.users を引くユーザー検索関数を service_role 専用にする。
--
-- 3関数とも作成時に「service_role ONLY」の意図で GRANT していたが、
-- Postgres の既定（PUBLIC への EXECUTE）を REVOKE していなかったため、
-- anon / authenticated からも PostgREST 経由で実行できる状態になっていた。
-- 呼び出し元（LINEログイン・パスワードリセット・運用スクリプト）は
-- すべて createAdminClient（service_role）なので、アプリの動作は変わらない。
REVOKE ALL ON FUNCTION public.get_user_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_users_by_emails(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_by_line_id(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_users_by_emails(text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_by_line_id(text) TO service_role;
