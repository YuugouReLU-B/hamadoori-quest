import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ARTIFACT_TYPES } from "@/lib/types/artifact-types";
import type { Database, Tables } from "@/lib/types/supabase";

export type SuggestedEvent = Pick<
  Tables<"missions">,
  "id" | "slug" | "title" | "icon_url" | "points" | "event_category"
>;

/**
 * ミッション達成後に「他のイベントへ行ってみよう」と誘導するための
 * 未達成のQR/GEO_CHECKINミッションを1件返す。
 *
 * 対象が無ければnullを返す（誘導セクション自体を出さない判断は呼び出し側で行う）。
 *
 * サービス層の createAdminClient() は jest.setup.js でグローバルにモックされ
 * 統合テストで実DBに繋がらないため、ユースケースと同様に渡されたクライアントを直接使う。
 */
export async function getSuggestedEvent(
  supabase: SupabaseClient<Database>,
  userId: string,
  excludeMissionId: string,
): Promise<SuggestedEvent | null> {
  const { data: achievements, error: achievementError } = await supabase
    .from("achievements")
    .select("mission_id")
    .eq("user_id", userId);

  if (achievementError) {
    console.error("達成状況の取得に失敗:", achievementError);
    return null;
  }

  const achievedIds = new Set(
    (achievements ?? []).flatMap((a) => (a.mission_id ? [a.mission_id] : [])),
  );
  achievedIds.add(excludeMissionId);

  const { data: missions, error } = await supabase
    .from("missions")
    .select("id, slug, title, icon_url, points, event_category")
    .in("required_artifact_type", [
      ARTIFACT_TYPES.QR.key,
      ARTIFACT_TYPES.GEO_CHECKIN.key,
    ])
    .eq("is_hidden", false)
    .order("title");

  if (error) {
    console.error("イベント候補の取得に失敗:", error);
    return null;
  }

  const candidate = (missions ?? []).find((m) => !achievedIds.has(m.id));
  return candidate ?? null;
}
