import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type GeoCheckinMission,
  getGeoCheckinMission,
} from "@/features/geo-checkin/services/geo-checkin-missions";
import { achieveMission } from "@/features/mission-detail/use-cases/achieve-mission";
import { ARTIFACT_TYPES } from "@/lib/types/artifact-types";
import type { Database } from "@/lib/types/supabase";
import { calculateDistanceMeters } from "@/lib/utils/geo-distance";

export type RedeemGeoCheckinResult =
  | { status: "granted"; mission: GeoCheckinMission; xpGranted: number }
  | { status: "already"; mission: GeoCheckinMission }
  | { status: "invalid" }
  | { status: "unavailable"; mission: GeoCheckinMission }
  | { status: "not_configured"; mission: GeoCheckinMission }
  | {
      status: "too_far";
      mission: GeoCheckinMission;
      distanceMeters: number;
      radiusMeters: number;
    }
  | { status: "error"; mission: GeoCheckinMission; message: string };

/**
 * 位置情報を判定してポイントを獲得する。
 *
 * 達成の記録は既存の achieveMission を通す。XP付与・バッジ・
 * ランキング更新をすべて再利用するため、ここで独自に加算しない。
 *
 * **ブラウザが返す位置情報は偽装できる**（開発者ツール・モックGPSアプリ等）。
 * QRの転載と同じく、ベータでは対策しない前提で許容する。
 */
export async function redeemGeoCheckin(
  adminSupabase: SupabaseClient<Database>,
  userSupabase: SupabaseClient<Database>,
  userId: string,
  missionId: string,
  latitude: number,
  longitude: number,
): Promise<RedeemGeoCheckinResult> {
  const mission = await getGeoCheckinMission(adminSupabase, missionId);

  if (
    !mission ||
    mission.requiredArtifactType !== ARTIFACT_TYPES.GEO_CHECKIN.key
  ) {
    return { status: "invalid" };
  }

  if (mission.isHidden) {
    return { status: "unavailable", mission };
  }

  if (
    mission.latitude === null ||
    mission.longitude === null ||
    mission.radiusMeters === null
  ) {
    // 管理画面で位置・半径が未設定。公開する前に必ず埋めるべき設定ミス
    return { status: "not_configured", mission };
  }

  // 上限に達しているかを先に見る。achieveMission でも弾かれるが、
  // 「もう獲得済み」と「遠すぎる」を利用者に区別して伝えたい
  if (mission.maxAchievementCount !== null) {
    const { count } = await adminSupabase
      .from("achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("mission_id", mission.id);

    if ((count ?? 0) >= mission.maxAchievementCount) {
      return { status: "already", mission };
    }
  }

  const distanceMeters = calculateDistanceMeters(
    latitude,
    longitude,
    mission.latitude,
    mission.longitude,
  );

  if (distanceMeters > mission.radiusMeters) {
    return {
      status: "too_far",
      mission,
      distanceMeters,
      radiusMeters: mission.radiusMeters,
    };
  }

  const result = await achieveMission(adminSupabase, userSupabase, {
    userId,
    missionId: mission.id,
    artifactType: ARTIFACT_TYPES.GEO_CHECKIN.key,
    artifactData: {
      missionId: mission.id,
      requiredArtifactType: ARTIFACT_TYPES.GEO_CHECKIN.key,
    },
  });

  if (!result.success) {
    return { status: "error", mission, message: result.error };
  }

  return { status: "granted", mission, xpGranted: result.xpGranted };
}
