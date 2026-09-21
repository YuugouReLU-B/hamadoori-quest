-- クエスト達成の「順番」と「かかった期間」の集計。
--
-- これらは achievements と private_users だけで出せるので、
-- 行動計測（analytics_*）を入れる前の過去データにもそのまま効く。
--
-- 共通の考え方:
--   * 同じクエストを複数回達成できる設定があるため、「何個目」は
--     ユーザーごとに初回達成だけを並べて数える。
--   * 集団（コホート）は「その期間に登録した人」。
--     登録から1個目までの時間を測りたいので、達成日ではなく登録日で切る。
--   * 期間の代表値は中央値を使う。数人の極端に遅い人に引きずられないようにするため。

-- ユーザーごとの、初回達成だけを時系列に並べたもの。以降の関数が共通で使う
CREATE OR REPLACE VIEW public.user_first_quest_achievements AS
  SELECT
    a.user_id,
    a.mission_id,
    a.created_at AS achieved_at,
    ROW_NUMBER() OVER (
      PARTITION BY a.user_id ORDER BY a.created_at, a.mission_id
    )::INTEGER AS step_index
  FROM (
    SELECT DISTINCT ON (user_id, mission_id)
      user_id, mission_id, created_at
    FROM public.achievements
    WHERE user_id IS NOT NULL
      AND mission_id IS NOT NULL
    ORDER BY user_id, mission_id, created_at
  ) a;

REVOKE ALL ON public.user_first_quest_achievements FROM PUBLIC, anon, authenticated;

-- ============================================
-- 1. 何個目にどのクエストが達成されたか
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_quest_sequence(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  max_step INTEGER DEFAULT 5,
  row_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  step_index INTEGER,
  mission_id UUID,
  mission_title TEXT,
  mission_slug TEXT,
  users BIGINT,
  share_pct NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cohort AS (
    SELECT id AS user_id
    FROM public.private_users
    WHERE created_at >= from_ts
      AND created_at < to_ts
  ),
  steps AS (
    SELECT f.*
    FROM public.user_first_quest_achievements f
    JOIN cohort c ON c.user_id = f.user_id
    WHERE f.step_index <= max_step
  ),
  step_totals AS (
    SELECT step_index, COUNT(*) AS total FROM steps GROUP BY step_index
  )
  SELECT
    s.step_index,
    s.mission_id,
    m.title,
    m.slug,
    COUNT(*) AS users,
    -- その順番を達成した人のうち、このクエストだった割合
    ROUND(100.0 * COUNT(*) / NULLIF(t.total, 0), 1) AS share_pct
  FROM steps s
  JOIN public.missions m ON m.id = s.mission_id
  JOIN step_totals t ON t.step_index = s.step_index
  GROUP BY s.step_index, s.mission_id, m.title, m.slug, t.total
  ORDER BY s.step_index, users DESC
  LIMIT row_limit;
$$;

-- ============================================
-- 2. 次の1個までにどれくらいかかるか
-- ============================================
-- step_index = 0 は「登録から1個目まで」。1 以降は「n個目から n+1 個目まで」。
CREATE OR REPLACE FUNCTION public.analytics_quest_step_timing(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  max_step INTEGER DEFAULT 10
)
RETURNS TABLE (
  step_index INTEGER,
  users BIGINT,
  median_hours NUMERIC,
  p25_hours NUMERIC,
  p75_hours NUMERIC,
  avg_hours NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cohort AS (
    SELECT id AS user_id, created_at AS registered_at
    FROM public.private_users
    WHERE created_at >= from_ts
      AND created_at < to_ts
  ),
  steps AS (
    SELECT f.user_id, f.step_index, f.achieved_at
    FROM public.user_first_quest_achievements f
    JOIN cohort c ON c.user_id = f.user_id
    WHERE f.step_index <= max_step + 1
  ),
  gaps AS (
    -- 登録から1個目まで
    SELECT
      0 AS step_index,
      EXTRACT(EPOCH FROM (s.achieved_at - c.registered_at)) / 3600.0 AS hours
    FROM steps s
    JOIN cohort c ON c.user_id = s.user_id
    WHERE s.step_index = 1
      -- 登録より前の達成は起こらないはずだが、データ移行等で混ざった場合に弾く
      AND s.achieved_at >= c.registered_at

    UNION ALL

    -- n個目から n+1 個目まで
    SELECT
      s.step_index,
      EXTRACT(EPOCH FROM (nxt.achieved_at - s.achieved_at)) / 3600.0 AS hours
    FROM steps s
    JOIN steps nxt
      ON nxt.user_id = s.user_id
     AND nxt.step_index = s.step_index + 1
    WHERE s.step_index <= max_step
  )
  SELECT
    gaps.step_index,
    COUNT(*) AS users,
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hours))::NUMERIC, 1),
    ROUND((PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY hours))::NUMERIC, 1),
    ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY hours))::NUMERIC, 1),
    ROUND(AVG(hours)::NUMERIC, 1)
  FROM gaps
  GROUP BY gaps.step_index
  ORDER BY gaps.step_index;
