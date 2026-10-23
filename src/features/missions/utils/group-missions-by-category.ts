import type { Tables } from "@/lib/types/supabase";

type MissionCategoryView = Tables<"mission_category_view">;
export type MissionForComponent = Tables<"missions">;

export interface GroupMissionsByCategoryOptions {
  showAchievedMissions: boolean;
  achievedMissionIds: string[];
}

export interface CategoryWithMissions {
  categoryId: string;
  categoryTitle: string;
  categoryKbn: string;
  missions: MissionForComponent[];
}

/**
 * ミッションをカテゴリごとにグループ化し、各カテゴリ内でソート・フィルタリング・変換を行う
 *
 * 処理順:
 * 1. カテゴリごとにグループ化
 * 2. 上限まで達成済みのミッションを後ろにソート
 * 3. 達成済みミッションのフィルタリング（オプション）
 * 4. MissionForComponent型への変換
 */
export function groupMissionsByCategory(
  data: MissionCategoryView[],
  userAchievementCountMap: Map<string, number>,
  options: GroupMissionsByCategoryOptions,
): CategoryWithMissions[] {
  const { showAchievedMissions, achievedMissionIds } = options;

  // カテゴリごとにグループ化
  const grouped = data.reduce<Record<string, MissionCategoryView[]>>(
    (acc, row) => {
      // category_idがnullの場合はスキップ
      if (!row.category_id) return acc;

      if (!acc[row.category_id]) acc[row.category_id] = [];
      acc[row.category_id].push(row);
      return acc;
    },
    {},
  );

  // カテゴリ内のミッションをソート
  for (const categoryId in grouped) {
    grouped[categoryId].sort((a, b) => {
      // mission_idがnullの場合の処理
      if (!a.mission_id || !b.mission_id) return 0;

      // 達成済み（1回でも達成していれば）のミッションを後ろに移動。
      // 何度でも挑戦できるミッションも、達成済みなら一覧の下段に回す
      const aAchieved = (userAchievementCountMap.get(a.mission_id) ?? 0) > 0;
      const bAchieved = (userAchievementCountMap.get(b.mission_id) ?? 0) > 0;

      if (aAchieved && !bAchieved) {
        return 1; // a を後ろに
      }
      if (!aAchieved && bAchieved) {
        return -1; // b を後ろに
      }

      // それ以外はリンクのソート順で比較
      return (a.link_sort_no ?? 0) - (b.link_sort_no ?? 0);
    });
  }

  // カテゴリごとにフィルタリングと変換を行い、結果を配列として返す
  return Object.entries(grouped).map(([categoryId, missionsInCategory]) => {
    const category = missionsInCategory[0];

    const missions = missionsInCategory
      .filter(
        (m) =>
          m.mission_id &&
          (showAchievedMissions || !achievedMissionIds.includes(m.mission_id)),
      )
      .map((m): MissionForComponent => {
        const missionId = m.mission_id as string;
        const slug = m.slug || missionId;
        return {
          id: missionId,
          slug,
          title: m.title || "",
          icon_url: m.icon_url,
          quest_category: m.quest_category ?? "PERMANENT",
          event_category: m.event_category,
          region: m.region,
          address: m.address,
          google_map_url: m.google_map_url,
          difficulty: m.difficulty || 1,
          points: m.points ?? 0,
          latitude: m.latitude,
          longitude: m.longitude,
          radius_meters: m.radius_meters,
          content: m.content || "",
          created_at: m.created_at || new Date().toISOString(),
          artifact_label: m.artifact_label,
          supplement: m.supplement,
          tag1: m.tag1,
          tag2: m.tag2,
          tag3: m.tag3,
          max_achievement_count: m.max_achievement_count,
          event_date: m.event_date,
          event_end_date: m.event_end_date,
          event_type: m.event_type,
          is_featured: m.is_featured || false,
          updated_at: m.updated_at || new Date().toISOString(),
          is_hidden: m.is_hidden || false,
          ogp_image_url: m.ogp_image_url,
          required_artifact_type: m.required_artifact_type || "",
          featured_importance: null,
          first_published_at: null,
        };
      });

    return {
      categoryId,
      categoryTitle: category.category_title || "",
      categoryKbn: category.category_kbn || "",
      missions,
    };
  });
}
