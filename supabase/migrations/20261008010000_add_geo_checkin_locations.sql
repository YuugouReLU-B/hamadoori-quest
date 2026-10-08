-- 位置情報チェックインの判定に使った座標の記録。
--
-- プライバシーポリシー「4. 位置情報の取り扱い」で、チェックインの操作で取得した
-- 位置情報を「チェックインの判定、不正の防止、および実証実験の検証のために保存する」と
-- 定めている。これまでは距離判定に使うだけで保存していなかったので、判定した時点で1行残す。
--
-- 退会（auth.users の削除）で行ごと消える。退会時は達成記録と一緒に削除する方針（7-3）。
CREATE TABLE geo_checkin_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy_meters DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  result TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT geo_checkin_locations_latitude_range CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT geo_checkin_locations_longitude_range CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT geo_checkin_locations_result_check CHECK (
    result IN ('granted', 'too_far', 'already', 'error')
  )
);

COMMENT ON TABLE geo_checkin_locations IS 'チェックインの操作で取得した位置情報。チェックインの判定・不正の防止・実証実験の検証のために保存する。退会で削除される。';
COMMENT ON COLUMN geo_checkin_locations.latitude IS 'ボタンを押したときに端末から送られた緯度。';
COMMENT ON COLUMN geo_checkin_locations.longitude IS 'ボタンを押したときに端末から送られた経度。';
COMMENT ON COLUMN geo_checkin_locations.accuracy_meters IS '端末が返した位置の精度（m）。送られなければ NULL。';
COMMENT ON COLUMN geo_checkin_locations.distance_meters IS 'ミッションの座標からの距離（m）。';
COMMENT ON COLUMN geo_checkin_locations.result IS '判定結果。granted=達成 / too_far=半径外 / already=獲得済み / error=半径内だが記録に失敗。';

CREATE INDEX idx_geo_checkin_locations_user_created
  ON geo_checkin_locations (user_id, created_at);
CREATE INDEX idx_geo_checkin_locations_mission
  ON geo_checkin_locations (mission_id);

ALTER TABLE geo_checkin_locations ENABLE ROW LEVEL SECURITY;

-- 個人の位置情報なので、ポリシーは作らず service_role だけに開ける
REVOKE ALL ON geo_checkin_locations FROM anon, authenticated;
