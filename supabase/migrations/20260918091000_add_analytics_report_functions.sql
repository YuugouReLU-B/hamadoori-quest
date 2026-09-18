-- 管理画面（/admin/analytics）が使う集計関数。
--
-- supabase-js からは GROUP BY が書けないので、集計はすべてDB側の関数に寄せる。
-- 呼び出しは service_role のみ（管理画面が isAdmin 判定のうえで createAdminClient から叩く）。
--
-- 共通の除外方針:
--   * is_bot = TRUE のセッションは数えない（クローラ・OGP取得・監視）
--   * /admin と /dev は運営自身の操作なので既定で除外する

-- 管理画面・開発用画面かどうか
CREATE OR REPLACE FUNCTION public.is_internal_analytics_path(path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT path IS NOT NULL AND (path LIKE '/admin%' OR path LIKE '/dev%');
$$;

-- ============================================
-- 1. 全体サマリー
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_overview(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ
)
RETURNS TABLE (
  sessions BIGINT,
  visitors BIGINT,
  logged_in_users BIGINT,
  page_views BIGINT,
  avg_engaged_seconds NUMERIC,
  avg_max_scroll_pct NUMERIC,
  bounce_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH target_sessions AS (
    SELECT s.id, s.visitor_id, s.user_id
    FROM public.analytics_sessions s
    WHERE s.is_bot = FALSE
      AND s.started_at >= from_ts
      AND s.started_at < to_ts
  ),
  views AS (
    SELECT e.session_id, e.page_view_id
    FROM public.analytics_events e
    JOIN target_sessions ts ON ts.id = e.session_id
    WHERE e.event_name = 'page_view'
      AND NOT public.is_internal_analytics_path(e.page_path)
  ),
  -- 1ページ表示あたりの滞在とスクロールは、そのページ表示で最後に届いた値を採る。
  -- page_engagement は離脱のたびに累計値で送られてくるため MAX が最終値になる
  engagement AS (
    SELECT
      e.page_view_id,
      MAX(e.engaged_ms) AS engaged_ms,
      MAX(e.max_scroll_pct) AS max_scroll_pct
    FROM public.analytics_events e
    JOIN target_sessions ts ON ts.id = e.session_id
    WHERE e.event_name = 'page_engagement'
      AND e.page_view_id IS NOT NULL
      AND NOT public.is_internal_analytics_path(e.page_path)
    GROUP BY e.page_view_id
  ),
  views_per_session AS (
    SELECT session_id, COUNT(*) AS view_count
    FROM views
    GROUP BY session_id
  )
  SELECT
    (SELECT COUNT(*) FROM target_sessions),
    (SELECT COUNT(DISTINCT visitor_id) FROM target_sessions),
    (SELECT COUNT(DISTINCT user_id) FROM target_sessions WHERE user_id IS NOT NULL),
    (SELECT COUNT(*) FROM views),
    (SELECT ROUND(AVG(engaged_ms) / 1000.0, 1) FROM engagement),
    (SELECT ROUND(AVG(max_scroll_pct), 1) FROM engagement),
    -- 1ページしか見ずに終わったセッションの割合
    (
      SELECT ROUND(
        100.0 * COUNT(*) FILTER (WHERE view_count = 1) / NULLIF(COUNT(*), 0),
        1
      )
      FROM views_per_session
    );
$$;

-- ============================================
-- 2. 流入チャネル別
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_by_channel(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ
)
RETURNS TABLE (
  channel TEXT,
  sessions BIGINT,
  visitors BIGINT,
  page_views BIGINT,
  avg_engaged_seconds NUMERIC,
  signups BIGINT,
  achievements BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH target_sessions AS (
    SELECT s.id, s.channel, s.visitor_id, s.user_id, s.started_at, s.last_seen_at
    FROM public.analytics_sessions s
    WHERE s.is_bot = FALSE
      AND s.started_at >= from_ts
      AND s.started_at < to_ts
  )
  SELECT
    COALESCE(ts.channel, 'direct') AS channel,
    COUNT(DISTINCT ts.id) AS sessions,
    COUNT(DISTINCT ts.visitor_id) AS visitors,
    COUNT(*) FILTER (WHERE e.event_name = 'page_view') AS page_views,
    ROUND(
      AVG(e.engaged_ms) FILTER (WHERE e.event_name = 'page_engagement') / 1000.0,
      1
    ) AS avg_engaged_seconds,
    -- そのセッション中にユーザー登録が発生したか（private_users の作成時刻で見る）
    COUNT(DISTINCT pu.id) AS signups,
    COUNT(DISTINCT a.id) AS achievements
  FROM target_sessions ts
  LEFT JOIN public.analytics_events e
    ON e.session_id = ts.id
   AND NOT public.is_internal_analytics_path(e.page_path)
  LEFT JOIN public.private_users pu
    ON pu.id = ts.user_id
   AND pu.created_at >= ts.started_at
   AND pu.created_at <= ts.last_seen_at + INTERVAL '30 minutes'
  LEFT JOIN public.achievements a
    ON a.user_id = ts.user_id
   AND a.created_at >= ts.started_at
   AND a.created_at <= ts.last_seen_at + INTERVAL '30 minutes'
  GROUP BY COALESCE(ts.channel, 'direct')
  ORDER BY sessions DESC;
$$;

-- ============================================
-- 3. 参照元ホスト別（チャネルより細かく「どこから来たか」を見る）
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_by_referrer(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  channel TEXT,
  referrer_host TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  campaign_code TEXT,
  sessions BIGINT,
  visitors BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(s.channel, 'direct'),
    s.referrer_host,
    s.utm_source,
    s.utm_medium,
    s.utm_campaign,
    s.campaign_code,
    COUNT(*) AS sessions,
    COUNT(DISTINCT s.visitor_id) AS visitors
  FROM public.analytics_sessions s
  WHERE s.is_bot = FALSE
    AND s.started_at >= from_ts
    AND s.started_at < to_ts
  GROUP BY 1, 2, 3, 4, 5, 6
  ORDER BY sessions DESC
  LIMIT row_limit;
$$;

-- ============================================
-- 4. ページ別（PV・滞在時間・スクロール到達率・離脱）
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_by_page(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  page_path TEXT,
  page_title TEXT,
  page_views BIGINT,
  visitors BIGINT,
  avg_engaged_seconds NUMERIC,
  median_engaged_seconds NUMERIC,
  avg_max_scroll_pct NUMERIC,
  read_to_bottom_rate NUMERIC,
  entries BIGINT,
  exits BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH target_sessions AS (
    SELECT s.id, s.visitor_id
    FROM public.analytics_sessions s
    WHERE s.is_bot = FALSE
      AND s.started_at >= from_ts
      AND s.started_at < to_ts
  ),
  views AS (
    SELECT
      e.page_view_id,
      e.session_id,
      ts.visitor_id,
      e.page_path,
      e.page_title,
      e.occurred_at,
      -- セッション内でのページ表示の並び。最初＝入口、最後＝出口
      ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.occurred_at, e.seq) AS view_index,
      ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.occurred_at DESC, e.seq DESC) AS view_index_desc
    FROM public.analytics_events e
    JOIN target_sessions ts ON ts.id = e.session_id
    WHERE e.event_name = 'page_view'
      AND e.page_view_id IS NOT NULL
      AND NOT public.is_internal_analytics_path(e.page_path)
  ),
  engagement AS (
    SELECT
      e.page_view_id,
      MAX(e.engaged_ms) AS engaged_ms,
      MAX(e.max_scroll_pct) AS max_scroll_pct
    FROM public.analytics_events e
    WHERE e.event_name = 'page_engagement'
      AND e.page_view_id IS NOT NULL
    GROUP BY e.page_view_id
  )
  SELECT
    v.page_path,
    -- 同じパスでもタイトルが揺れることがあるので代表値を1つ選ぶ
    MODE() WITHIN GROUP (ORDER BY v.page_title) AS page_title,
    COUNT(*) AS page_views,
    COUNT(DISTINCT v.visitor_id) AS visitors,
    ROUND(AVG(en.engaged_ms) / 1000.0, 1) AS avg_engaged_seconds,
    ROUND(
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY en.engaged_ms))::NUMERIC / 1000.0,
      1
    ) AS median_engaged_seconds,
    ROUND(AVG(en.max_scroll_pct), 1) AS avg_max_scroll_pct,
    -- 9割以上まで到達した割合＝ほぼ最後まで読まれた割合
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE en.max_scroll_pct >= 90)
        / NULLIF(COUNT(en.page_view_id), 0),
      1
    ) AS read_to_bottom_rate,
    COUNT(*) FILTER (WHERE v.view_index = 1) AS entries,
    COUNT(*) FILTER (WHERE v.view_index_desc = 1) AS exits
  FROM views v
  LEFT JOIN engagement en ON en.page_view_id = v.page_view_id
  GROUP BY v.page_path
  ORDER BY page_views DESC
  LIMIT row_limit;
