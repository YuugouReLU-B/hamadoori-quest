-- 退会時の削除範囲をプライバシーポリシーに合わせて広げる
--
-- プライバシーポリシー 7-3「ユーザーが退会した場合、当該ユーザーのアカウント情報
-- および達成記録を削除します」に対し、これまでの delete_user_account は
-- 次の情報を残していた。
--
-- 1. アクセス解析（analytics_sessions / analytics_events）
--    user_id は auth.users への FK が ON DELETE SET NULL なので NULL になるだけで、
--    IP アドレス・そこから推定した地域・UA・訪問者ID・閲覧パスが行ごと残っていた。
--    → 退会者の user_id が付いた行を削除する。
--      events は sessions を ON DELETE CASCADE で参照しているが、ログイン前の
--      イベントなど sessions 側と user_id の有無が一致しない行もあるので、
--      events を先に明示的に消してから sessions を消す。
--
-- 2. 紹介した側の成果物（mission_artifacts, artifact_type = 'REFERRAL'）
--    text_content に被紹介者（＝退会者）の auth.users.email を入れている
--    （20260926030000_add_grant_referral_reward_function.sql）。
--    LINE ログインの合成アドレスには LINE のユーザーIDが含まれ、紹介者本人が
--    RLS 経由で読める。紹介した側の達成記録自体は紹介者のものなので残し、
--    text_content だけを個人を特定しない固定文言に置き換える。
--    ensure_artifact_data 制約で REFERRAL の text_content は NOT NULL 必須なので
--    NULL にはしない。
--    email は auth.users を消したあとでは引けないので、この関数の中で
--    （auth.users 削除より前に）取得しておく。
--
-- 変えないもの:
-- - lottery_tokens は意図どおり user_id が NULL になって残る（トークン文字列だけで
--   個人に結び付かず、応募フォームの回答との照合に使うため）。
-- - 権限（本人または service_role のみ実行可）とそのチェックは従来どおり。

CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id UUID;
  target_email TEXT;
BEGIN
  -- 現在のユーザーIDを取得
  current_user_id := auth.uid();

  -- 認証チェック：自分のアカウントのみ削除可能。
  -- ただし service_role（サーバー側の管理クライアント）からの呼び出しは許可する。
  -- 管理者による代理削除（/admin/users）と開発用のユーザー削除ツール（/dev/users）が
  -- 削除順序を二重管理しないために必要。
  -- SECURITY DEFINER 内では current_user が関数所有者になってしまうため、
  -- 呼び出し元のロールは JWT クレームから判定する
  IF current_user_id IS NULL
     AND coalesce(
           current_setting('request.jwt.claims', true)::json ->> 'role',
           ''
         ) <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  IF current_user_id IS NOT NULL AND current_user_id != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only delete your own account';
  END IF;

  -- 紹介した側の成果物を匿名化するために、auth.users を消す前にメールを引いておく
  SELECT lower(email) INTO target_email
  FROM auth.users
  WHERE id = target_user_id;

  -- 外部キー制約を考慮した削除順序
  -- 1. mission_artifacts テーブル（user_id参照）
  DELETE FROM mission_artifacts WHERE user_id = target_user_id;

  -- 1-2. 紹介した側の REFERRAL 成果物に残る退会者のメールを置き換える
  IF target_email IS NOT NULL AND target_email <> '' THEN
    UPDATE mission_artifacts
    SET text_content = '退会済みユーザー',
        updated_at = NOW()
    WHERE artifact_type = 'REFERRAL'
      AND lower(text_content) = target_email;
  END IF;

  -- 2. poster_activities テーブル（user_id参照）
  DELETE FROM poster_activities WHERE user_id = target_user_id;

  -- 3. poster_board_status_history テーブル（user_id参照）
  DELETE FROM poster_board_status_history WHERE user_id = target_user_id;

  -- 4. user_badges テーブル（user_id参照）
  DELETE FROM user_badges WHERE user_id = target_user_id;

  -- 5. achievements テーブル（user_id参照）
  DELETE FROM achievements WHERE user_id = target_user_id;

  -- 6. xp_transactions テーブル（user_id参照）
  DELETE FROM xp_transactions WHERE user_id = target_user_id;

  -- 7. user_levels テーブル（user_id参照）
  DELETE FROM user_levels WHERE user_id = target_user_id;

  -- 8. user_referral テーブル（user_id参照）
  DELETE FROM user_referral WHERE user_id = target_user_id;

  -- 9. user_activities テーブル（user_id参照）
  DELETE FROM user_activities WHERE user_id = target_user_id;

  -- 10. アクセス解析（events → sessions の順）
  DELETE FROM analytics_events WHERE user_id = target_user_id;
  DELETE FROM analytics_sessions WHERE user_id = target_user_id;

  -- 11. public_user_profiles テーブル（id参照）
  DELETE FROM public_user_profiles WHERE id = target_user_id;

  -- 12. private_users テーブル（id参照、メインテーブル）
  DELETE FROM private_users WHERE id = target_user_id;

EXCEPTION
  WHEN OTHERS THEN
    -- エラーログ出力
    RAISE LOG 'Error deleting user account %: %', target_user_id, SQLERRM;
    -- エラーを再スロー（ロールバックを発生させる）
    RAISE;
END;
$$;

-- 権限は従来どおり（本人の退会と service_role のみ）
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO service_role;
