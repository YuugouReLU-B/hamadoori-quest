import "server-only";

import { calculateMissionXp } from "@/features/user-level/utils/level-calculator";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { ARTIFACT_TYPES } from "@/lib/types/artifact-types";

export type MapSpot = {
  id: string;
  slug: string;
  title: string;
  /** 実際に付与されるポイント */
  points: number;
  latitude: number;
  longitude: number;
  /** ログイン中のユーザーが達成済みか。未ログインなら常に false */
  achieved: boolean;
  /** 管理画面で入れたGoogleマップの共有URL。地図リンクに優先して使う */
  googleMapUrl: string | null;
};

/**
 * 地図に出すQRスポットを取得する。
 *
 * 緯度経度が入っていないスポットは地図に置けないので除く。管理画面で
 * 座標を入れたものから順に地図へ出ていく、という運用になる。
 */
export async function getMapSpots(userId: string | null): Promise<MapSpot[]> {
  const supabase = await createAdminClient();

  const { data: missions, error } = await supabase
    .from("missions")
    .select(
      "id, slug, title, points, is_featured, latitude, longitude, google_map_url",
    )
    .eq("required_artifact_type", ARTIFACT_TYPES.QR.key)
    .eq("is_hidden", false)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("title");

  if (error) {
    console.error("スポットの取得に失敗:", error);
    return [];
  }

  const achievedIds = new Set<string>();
  if (userId) {
    const { data: achievements, error: achievementError } = await supabase
      .from("achievements")
      .select("mission_id")
      .eq("user_id", userId);

    if (achievementError) {
      // 達成状況が引けなくても地図自体は出す。全部未達成として描く
      console.error("達成状況の取得に失敗:", achievementError);
    }
    for (const row of achievements ?? []) {
      if (row.mission_id) achievedIds.add(row.mission_id);
    }
  }

  return (missions ?? []).flatMap((mission) => {
    // クエリで除いているが、型の上では null が残るので改めて絞る
    if (mission.latitude === null || mission.longitude === null) return [];

    return [
      {
        id: mission.id,
        slug: mission.slug,
        title: mission.title,
        points: calculateMissionXp(mission),
        latitude: mission.latitude,
        longitude: mission.longitude,
        achieved: achievedIds.has(mission.id),
        googleMapUrl: mission.google_map_url,
      },
    ];
  });
}
