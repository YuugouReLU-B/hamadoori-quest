-- 紹介の双方付与を1トランザクションで行う RPC
--
-- 紹介URL（?ref=<code>）から登録が完了したときに、紹介した側（REFERRAL）と
-- 紹介された側（REFERRED）の両方に achievement / mission_artifact /
-- xp_transaction / XP加算をまとめて作る。「両方入るか、両方入らないか」に
-- したいので、アプリ側で4テーブルを順に叩くのをやめてここに寄せる。
--
-- 付与内容は既存の grantMissionCompletionXp と同じ計算にしてある：
-- xp_amount は missions.points をそのまま（倍率なし。
-- level-calculator.ts の calculateMissionXp が points を返すだけ）、
-- description は 'クエスト「{title}」達成による経験値獲得'。
--
-- user_levels.level には触れない。level は廃止予定で、かつ
-- INTEGER NOT NULL DEFAULT 1（20250605000000）なので省略しても insert が通る。

CREATE OR REPLACE FUNCTION public.grant_referral_reward(
  p_referrer_user_id     uuid,
  p_referred_user_id     uuid,
  p_referrer_mission_id  uuid,
  p_referred_mission_id  uuid,
  p_season_id            uuid,
  p_referred_email       text
)
RETURNS TABLE (referrer_achievement_id uuid, referred_achievement_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email                  text := lower(p_referred_email);
  v_referrer_achievement_id uuid;
  v_referred_achievement_id uuid;
  v_referrer_points        integer;
  v_referred_points        integer;
  v_referrer_title         text;
  v_referred_title         text;
BEGIN
  -- g1: シーズンが無い状態で付与すると集計から漏れるので失敗させる
  IF p_season_id IS NULL THEN
    RAISE EXCEPTION 'grant_referral_reward: p_season_id must not be null';
  END IF;

  -- g2: 自己紹介は成立しない
  IF p_referrer_user_id = p_referred_user_id THEN
    RAISE EXCEPTION 'grant_referral_reward: referrer and referred must differ';
  END IF;

  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'grant_referral_reward: p_referred_email must not be empty';
  END IF;

  -- g3a: 被紹介者が同じシーズンで既に達成済みなら何もしない。
  -- 紹介した側の達成有無は**一切見ない**。紹介者は同一シーズン内で
  -- 何人紹介してもその都度 achievement を作る（max_achievement_count=NULL と整合）。
  IF EXISTS (
    SELECT 1 FROM achievements
    WHERE user_id = p_referred_user_id
      AND mission_id = p_referred_mission_id
      AND season_id = p_season_id
  ) THEN
    RETURN;
  END IF;

  -- g3b: 同じメールアドレスで既に被紹介の成果物があるなら何もしない。
  -- 呼び出し側の isEmailAlreadyUsedInReferral は artifact_type='REFERRAL' を
  -- 見ており、こちらは 'REFERRED' を見る。別の行を見る二段構えなので
  -- 重複しているように見えて意図的。
  IF EXISTS (
    SELECT 1 FROM mission_artifacts
    WHERE artifact_type = 'REFERRED'
      AND text_content = v_email
  ) THEN
    RETURN;
  END IF;

  SELECT points, title INTO v_referrer_points, v_referrer_title
  FROM missions WHERE id = p_referrer_mission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'grant_referral_reward: referrer mission % not found', p_referrer_mission_id;
  END IF;

  SELECT points, title INTO v_referred_points, v_referred_title
  FROM missions WHERE id = p_referred_mission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'grant_referral_reward: referred mission % not found', p_referred_mission_id;
  END IF;

  -- 1) 達成
  INSERT INTO achievements (user_id, mission_id, season_id)
  VALUES (p_referrer_user_id, p_referrer_mission_id, p_season_id)
  RETURNING id INTO v_referrer_achievement_id;

  INSERT INTO achievements (user_id, mission_id, season_id)
  VALUES (p_referred_user_id, p_referred_mission_id, p_season_id)
  RETURNING id INTO v_referred_achievement_id;

  -- 2) 成果物。どちらも text_content に被紹介者のメールを入れる。
  -- UNIQUE(achievement_id)（20260128074210）は achievement を新規作成しているので衝突しない。
  INSERT INTO mission_artifacts (achievement_id, user_id, artifact_type, text_content)
  VALUES
    (v_referrer_achievement_id, p_referrer_user_id, 'REFERRAL',  v_email),
    (v_referred_achievement_id, p_referred_user_id, 'REFERRED', v_email);

  -- 3) XPの取引記録
  INSERT INTO xp_transactions (user_id, season_id, xp_amount, source_type, source_id, description)
  VALUES
    (p_referrer_user_id, p_season_id, v_referrer_points, 'MISSION_COMPLETION', v_referrer_achievement_id,
     'クエスト「' || v_referrer_title || '」達成による経験値獲得'),
    (p_referred_user_id, p_season_id, v_referred_points, 'MISSION_COMPLETION', v_referred_achievement_id,
     'クエスト「' || v_referred_title || '」達成による経験値獲得');

  -- 4) 累計XPの加算。level には触れない
  INSERT INTO user_levels (user_id, season_id, xp, updated_at)
  VALUES (p_referrer_user_id, p_season_id, v_referrer_points, now())
  ON CONFLICT (user_id, season_id)
  DO UPDATE SET xp = user_levels.xp + EXCLUDED.xp, updated_at = now();

  INSERT INTO user_levels (user_id, season_id, xp, updated_at)
  VALUES (p_referred_user_id, p_season_id, v_referred_points, now())
  ON CONFLICT (user_id, season_id)
  DO UPDATE SET xp = user_levels.xp + EXCLUDED.xp, updated_at = now();

  RETURN QUERY SELECT v_referrer_achievement_id, v_referred_achievement_id;
END;
$$;

COMMENT ON FUNCTION public.grant_referral_reward(uuid, uuid, uuid, uuid, uuid, text) IS
  '紹介の双方付与を1トランザクションで行う。0行を返した場合は既に付与済み（g3a/g3b）。';

-- 呼び出せるのはサーバー側（service_role）だけ。
-- 引数だけで任意ユーザーにポイントを付けられる関数なので、
-- anon / authenticated には絶対に渡さない。
REVOKE ALL ON FUNCTION public.grant_referral_reward(uuid, uuid, uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_referral_reward(uuid, uuid, uuid, uuid, uuid, text)
  TO service_role;
