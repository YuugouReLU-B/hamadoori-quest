-- ============================================
-- ポイントの二重付与を防ぐ
--
-- 1. 達成回数の上限をDBで守る
--    アプリは「件数を数えてから INSERT」していたため、連打や複数タブで
--    同じクエストの達成が同時に届くと、両方が上限チェックを通って二重に記録されていた。
--    INSERT の直前に (user_id, mission_id) 単位のロックを取ってから数え直し、
--    上限を超えるなら拒否する。ロックはトランザクション終了で外れる。
--
-- 2. 累計ポイントの加算を1文で行う
--    アプリは「累計を読む → 足す → 書き戻す」だったため、同時に付与されると
--    後から書いた方が先の加算を上書きしていた。
-- ============================================

CREATE OR REPLACE FUNCTION public.enforce_achievement_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limit_count INTEGER;
  existing_count INTEGER;
BEGIN
  IF NEW.user_id IS NULL OR NEW.mission_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT m.max_achievement_count INTO limit_count
  FROM public.missions m
  WHERE m.id = NEW.mission_id;

  -- 上限なし（NULL）のクエストは数えない
  IF limit_count IS NULL THEN
    RETURN NEW;
  END IF;

  -- 同じユーザー×同じクエストの INSERT を直列にする。
  -- 後から来た方は先の INSERT が確定するまで待ち、確定後の件数で判定する
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.user_id::TEXT || ':' || NEW.mission_id::TEXT, 0)
  );

  SELECT COUNT(*) INTO existing_count
  FROM public.achievements a
  WHERE a.user_id = NEW.user_id
    AND a.mission_id = NEW.mission_id;

  IF existing_count >= limit_count THEN
    RAISE EXCEPTION 'achievement limit reached'
      USING ERRCODE = 'unique_violation',
            DETAIL = 'このクエストの達成回数の上限に達しています';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_achievement_limit ON public.achievements;
CREATE TRIGGER enforce_achievement_limit
  BEFORE INSERT ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_achievement_limit();

REVOKE ALL ON FUNCTION public.enforce_achievement_limit() FROM PUBLIC, anon, authenticated;

-- 累計ポイントへ加算し、加算後の行を返す。行が無ければ作る
CREATE OR REPLACE FUNCTION public.increment_user_xp(
  target_user_id UUID,
  target_season_id UUID,
  amount INTEGER
)
RETURNS SETOF public.user_levels
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.user_levels (user_id, season_id, xp, updated_at)
  VALUES (target_user_id, target_season_id, amount, NOW())
  ON CONFLICT (user_id, season_id)
  DO UPDATE SET
    xp = public.user_levels.xp + EXCLUDED.xp,
    updated_at = NOW()
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.increment_user_xp(UUID, UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_xp(UUID, UUID, INTEGER)
  TO service_role;