$$;

-- ============================================
-- 5. ページ遷移（どこからどこへ動いたか）
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_page_flow(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  from_path TEXT,
  to_path TEXT,
  step_index INTEGER,
  transitions BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH views AS (
    SELECT
      e.session_id,
      e.page_path,
      ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.occurred_at, e.seq) AS view_index
    FROM public.analytics_events e
    JOIN public.analytics_sessions s ON s.id = e.session_id
    WHERE e.event_name = 'page_view'
      AND s.is_bot = FALSE
      AND s.started_at >= from_ts
      AND s.started_at < to_ts
      AND NOT public.is_internal_analytics_path(e.page_path)
  ),
  steps AS (
    SELECT
      page_path AS from_path,
      LEAD(page_path) OVER (PARTITION BY session_id ORDER BY view_index) AS to_path,
      view_index::INTEGER AS step_index
    FROM views
  )
  SELECT
    from_path,
    to_path,
    step_index,
    COUNT(*) AS transitions
  FROM steps
  WHERE to_path IS NOT NULL
    -- 同じページの再表示（クエリ違い等）は遷移として数えない
    AND to_path <> from_path
  GROUP BY from_path, to_path, step_index
  ORDER BY transitions DESC
  LIMIT row_limit;
$$;

-- ============================================
-- 6. 地域別（IP由来）
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_by_location(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  ip_country TEXT,
  ip_region TEXT,
  ip_city TEXT,
  sessions BIGINT,
  visitors BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.ip_country,
    s.ip_region,
    s.ip_city,
    COUNT(*) AS sessions,
    COUNT(DISTINCT s.visitor_id) AS visitors
  FROM public.analytics_sessions s
  WHERE s.is_bot = FALSE
    AND s.started_at >= from_ts
    AND s.started_at < to_ts
  GROUP BY s.ip_country, s.ip_region, s.ip_city
  ORDER BY sessions DESC
  LIMIT row_limit;
$$;

-- ============================================
-- 7. 獲得（どの流入元の人が、どこで、何を取ったか）
-- ============================================
-- 実績そのものは achievements テーブルが正なので、解析側で二重に持たず
-- 「達成時刻を含むセッション」を後から突き合わせる。
CREATE OR REPLACE FUNCTION public.analytics_acquisitions(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  mission_id UUID,
  mission_title TEXT,
  mission_slug TEXT,
  channel TEXT,
  referrer_host TEXT,
  campaign_code TEXT,
  achievements BIGINT,
  users BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.title,
    m.slug,
    COALESCE(s.channel, 'unknown'),
    s.referrer_host,
    s.campaign_code,
    COUNT(*) AS achievements,
    COUNT(DISTINCT a.user_id) AS users
  FROM public.achievements a
  JOIN public.missions m ON m.id = a.mission_id
  -- 達成時刻を含むセッションのうち直近のもの＝そのとき辿っていた流入元
  LEFT JOIN LATERAL (
    SELECT sess.channel, sess.referrer_host, sess.campaign_code
    FROM public.analytics_sessions sess
    WHERE sess.user_id = a.user_id
      AND sess.is_bot = FALSE
      AND a.created_at >= sess.started_at
      AND a.created_at <= sess.last_seen_at + INTERVAL '30 minutes'
    ORDER BY sess.started_at DESC
    LIMIT 1
  ) s ON TRUE
  WHERE a.created_at >= from_ts
    AND a.created_at < to_ts
  GROUP BY m.id, m.title, m.slug, COALESCE(s.channel, 'unknown'), s.referrer_host, s.campaign_code
  ORDER BY achievements DESC
  LIMIT row_limit;
$$;

-- ============================================
-- 8. 直近のセッション一覧と、1セッションの行動タイムライン
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_recent_sessions(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  session_id UUID,
  visitor_id UUID,
  user_id UUID,
  started_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  channel TEXT,
  referrer_host TEXT,
  landing_path TEXT,
  device_type TEXT,
  browser TEXT,
  ip_city TEXT,
  ip_region TEXT,
  page_views BIGINT,
  engaged_seconds NUMERIC,
  achievements BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.visitor_id,
    s.user_id,
    s.started_at,
    s.last_seen_at,
    COALESCE(s.channel, 'direct'),
    s.referrer_host,
    s.landing_path,
    s.device_type,
    s.browser,
    s.ip_city,
    s.ip_region,
    COUNT(*) FILTER (WHERE e.event_name = 'page_view') AS page_views,
    ROUND(
      COALESCE(SUM(pv.engaged_ms), 0) / 1000.0,
      1
    ) AS engaged_seconds,
    (
      SELECT COUNT(*)
      FROM public.achievements a
      WHERE a.user_id = s.user_id
        AND a.created_at >= s.started_at
        AND a.created_at <= s.last_seen_at + INTERVAL '30 minutes'
    ) AS achievements
  FROM public.analytics_sessions s
  LEFT JOIN public.analytics_events e
    ON e.session_id = s.id
   AND NOT public.is_internal_analytics_path(e.page_path)
  -- ページ表示ごとの最終エンゲージメント値を1件に畳んでから足す
  LEFT JOIN LATERAL (
    SELECT MAX(pe.engaged_ms) AS engaged_ms
    FROM public.analytics_events pe
    WHERE pe.page_view_id = e.page_view_id
      AND pe.event_name = 'page_engagement'
  ) pv ON e.event_name = 'page_view'
  WHERE s.is_bot = FALSE
    AND s.started_at >= from_ts
    AND s.started_at < to_ts
  GROUP BY s.id
  ORDER BY s.started_at DESC
  LIMIT row_limit;
$$;

CREATE OR REPLACE FUNCTION public.analytics_session_timeline(
  target_session_id UUID,
  row_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  occurred_at TIMESTAMPTZ,
  seq INTEGER,
  event_name TEXT,
  page_path TEXT,
  page_title TEXT,
  engaged_ms INTEGER,
  max_scroll_pct SMALLINT,
  scroll_pct SMALLINT,
  ms_since_page_view INTEGER,
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  props JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.occurred_at,
    e.seq,
    e.event_name,
    e.page_path,
    e.page_title,
    e.engaged_ms,
    e.max_scroll_pct,
    e.scroll_pct,
    e.ms_since_page_view,
    e.gps_latitude,
    e.gps_longitude,
    e.props
  FROM public.analytics_events e
  WHERE e.session_id = target_session_id
  ORDER BY e.occurred_at, e.seq
  LIMIT row_limit;
$$;

-- 集計関数はすべて service_role からのみ呼べるようにする
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.analytics_overview(TIMESTAMPTZ, TIMESTAMPTZ)',
    'public.analytics_by_channel(TIMESTAMPTZ, TIMESTAMPTZ)',
    'public.analytics_by_referrer(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)',
    'public.analytics_by_page(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)',
    'public.analytics_page_flow(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)',
    'public.analytics_by_location(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)',
    'public.analytics_acquisitions(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)',
    'public.analytics_recent_sessions(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)',
    'public.analytics_session_timeline(UUID, INTEGER)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END;
$$;
