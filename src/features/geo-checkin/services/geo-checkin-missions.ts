import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

export type GeoCheckinMission = {
  id: string;
  slug: string;
  title: string;
  points: number;
  isHidden: boolean;
  maxAchievementCount: number | null;
  requiredArtifactType: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  eventDate: string | null;
  eventEndDate: string | null;
};

/**
 * 位置情報チェックイン対象のミッションを取得する。
 *
 * QRと違ってミッションIDそのものに秘匿性はない（ミッション詳細ページの
 * URLは誰でも開ける）。「その場にいるか」の判定は緯度経度と半径で行う。
 */
export async function getGeoCheckinMission(
  adminSupabase: SupabaseClient<Database>,
  missionId: string,
): Promise<GeoCheckinMission | null> {
  const { data, error } = await adminSupabase
    .from("missions")
    .select(
      "id, slug, title, points, is_hidden, max_achievement_count, required_artifact_type, latitude, longitude, radius_meters, event_date, event_end_date",
    )
    .eq("id", missionId)
    .maybeSingle();

  if (error) {
    console.error("位置情報チェックイン対象ミッションの取得に失敗:", error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    points: data.points,
    isHidden: data.is_hidden,
    maxAchievementCount: data.max_achievement_count,
    requiredArtifactType: data.required_artifact_type,
    latitude: data.latitude,
    longitude: data.longitude,
    radiusMeters: data.radius_meters,
    eventDate: data.event_date,
    eventEndDate: data.event_end_date,
  };
}
