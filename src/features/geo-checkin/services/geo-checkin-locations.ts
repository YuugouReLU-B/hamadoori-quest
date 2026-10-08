import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

/** 保存する判定結果。距離の判定まで進んだものだけを残す */
export type GeoCheckinLocationResult =
  | "granted"
  | "too_far"
  | "already"
  | "error";

export type GeoCheckinLocationRecord = {
  userId: string;
  missionId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  distanceMeters: number;
  result: GeoCheckinLocationResult;
};

/**
 * チェックインの判定に使った座標を1行残す。
 *
 * プライバシーポリシー上、チェックインの判定・不正の防止・実証実験の検証のために
 * 保存すると定めている。保存に失敗してもチェックインそのものは失敗させない
 * （利用者の達成を記録の都合で取りこぼさない）ので、例外は投げずにログだけ残す。
 */
export async function recordGeoCheckinLocation(
  adminSupabase: SupabaseClient<Database>,
  record: GeoCheckinLocationRecord,
): Promise<void> {
  try {
    const { error } = await adminSupabase.from("geo_checkin_locations").insert({
      user_id: record.userId,
      mission_id: record.missionId,
      latitude: record.latitude,
      longitude: record.longitude,
      accuracy_meters: record.accuracyMeters,
      distance_meters: record.distanceMeters,
      result: record.result,
    });
    if (error) {
      console.error("チェックイン位置の保存に失敗しました:", error.message);
    }
  } catch (error) {
    console.error("チェックイン位置の保存に失敗しました:", error);
  }
}
