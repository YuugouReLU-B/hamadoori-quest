-- ============================================
-- 管理画面アクセス解析: 累計の推移（グラフ用）
--
-- 各区間（日本時間の1日、期間が2日以内なら1時間）の終わり時点での
-- 登録ユーザー数とクエスト達成数の「累計」を返す。期間より前の分も含めた通算。
-- 達成数はクエストの種類別に分ける（LINE友だち・位置チェックイン・紹介・その他）。
--
-- 行動計測とは独立していて、private_users と achievements だけから数える。
-- ============================================
CREATE OR REPLACE FUNCTION public.analytics_cumulative(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  bucket_unit TEXT DEFAULT 'day'
)
RETURNS TABLE (
  bucket_start TIMESTAMP,
  total_users BIGINT,
  line_friend_achievements BIGINT,
  geo_checkin_achievements BIGINT,
  referral_achievements BIGINT,
  other_achievements BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH unit AS (
    SELECT
      CASE WHEN bucket_unit = 'hour' THEN 'hour' ELSE 'day' END AS name,
      CASE WHEN bucket_unit = 'hour' THEN INTERVAL '1 hour' ELSE INTERVAL '1 day' END AS step
  ),
  buckets AS (
    SELECT
      gs AS bucket_start,
      -- 区間の終わり（日本時間の壁時計時刻を TIMESTAMPTZ に戻す）
      (gs + unit.step) AT TIME ZONE 'Asia/Tokyo' AS bucket_end
    FROM unit,
      generate_series(
        date_trunc(unit.name, from_ts AT TIME ZONE 'Asia/Tokyo'),
        date_trunc(unit.name, (to_ts - INTERVAL '1 second') AT TIME ZONE 'Asia/Tokyo'),
        unit.step
      ) AS gs
  ),
  typed_achievements AS (
    SELECT
      a.created_at,
      CASE
        WHEN m.required_artifact_type = 'LINE_FRIEND' THEN 'line_friend'
        WHEN m.required_artifact_type = 'GEO_CHECKIN' THEN 'geo_checkin'
        WHEN m.required_artifact_type IN ('REFERRAL', 'REFERRED') THEN 'referral'
        ELSE 'other'
      END AS kind
    FROM public.achievements a
    JOIN public.missions m ON m.id = a.mission_id
    WHERE a.created_at < to_ts
  )
  SELECT
    b.bucket_start,
    (SELECT COUNT(*) FROM public.private_users pu WHERE pu.created_at < b.bucket_end),
    (SELECT COUNT(*) FROM typed_achievements t WHERE t.kind = 'line_friend' AND t.created_at < b.bucket_end),
    (SELECT COUNT(*) FROM typed_achievements t WHERE t.kind = 'geo_checkin' AND t.created_at < b.bucket_end),
    (SELECT COUNT(*) FROM typed_achievements t WHERE t.kind = 'referral' AND t.created_at < b.bucket_end),
    (SELECT COUNT(*) FROM typed_achievements t WHERE t.kind = 'other' AND t.created_at < b.bucket_end)
  FROM buckets b
  ORDER BY b.bucket_start;
$$;

REVOKE ALL ON FUNCTION public.analytics_cumulative(TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_cumulative(TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
  TO service_role;
