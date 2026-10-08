-- ============================================
-- 管理画面からのユーザーデータ削除（お問い合わせ経由の削除依頼に対応する）
--
-- 1. admin_deletion_logs: 誰が・いつ・どのユーザーIDを消したかの記録。
--    個人情報（ニックネーム等）は残さず、削除前後の件数だけを残す。
-- 2. admin_user_data_counts: ユーザーに紐づくデータの件数を数える。
--    削除前の確認と、削除後に0件になったことの確認の両方に使う。
--    user_id 列を持つ public のテーブルは自動で全部数えるので、
--    今後テーブルが増えても数え漏れない。
-- ============================================

CREATE TABLE public.admin_deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  deleted_user_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  counts_before JSONB NOT NULL,
  counts_after JSONB
);

COMMENT ON TABLE public.admin_deletion_logs IS
  '管理画面からユーザーデータを削除した記録。個人情報は持たず、IDと件数だけを残す。';

CREATE INDEX admin_deletion_logs_deleted_at_idx
  ON public.admin_deletion_logs (deleted_at DESC);

ALTER TABLE public.admin_deletion_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_deletion_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_user_data_counts(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB := '{}'::JSONB;
  rec RECORD;
  n BIGINT;
  target_email TEXT;
BEGIN
  -- user_id 列を持つ public のテーブルを全部数える
  FOR rec IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
     AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.column_name = 'user_id'
    ORDER BY c.table_name
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE user_id::text = $1::text',
      rec.table_name
    ) INTO n USING target_user_id;
    result := result || jsonb_build_object(rec.table_name, n);
  END LOOP;

  -- id 列がユーザーIDそのものになっているテーブル
  SELECT count(*) INTO n FROM public.public_user_profiles WHERE id = target_user_id;
  result := result || jsonb_build_object('public_user_profiles', n);

  SELECT count(*) INTO n FROM public.private_users WHERE id = target_user_id;
  result := result || jsonb_build_object('private_users', n);

  SELECT count(*) INTO n FROM auth.users WHERE id = target_user_id;
  result := result || jsonb_build_object('auth.users', n);

  -- 紹介した側の成果物に残る、このユーザーの識別用アドレス
  SELECT email INTO target_email FROM auth.users WHERE id = target_user_id;
  IF target_email IS NULL THEN
    n := 0;
  ELSE
    SELECT count(*) INTO n
    FROM public.mission_artifacts
    WHERE text_content = target_email
      AND user_id IS DISTINCT FROM target_user_id;
  END IF;
  result := result || jsonb_build_object('referrer_artifacts_with_identifier', n);

  -- Storage 上の本人のファイル（ユーザーIDのフォルダに置かれる）
  SELECT count(*) INTO n
  FROM storage.objects o
  WHERE o.bucket_id IN ('avatars', 'mission_artifact_files')
    AND (storage.foldername(o.name))[1] = target_user_id::text;
  result := result || jsonb_build_object('storage.objects', n);

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_data_counts(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_data_counts(UUID) TO service_role;
