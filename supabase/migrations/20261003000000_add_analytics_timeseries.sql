-- ============================================
-- 管理画面アクセス解析: 期間内の推移（グラフ用）
--
-- 日本時間の1日（期間が24時間のときは1時間）ごとに、
-- セッション・訪問者・ページビュー・新規登録・クエスト獲得を数える。
-- 空の区間も0で返す（グラフの横軸が飛ばないように）。
--
-- セッション・訪問者はセッション開始時刻、ページビューはサーバ受信時刻で振り分ける。
-- 新規登録・クエスト獲得は行動計測と紐づけず全体を数える（流入チャネル表の
-- 「セッション中に起きたもの」より広い）。
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_timeseries(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  bucket_unit TEXT DEFAULT 'day'
)
RETURNS TABLE (
  bucket_start TIMESTAMP,
  sessions BIGINT,
  visitors BIGINT,
  page_views BIGINT,
  signups BIGINT,
  achievements BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH unit AS (
    SELECT CASE WHEN bucket_unit = 'hour' THEN 'hour' ELSE 'day' END AS name
  ),
  buckets AS (
    SELECT gs AS bucket_start
    FROM unit,
      generate_series(
        date_trunc(unit.name, from_ts AT TIME ZONE 'Asia/Tokyo'),
        date_trunc(unit.name, (to_ts - INTERVAL '1 second') AT TIME ZONE 'Asia/Tokyo'),
        CASE WHEN unit.name = 'hour' THEN INTERVAL '1 hour' ELSE INTERVAL '1 day' END
      ) AS gs
  ),
  session_counts AS (
    SELECT
      date_trunc(unit.name, s.started_at AT TIME ZONE 'Asia/Tokyo') AS bucket_start,
      COUNT(*) AS sessions,
      COUNT(DISTINCT s.visitor_id) AS visitors
    FROM public.analytics_sessions s, unit
    WHERE s.is_bot = FALSE
      AND s.started_at >= from_ts
      AND s.started_at < to_ts
    GROUP BY 1
  ),
  view_counts AS (
    SELECT
      date_trunc(unit.name, e.received_at AT TIME ZONE 'Asia/Tokyo') AS bucket_start,
      COUNT(*) AS page_views
    FROM public.analytics_events e
    JOIN public.analytics_sessions s ON s.id = e.session_id AND s.is_bot = FALSE,
      unit
    WHERE e.event_name = 'page_view'
      AND e.received_at >= from_ts
      AND e.received_at < to_ts
      AND NOT public.is_internal_analytics_path(e.page_path)
    GROUP BY 1
  ),
  signup_counts AS (
    SELECT
      date_trunc(unit.name, pu.created_at AT TIME ZONE 'Asia/Tokyo') AS bucket_start,
      COUNT(*) AS signups
    FROM public.private_users pu, unit
    WHERE pu.created_at >= from_ts
      AND pu.created_at < to_ts
    GROUP BY 1
  ),
  achievement_counts AS (
    SELECT
      date_trunc(unit.name, a.created_at AT TIME ZONE 'Asia/Tokyo') AS bucket_start,
      COUNT(*) AS achievements
    FROM public.achievements a, unit
    WHERE a.created_at >= from_ts
      AND a.created_at < to_ts
    GROUP BY 1
  )
  SELECT
    b.bucket_start,
    COALESCE(sc.sessions, 0),
    COALESCE(sc.visitors, 0),
    COALESCE(vc.page_views, 0),
    COALESCE(su.signups, 0),
    COALESCE(ac.achievements, 0)
  FROM buckets b
  LEFT JOIN session_counts sc ON sc.bucket_start = b.bucket_start
  LEFT JOIN view_counts vc ON vc.bucket_start = b.bucket_start
  LEFT JOIN signup_counts su ON su.bucket_start = b.bucket_start
  LEFT JOIN achievement_counts ac ON ac.bucket_start = b.bucket_start
  ORDER BY b.bucket_start;
$$;

REVOKE ALL ON FUNCTION public.analytics_timeseries(TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_timeseries(TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
  TO service_role;
