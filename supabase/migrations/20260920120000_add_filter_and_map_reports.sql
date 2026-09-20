-- 絞り込みと地図操作の集計。
--
-- 対象は生きている2つの地図だけ:
--   spot-map     /map のスポットマップ（Leaflet）
--   missions-map クエスト一覧の地図モード（Google Maps）
-- ポスティング・ポスターの地図は画面から到達できないため計測していない。
--
-- 地図の中心座標は保存していない。記録しているのはズームと画面内のスポットIDで、
-- 「どのあたりを探しているか」は自分たちのスポットで表現する。

-- ============================================
-- 1. 絞り込みの使われ方
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_filter_usage(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  quest_type TEXT,
  kinds TEXT,
  regions TEXT,
  selections BIGINT,
  visitors BIGINT,
  avg_result_count NUMERIC,
  zero_result_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH changes AS (
    SELECT
      e.visitor_id,
      COALESCE(e.props->>'questType', '(未選択)') AS quest_type,
      -- 配列はそのままでは GROUP BY しにくいので、読める文字列に畳む
      COALESCE(
        NULLIF(
          (SELECT string_agg(value, ', ' ORDER BY value)
           FROM jsonb_array_elements_text(e.props->'kinds')),
          ''
        ),
        '(なし)'
      ) AS kinds,
      COALESCE(
        NULLIF(
          (SELECT string_agg(value, ', ' ORDER BY value)
           FROM jsonb_array_elements_text(e.props->'regions')),
          ''
        ),
        '(なし)'
      ) AS regions,
      (e.props->>'resultCount')::NUMERIC AS result_count
    FROM public.analytics_events e
    JOIN public.analytics_sessions s ON s.id = e.session_id
    WHERE e.event_name = 'filter_change'
      AND s.is_bot = FALSE
      AND e.received_at >= from_ts
      AND e.received_at < to_ts
  )
  SELECT
    quest_type,
    kinds,
    regions,
    COUNT(*) AS selections,
    COUNT(DISTINCT visitor_id) AS visitors,
    ROUND(AVG(result_count), 1) AS avg_result_count,
    -- 0件になる組み合わせは、選択肢の出し方に無理がある
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE result_count = 0) / NULLIF(COUNT(*), 0),
      1
    ) AS zero_result_rate
  FROM changes
  GROUP BY quest_type, kinds, regions
  ORDER BY selections DESC
  LIMIT row_limit;
$$;

-- ============================================
-- 2. 地図ごとの操作量
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_map_usage(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ
)
RETURNS TABLE (
  map_id TEXT,
  moves BIGINT,
  marker_clicks BIGINT,
  visitors BIGINT,
  avg_zoom NUMERIC,
  max_zoom NUMERIC,
  avg_visible_spots NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.props->>'mapId' AS map_id,
    COUNT(*) FILTER (WHERE e.event_name = 'map_move') AS moves,
    COUNT(*) FILTER (WHERE e.event_name = 'map_marker_click') AS marker_clicks,
    COUNT(DISTINCT e.visitor_id) AS visitors,
    -- ズームは地図を動かしたときの値だけを見る。
    -- クリック時の値を混ぜると「どのくらい寄せて見ているか」が読みにくくなる
    ROUND(
      AVG((e.props->>'zoom')::NUMERIC) FILTER (WHERE e.event_name = 'map_move'),
      1
    ) AS avg_zoom,
    MAX((e.props->>'zoom')::NUMERIC) FILTER (WHERE e.event_name = 'map_move') AS max_zoom,
    -- 1回の操作で画面に入っているスポット数。小さいほど絞り込んで見ている
    ROUND(
      AVG((e.props->>'visibleSpotCount')::NUMERIC)
        FILTER (WHERE e.event_name = 'map_move'),
      1
    ) AS avg_visible_spots
  FROM public.analytics_events e
  JOIN public.analytics_sessions s ON s.id = e.session_id
  WHERE e.event_name IN ('map_move', 'map_marker_click')
    AND e.props->>'mapId' IS NOT NULL
    AND s.is_bot = FALSE
    AND e.received_at >= from_ts
    AND e.received_at < to_ts
  GROUP BY e.props->>'mapId'
  ORDER BY moves DESC;
$$;

-- ============================================
-- 3. 地図でスポットが何回視界に入り、何回押されたか
-- ============================================
-- 「地図に出ているのに誰も押さないスポット」を見つけるための集計。
CREATE OR REPLACE FUNCTION public.analytics_map_spot_exposure(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  row_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  map_id TEXT,
  spot_id TEXT,
  spot_title TEXT,
  times_in_view BIGINT,
  viewers BIGINT,
  clicks BIGINT,
  click_rate NUMERIC
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
    WHERE e.event_name IN ('map_move', 'map_marker_click')
      AND s.is_bot = FALSE
      AND e.received_at >= from_ts
      AND e.received_at < to_ts
  ),
  in_view AS (
    SELECT
      b.props->>'mapId' AS map_id,
      spot.value AS spot_id,
      b.visitor_id
    FROM base b,
      LATERAL jsonb_array_elements_text(b.props->'visibleSpotIds') AS spot(value)
    WHERE b.event_name = 'map_move'
  ),
  clicked AS (
    SELECT
      b.props->>'mapId' AS map_id,
      b.props->>'spotId' AS spot_id,
      -- 同じスポットのタイトルは揺れないはずだが、念のため代表値を採る
      MODE() WITHIN GROUP (ORDER BY b.props->>'spotTitle') AS spot_title,
      COUNT(*) AS clicks
    FROM base b
    WHERE b.event_name = 'map_marker_click'
    GROUP BY 1, 2
  ),
  viewed AS (
    SELECT
      map_id,
      spot_id,
      COUNT(*) AS times_in_view,
      COUNT(DISTINCT visitor_id) AS viewers
    FROM in_view
    GROUP BY map_id, spot_id
  )
  SELECT
    COALESCE(v.map_id, c.map_id),
    COALESCE(v.spot_id, c.spot_id),
    c.spot_title,
    COALESCE(v.times_in_view, 0),
    COALESCE(v.viewers, 0),
    COALESCE(c.clicks, 0),
    ROUND(
      100.0 * COALESCE(c.clicks, 0) / NULLIF(v.times_in_view, 0),
      1
    ) AS click_rate
  FROM viewed v
  FULL OUTER JOIN clicked c
    ON c.map_id = v.map_id AND c.spot_id = v.spot_id
  ORDER BY COALESCE(v.times_in_view, 0) DESC, COALESCE(c.clicks, 0) DESC
  LIMIT row_limit;
$$;

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.analytics_filter_usage(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)',
    'public.analytics_map_usage(TIMESTAMPTZ, TIMESTAMPTZ)',
    'public.analytics_map_spot_exposure(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END;
$$;
