import type { SupabaseClient } from "@supabase/supabase-js";
import { achieveMission } from "@/features/mission-detail/use-cases/achieve-mission";
import {
  findMissionByQrCode,
  type QrSpotMission,
} from "@/features/qr-spot/services/qr-code";
import { ARTIFACT_TYPES } from "@/lib/types/artifact-types";
import type { Database } from "@/lib/types/supabase";

export type RedeemQrSpotResult =
  | { status: "granted"; mission: QrSpotMission; xpGranted: number }
  | { status: "already"; mission: QrSpotMission }
  | { status: "invalid" }
  | { status: "unavailable"; mission: QrSpotMission }
  | { status: "error"; mission: QrSpotMission; message: string };

/**
 * QRコードを読み取ってポイントを獲得する。
 *
 * 達成の記録は既存の achieveMission を通す。XP付与・バッジ・
 * ランキング更新をすべて再利用するため、ここで独自に加算しない。
 *
 * ベータでは転載対策を入れていない。QRを撮影して共有されると現地に
 * 行っていない人でも獲得できる。位置情報による判定は missions の
 * latitude / longitude を使って後から足せるようにしてある。
 */
export async function redeemQrSpot(
  adminSupabase: SupabaseClient<Database>,
  userSupabase: SupabaseClient<Database>,
  userId: string,
  code: string,
): Promise<RedeemQrSpotResult> {
  const mission = await findMissionByQrCode(adminSupabase, code);

  if (!mission) {
    return { status: "invalid" };
  }

  // 非表示のミッションは獲得させない。QRを配ったあとに取り下げる運用がありうる
  if (mission.isHidden) {
    return { status: "unavailable", mission };
  }

  // 上限に達しているかを先に見る。achieveMission でも弾かれるが、
  // 「もう獲得済み」と「失敗した」を利用者に区別して伝えたい
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

  const result = await achieveMission(adminSupabase, userSupabase, {
    userId,
    missionId: mission.id,
    artifactType: ARTIFACT_TYPES.QR.key,
    artifactData: {
      missionId: mission.id,
      requiredArtifactType: ARTIFACT_TYPES.QR.key,
    },
  });

  if (!result.success) {
    return { status: "error", mission, message: result.error };
  }

  return { status: "granted", mission, xpGranted: result.xpGranted };
}
