-- コンテンツ単位の閲覧集計。
--
-- ページを高さで10等分した帯（analytics_page_bands）は、どの画面でも必ず取れる代わりに
-- 「上から3割目に5秒」としか読めない。実際に知りたいのは「どのクエストが何秒見られたか」
-- なので、画面側に data-analytics-content / -id / -label を振った要素の表示時間を集計する。
--
-- 表示時間は「その要素が画面内に映っていた時間」で、クリックされなくても積まれる。
-- max_visible_pct は要素のうち最大何割が画面に入ったかで、
-- カード全体が見えたのか端が掠めただけかを区別するために使う。

CREATE OR REPLACE FUNCTION public.analytics_content_dwell(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  content_type TEXT DEFAULT NULL,
  row_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  content_type_out TEXT,
  content_id TEXT,
  content_label TEXT,
  page_path TEXT,
  impressions BIGINT,
  visitors BIGINT,
  avg_seconds NUMERIC,
  total_seconds NUMERIC,
  avg_max_visible_pct NUMERIC,
  fully_seen_rate NUMERIC
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
      e.page_path,
      e.visitor_id,
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
  items AS (
    SELECT
      le.page_path,
      le.visitor_id,
      NULLIF(item.value->>'type', '') AS content_type,
      NULLIF(item.value->>'id', '') AS content_id,
      NULLIF(item.value->>'label', '') AS content_label,
      COALESCE((item.value->>'ms')::NUMERIC, 0) AS ms,
      COALESCE((item.value->>'maxVisiblePct')::NUMERIC, 0) AS max_visible_pct
    FROM latest_engagement le,
      LATERAL jsonb_array_elements(le.region_dwell->'contents') AS item(value)
  )
  SELECT
    items.content_type,
    items.content_id,
    -- 同じIDでもラベルが揺れることがあるので代表値を1つ選ぶ
    MODE() WITHIN GROUP (ORDER BY items.content_label) AS content_label,
    items.page_path,
    COUNT(*) AS impressions,
    COUNT(DISTINCT items.visitor_id) AS visitors,
    ROUND(AVG(items.ms) / 1000.0, 1) AS avg_seconds,
    ROUND(SUM(items.ms) / 1000.0, 1) AS total_seconds,
    ROUND(AVG(items.max_visible_pct), 1) AS avg_max_visible_pct,
    -- 9割以上が画面に入った割合＝ちゃんと目に入ったと言える割合
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE items.max_visible_pct >= 90)
        / NULLIF(COUNT(*), 0),
      1
    ) AS fully_seen_rate
  FROM items
  WHERE items.content_type IS NOT NULL
    AND (content_type IS NULL OR items.content_type = content_type)
  GROUP BY items.content_type, items.content_id, items.page_path
  ORDER BY total_seconds DESC
  LIMIT row_limit;
$$;

REVOKE ALL ON FUNCTION public.analytics_content_dwell(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_content_dwell(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER)
  TO service_role;
