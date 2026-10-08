"use server";

import { redeemGeoCheckin } from "@/features/geo-checkin/use-cases/redeem-geo-checkin";
import { getUser } from "@/features/user-profile/services/profile";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/client";

export type GeoCheckinActionResult =
  | { status: "unauthenticated" }
  | Awaited<ReturnType<typeof redeemGeoCheckin>>;

/**
 * userIdはクライアントから受け取らず、必ずセッションから取る。
 * 位置情報（緯度経度と精度）だけをブラウザから受け取り、判定はサーバー側で行う。
 * 判定に使った座標は use-case 側で保存する（プライバシーポリシー4-2）。
 */
export async function geoCheckinAction(
  missionId: string,
  latitude: number,
  longitude: number,
  accuracyMeters?: number | null,
): Promise<GeoCheckinActionResult> {
  const user = await getUser();
  if (!user) {
    return { status: "unauthenticated" };
  }

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { status: "invalid" };
  }

  // 精度は判定に使わない補助情報。おかしな値なら捨てて座標だけ残す
  const accuracy =
    typeof accuracyMeters === "number" &&
    Number.isFinite(accuracyMeters) &&
    accuracyMeters >= 0
      ? accuracyMeters
      : null;

  const adminSupabase = await createAdminClient();
  const userSupabase = createClient();

  return redeemGeoCheckin(
    adminSupabase,
    userSupabase,
    user.id,
    missionId,
    latitude,
    longitude,
    accuracy,
  );
}
