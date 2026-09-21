-- カレンダーでの探し方の集計。
--
-- 月送りは「開催日でクエストを探す」操作なので、絞り込みの一種として扱う。
-- その月にイベントが何件あったかも一緒に記録しているので、
-- 「空振りした月」＝イベントが無いのに見に来られた月が分かる。

CREATE OR REPLACE FUNCTION public.analytics_calendar_usage(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 60
)
RETURNS TABLE (
  month TEXT,
  views BIGINT,
  visitors BIGINT,
  event_count INTEGER,
  jumped_to_next BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT e.*
    FROM public.analytics_events e
    JOIN public.analytics_sessions s ON s.id = e.session_id
    WHERE e.event_name IN ('calendar_month_change', 'calendar_jump_to_next_event')
      AND s.is_bot = FALSE
      AND e.received_at >= from_ts
      AND e.received_at < to_ts
      AND NULLIF(e.props->>'month', '') IS NOT NULL
  )
  SELECT
    b.props->>'month' AS month,
    COUNT(*) FILTER (WHERE b.event_name = 'calendar_month_change') AS views,
    COUNT(DISTINCT b.visitor_id) AS visitors,
    -- 同じ月なら件数は同じはずなので最大値を代表にする
    MAX((b.props->>'eventCount')::INTEGER) AS event_count,
    COUNT(*) FILTER (WHERE b.event_name = 'calendar_jump_to_next_event')
      AS jumped_to_next
  FROM base b
  GROUP BY b.props->>'month'
  ORDER BY month
  LIMIT row_limit;
$$;

REVOKE ALL ON FUNCTION public.analytics_calendar_usage(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_calendar_usage(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)
  TO service_role;
