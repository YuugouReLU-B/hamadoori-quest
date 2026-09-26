import "server-only";

import type { MissionAchievementSummary } from "@/features/user-achievements/types/achievement-types";
import { createClient } from "@/lib/supabase/client";
import {
  aggregateAchievementCounts,
  buildAchievementMap,
} from "../utils/achievement-aggregation";

export async function getUserRepeatableMissionAchievements(
  userId: string,
  seasonId?: string,
): Promise<MissionAchievementSummary[]> {
  const supabase = createClient();

  let query = supabase
    .from("achievements")
    .select(`
      mission_id,
      missions!inner (
        id,
        slug,
        title,
        max_achievement_count
      )
    `)
    .eq("user_id", userId)
    .is("missions.max_achievement_count", null);

  // Add season filter if specified
  if (seasonId) {
    query = query.eq("season_id", seasonId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch user mission achievements:", error);
    return [];
  }

  if (!data) return [];

  return aggregateAchievementCounts(
    data as Parameters<typeof aggregateAchievementCounts>[0],
  );
}

/**
 * ユーザーのミッション達成情報を取得し、ミッションIDごとの達成回数をMapで返す
 */
export async function getUserMissionAchievements(
  userId: string,
): Promise<Map<string, number>> {
  const supabase = createClient();

  const { data: achievements, error } = await supabase
    .from("achievements")
    .select("mission_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user achievements:", error);
    throw error;
  }

  return buildAchievementMap(achievements ?? []);
}

export type AchievedMission = {
  missionId: string;
  slug: string;
  title: string;
  /** 同じミッションを複数回達成している場合の回数 */
  count: number;
  /** 一番新しい達成日時 */
  achievedAt: string;
  /**
   * 非公開クエストかどうか。
   *
   * 非公開クエストの詳細ページは notFound() になる（app/missions/[slug]/page.tsx）。
   * 紹介された側の達成（referred-signup）のように自動達成で is_hidden なものが
   * ここに並ぶため、リンクを張るかどうかの判定に使う。
   */
  isHidden: boolean;
};

/**
 * ユーザーが達成したミッションを、新しい順に返す。
 *
 * `getUserRepeatableMissionAchievements` は繰り返し達成できるミッションだけを
 * 対象にしているため、イベントのチェックインや公式LINEの友だち追加のような
 * 一度きりのミッションが一覧に出てこなかった。こちらは種別を問わず全部返す。
 */
export async function getUserAchievedMissions(
  userId: string,
  seasonId?: string,
): Promise<AchievedMission[]> {
  const supabase = createClient();

  let query = supabase
    .from("achievements")
    .select(`
      mission_id,
      created_at,
      missions!inner (
        id,
        slug,
        title,
        is_hidden
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (seasonId) {
    query = query.eq("season_id", seasonId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("達成したミッションの取得に失敗:", error);
    return [];
  }

  const byMission = new Map<string, AchievedMission>();
  for (const row of data ?? []) {
    const mission = row.missions as unknown as {
      id: string;
      slug: string;
      title: string;
      is_hidden: boolean | null;
    } | null;
    if (!mission) continue;

    const existing = byMission.get(mission.id);
    if (existing) {
      existing.count += 1;
      continue;
    }
    // created_at の降順で読んでいるので、最初に出会ったものが最新
    byMission.set(mission.id, {
      missionId: mission.id,
      slug: mission.slug,
      title: mission.title,
      isHidden: mission.is_hidden ?? false,
      count: 1,
      achievedAt: row.created_at,
    });
  }

  return Array.from(byMission.values());
}