$$;

-- ============================================
-- 3. 何個まで到達したか（離脱の見えるファネル）
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_quest_progression(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  max_step INTEGER DEFAULT 10
)
RETURNS TABLE (
  step_index INTEGER,
  users_reached BIGINT,
  share_of_cohort_pct NUMERIC,
  continued_from_previous_pct NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cohort AS (
    SELECT id AS user_id
    FROM public.private_users
    WHERE created_at >= from_ts
      AND created_at < to_ts
  ),
  cohort_size AS (SELECT COUNT(*) AS total FROM cohort),
  reached AS (
    SELECT
      f.step_index,
      COUNT(DISTINCT f.user_id) AS users_reached
    FROM public.user_first_quest_achievements f
    JOIN cohort c ON c.user_id = f.user_id
    WHERE f.step_index <= max_step
    GROUP BY f.step_index
  )
  SELECT
    r.step_index,
    r.users_reached,
    ROUND(100.0 * r.users_reached / NULLIF(cs.total, 0), 1),
    -- 1つ前の段階まで来た人のうち、ここまで進んだ割合
    ROUND(
      100.0 * r.users_reached
        / NULLIF(LAG(r.users_reached) OVER (ORDER BY r.step_index), 0),
      1
    )
  FROM reached r
  CROSS JOIN cohort_size cs
  ORDER BY r.step_index;
$$;

-- ============================================
-- 4. どのクエストの次にどのクエストへ進むか
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_quest_transitions(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  from_title TEXT,
  to_title TEXT,
  step_index INTEGER,
  users BIGINT,
  median_hours NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cohort AS (
    SELECT id AS user_id
    FROM public.private_users
    WHERE created_at >= from_ts
      AND created_at < to_ts
  ),
  steps AS (
    SELECT f.*
    FROM public.user_first_quest_achievements f
    JOIN cohort c ON c.user_id = f.user_id
  )
  SELECT
    mf.title,
    mt.title,
    s.step_index,
    COUNT(*) AS users,
    ROUND(
      (PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (nxt.achieved_at - s.achieved_at)) / 3600.0
      ))::NUMERIC,
      1
    )
  FROM steps s
  JOIN steps nxt
    ON nxt.user_id = s.user_id
   AND nxt.step_index = s.step_index + 1
  JOIN public.missions mf ON mf.id = s.mission_id
  JOIN public.missions mt ON mt.id = nxt.mission_id
  GROUP BY mf.title, mt.title, s.step_index
  ORDER BY users DESC
  LIMIT row_limit;
$$;

-- ============================================
-- 5. ユーザーごとの達成の流れ
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_user_quest_journey(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 60
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  registered_at TIMESTAMPTZ,
  quest_count BIGINT,
  first_achieved_at TIMESTAMPTZ,
  last_achieved_at TIMESTAMPTZ,
  hours_to_first NUMERIC,
  days_span NUMERIC,
  quest_titles TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cohort AS (
    SELECT id AS user_id, created_at AS registered_at
    FROM public.private_users
    WHERE created_at >= from_ts
      AND created_at < to_ts
  ),
  steps AS (
    SELECT f.*, m.title
    FROM public.user_first_quest_achievements f
    JOIN cohort c ON c.user_id = f.user_id
    JOIN public.missions m ON m.id = f.mission_id
  )
  SELECT
    c.user_id,
    up.name,
    c.registered_at,
    COUNT(s.mission_id) AS quest_count,
    MIN(s.achieved_at),
    MAX(s.achieved_at),
    ROUND(
      (EXTRACT(EPOCH FROM (MIN(s.achieved_at) - c.registered_at)) / 3600.0)::NUMERIC,
      1
    ),
    ROUND(
      (EXTRACT(EPOCH FROM (MAX(s.achieved_at) - MIN(s.achieved_at))) / 86400.0)::NUMERIC,
      1
    ),
    -- 達成した順に並べたクエスト名。そのまま「流れ」として読める
    STRING_AGG(s.title, ' → ' ORDER BY s.step_index)
  FROM cohort c
  LEFT JOIN steps s ON s.user_id = c.user_id
  LEFT JOIN public.public_user_profiles up ON up.id = c.user_id
  GROUP BY c.user_id, up.name, c.registered_at
  ORDER BY quest_count DESC, c.registered_at DESC
  LIMIT row_limit;
$$;

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.analytics_quest_sequence(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER)',
    'public.analytics_quest_step_timing(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)',
    'public.analytics_quest_progression(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)',
    'public.analytics_quest_transitions(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)',
    'public.analytics_user_quest_journey(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END;
$$;
