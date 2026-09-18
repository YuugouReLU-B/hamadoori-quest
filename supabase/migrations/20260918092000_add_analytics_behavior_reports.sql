-- 行動の深掘り用の集計関数。
--   * 同じ人が何回来ているか（再訪の分布と、訪問者ごとの履歴）
--   * いつ来ているか（曜日 × 時間帯）
--   * どのボタンが押されているか
--   * ページ内のどの高さ・どのセクションに何秒いたか
--
-- 20260918091000 と同じ方針で、ボットと /admin・/dev は除外し、service_role のみ実行可。

-- ============================================
-- 1. 再訪の分布（何回来た人が何人いるか）
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_visit_frequency(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ
)
RETURNS TABLE (
  visit_count INTEGER,
  visitors BIGINT,
  logged_in_visitors BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH per_visitor AS (
    SELECT
      s.visitor_id,
      COUNT(*)::INTEGER AS visits,
      -- 期間中に一度でもログインしていたか
      BOOL_OR(s.user_id IS NOT NULL) AS has_user
    FROM public.analytics_sessions s
    WHERE s.is_bot = FALSE
      AND s.started_at >= from_ts
      AND s.started_at < to_ts
    GROUP BY s.visitor_id
  )
  SELECT
    -- 10回以上はまとめる。裾が長くなって読みにくくなるのを避ける
    LEAST(visits, 10) AS visit_count,
    COUNT(*) AS visitors,
    COUNT(*) FILTER (WHERE has_user) AS logged_in_visitors
  FROM per_visitor
  GROUP BY LEAST(visits, 10)
  ORDER BY visit_count;
$$;

-- ============================================
-- 2. 訪問者ごとの活動（誰が・何回・いつ・どこから・どこで）
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_visitor_activity(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  visitor_id UUID,
  user_id UUID,
  user_name TEXT,
  visits BIGINT,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  page_views BIGINT,
  engaged_seconds NUMERIC,
  achievements BIGINT,
  channels TEXT,
  locations TEXT,
  devices TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH target_sessions AS (
    SELECT *
    FROM public.analytics_sessions s
    WHERE s.is_bot = FALSE
      AND s.started_at >= from_ts
      AND s.started_at < to_ts
  ),
  -- ページ表示ごとの最終エンゲージメント値。訪問者単位で足し上げる前に1件へ畳む
  page_engagement AS (
    SELECT
      e.session_id,
      e.page_view_id,
      MAX(e.engaged_ms) AS engaged_ms
    FROM public.analytics_events e
    JOIN target_sessions ts ON ts.id = e.session_id
    WHERE e.event_name = 'page_engagement'
      AND e.page_view_id IS NOT NULL
      AND NOT public.is_internal_analytics_path(e.page_path)
    GROUP BY e.session_id, e.page_view_id
  ),
  page_views AS (
    SELECT e.session_id, COUNT(*) AS views
    FROM public.analytics_events e
    JOIN target_sessions ts ON ts.id = e.session_id
    WHERE e.event_name = 'page_view'
      AND NOT public.is_internal_analytics_path(e.page_path)
    GROUP BY e.session_id
  )
  SELECT
    ts.visitor_id,
    -- 期間中にログインしていれば、その user_id を代表として出す
    (ARRAY_AGG(ts.user_id) FILTER (WHERE ts.user_id IS NOT NULL))[1] AS user_id,
    MAX(up.name) AS user_name,
    COUNT(DISTINCT ts.id) AS visits,
    MIN(ts.started_at) AS first_seen_at,
    MAX(ts.last_seen_at) AS last_seen_at,
    COALESCE(SUM(pv.views), 0) AS page_views,
    ROUND(COALESCE(SUM(pe.engaged_ms), 0) / 1000.0, 1) AS engaged_seconds,
    (
      SELECT COUNT(*)
      FROM public.achievements a
      WHERE a.user_id = (ARRAY_AGG(ts.user_id) FILTER (WHERE ts.user_id IS NOT NULL))[1]
        AND a.created_at >= from_ts
        AND a.created_at < to_ts
    ) AS achievements,
    STRING_AGG(DISTINCT COALESCE(ts.channel, 'direct'), ', ') AS channels,
    STRING_AGG(DISTINCT NULLIF(TRIM(COALESCE(ts.ip_region, '') || ' ' || COALESCE(ts.ip_city, '')), ''), ', ') AS locations,
    STRING_AGG(DISTINCT NULLIF(TRIM(COALESCE(ts.device_type, '') || ' ' || COALESCE(ts.browser, '')), ''), ', ') AS devices
  FROM target_sessions ts
  -- 表示名は public_user_profiles 側にある
  LEFT JOIN public.public_user_profiles up ON up.id = ts.user_id
  LEFT JOIN page_views pv ON pv.session_id = ts.id
  LEFT JOIN LATERAL (
    SELECT SUM(engaged_ms) AS engaged_ms
    FROM page_engagement
    WHERE page_engagement.session_id = ts.id
  ) pe ON TRUE
  GROUP BY ts.visitor_id
  ORDER BY visits DESC, last_seen_at DESC
  LIMIT row_limit;
$$;

-- ============================================
-- 3. いつ来ているか（曜日 × 時間帯・日本時間）
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_by_hour(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ
)
RETURNS TABLE (
  day_of_week INTEGER,
  hour_of_day INTEGER,
  sessions BIGINT,
  visitors BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- 0=日曜。日本時間で見る（利用者はほぼ国内）
    EXTRACT(DOW FROM s.started_at AT TIME ZONE 'Asia/Tokyo')::INTEGER,
    EXTRACT(HOUR FROM s.started_at AT TIME ZONE 'Asia/Tokyo')::INTEGER,
    COUNT(*) AS sessions,
    COUNT(DISTINCT s.visitor_id) AS visitors
  FROM public.analytics_sessions s
  WHERE s.is_bot = FALSE
    AND s.started_at >= from_ts
    AND s.started_at < to_ts
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

-- ============================================
-- 4. どのボタン・リンクが押されたか
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_click_targets(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  page_path TEXT,
  label TEXT,
  element_path TEXT,
  href TEXT,
  is_outbound BOOLEAN,
  clicks BIGINT,
  visitors BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.page_path,
    NULLIF(e.props->>'label', '') AS label,
    NULLIF(e.props->>'elementPath', '') AS element_path,
    NULLIF(e.props->>'href', '') AS href,
    e.event_name = 'outbound_click' AS is_outbound,
    COUNT(*) AS clicks,
    COUNT(DISTINCT e.visitor_id) AS visitors
  FROM public.analytics_events e
  JOIN public.analytics_sessions s ON s.id = e.session_id
  WHERE e.event_name IN ('click', 'outbound_click')
    AND s.is_bot = FALSE
    AND e.received_at >= from_ts
    AND e.received_at < to_ts
    AND NOT public.is_internal_analytics_path(e.page_path)
  GROUP BY 1, 2, 3, 4, 5
  ORDER BY clicks DESC
  LIMIT row_limit;
$$;

-- ============================================
-- 5. ページ内のどの高さに何秒いたか
-- ============================================
-- region_dwell.bands はページを高さで10等分した帯ごとの表示時間。
-- 帯の番号は相対値なので、ページをまたいで平均しても意味が保たれる。
CREATE OR REPLACE FUNCTION public.analytics_page_bands(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  target_path TEXT DEFAULT NULL
)
RETURNS TABLE (
  band_index INTEGER,
  page_views BIGINT,
  avg_seconds NUMERIC,
  total_seconds NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest_engagement AS (
    -- 1ページ表示につき最後に届いた region_dwell だけを使う
    SELECT DISTINCT ON (e.page_view_id)
      e.page_view_id,
      e.region_dwell
    FROM public.analytics_events e
    JOIN public.analytics_sessions s ON s.id = e.session_id
    WHERE e.event_name = 'page_engagement'
      AND e.region_dwell IS NOT NULL
      AND e.page_view_id IS NOT NULL
      AND s.is_bot = FALSE
      AND e.received_at >= from_ts
      AND e.received_at < to_ts
      AND NOT public.is_internal_analytics_path(e.page_path)
      AND (target_path IS NULL OR e.page_path = target_path)
    ORDER BY e.page_view_id, e.received_at DESC
  ),
  bands AS (
    SELECT
      (band.ordinality - 1)::INTEGER AS band_index,
      (band.value)::TEXT::NUMERIC AS ms
    FROM latest_engagement le,
      LATERAL jsonb_array_elements(le.region_dwell->'bands')
        WITH ORDINALITY AS band(value, ordinality)
  )
  SELECT
    band_index,
    COUNT(*) AS page_views,
    ROUND(AVG(ms) / 1000.0, 1) AS avg_seconds,
    ROUND(SUM(ms) / 1000.0, 1) AS total_seconds
  FROM bands
  GROUP BY band_index
  ORDER BY band_index;
$$;

-- セクション単位（見出しで読める単位）の滞在
CREATE OR REPLACE FUNCTION public.analytics_page_sections(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  page_path TEXT,
  section_label TEXT,
  section_top INTEGER,
  page_views BIGINT,
  avg_seconds NUMERIC,
  total_seconds NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest_engagement AS (
    SELECT DISTINCT ON (e.page_view_id)
      e.page_view_id,
      e.page_path,
      e.region_dwell
    FROM public.analytics_events e
    JOIN public.analytics_sessions s ON s.id = e.session_id
    WHERE e.event_name = 'page_engagement'
      AND e.region_dwell IS NOT NULL
      AND e.page_view_id IS NOT NULL
      AND s.is_bot = FALSE
      AND e.received_at >= from_ts
      AND e.received_at < to_ts
      AND NOT public.is_internal_analytics_path(e.page_path)
    ORDER BY e.page_view_id, e.received_at DESC
  ),
  sections AS (
    SELECT
      le.page_path,
      NULLIF(section.value->>'label', '') AS section_label,
      COALESCE((section.value->>'top')::INTEGER, 0) AS section_top,
      COALESCE((section.value->>'ms')::NUMERIC, 0) AS ms
    FROM latest_engagement le,
      LATERAL jsonb_array_elements(le.region_dwell->'sections') AS section(value)
  )
  SELECT
    page_path,
    section_label,
    -- 表示のたびに位置が動くので代表値をとる
    ROUND(AVG(section_top))::INTEGER AS section_top,
    COUNT(*) AS page_views,
    ROUND(AVG(ms) / 1000.0, 1) AS avg_seconds,
    ROUND(SUM(ms) / 1000.0, 1) AS total_seconds
  FROM sections
  WHERE section_label IS NOT NULL
  GROUP BY page_path, section_label
  ORDER BY total_seconds DESC
  LIMIT row_limit;
$$;

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.analytics_visit_frequency(TIMESTAMPTZ, TIMESTAMPTZ)',
    'public.analytics_visitor_activity(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)',
    'public.analytics_by_hour(TIMESTAMPTZ, TIMESTAMPTZ)',
    'public.analytics_click_targets(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)',
    'public.analytics_page_bands(TIMESTAMPTZ, TIMESTAMPTZ, TEXT)',
    'public.analytics_page_sections(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END;
$$;
