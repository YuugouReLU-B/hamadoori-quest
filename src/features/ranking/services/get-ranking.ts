import "server-only";

import { getCurrentSeasonId } from "@/lib/services/seasons";
import { createAdminClient } from "@/lib/supabase/adminClient";
import type { RankingPeriod, UserRanking } from "../types/ranking-types";
import {
  dateFilterToISOString,
  getPeriodDateFilter,
} from "../utils/period-utils";

export interface UserPeriodRanking {
  user_id: string;
  address_prefecture: string | null;
  name: string;
  rank: number;
  updated_at: string | null;
  xp: number;
}

/**
 * 現在のユーザーの期間別ランキング情報を取得
 */
export async function getUserPeriodRanking(
  userId: string,
  seasonId: string,
  period: RankingPeriod = "all",
): Promise<UserPeriodRanking | null> {
  const supabase = await createAdminClient();

  // 期間フィルター計算
  const dateFilter = getPeriodDateFilter(period);

  const { data, error } = await supabase.rpc("get_user_period_ranking", {
    target_user_id: userId,
    start_date: dateFilterToISOString(dateFilter),
    p_season_id: seasonId,
  });

  if (error) {
    console.error("Error fetching user period ranking:", error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // パーティメンバーシップ情報を取得

  return {
    user_id: data[0].user_id,
    address_prefecture: data[0].address_prefecture,
    name: data[0].name,
    rank: data[0].rank,
    updated_at: data[0].updated_at,
    xp: data[0].xp,
  };
}

export async function getRanking(
  limit = 10,
  period: RankingPeriod = "all",
  seasonId?: string,
): Promise<UserRanking[]> {
  try {
    const supabase = await createAdminClient();

    // seasonIdが指定されている場合はそれを使用、そうでなければ現在のシーズン
    const targetSeasonId = seasonId || (await getCurrentSeasonId());

    if (!targetSeasonId) {
      console.error("Target season not found");
      return [];
    }

    // 期間に応じた日付フィルタを設定
    const dateFilter = getPeriodDateFilter(period);

    // 指定されたシーズンのRPC関数を使用
    const { data: periodRankingData, error: rpcError } = await supabase.rpc(
      "get_period_ranking",
      {
        p_start_date: dateFilterToISOString(dateFilter),
        p_limit: limit,
        p_end_date: undefined,
        p_season_id: targetSeasonId, // 指定されたシーズンIDを使用
      },
    );

    if (rpcError) {
      console.error(
        `シーズンランキングの取得に失敗しました: ${rpcError.message}`,
        rpcError,
      );
      return [];
    }

    const rankings = periodRankingData || [];

    return rankings;
  } catch (error) {
    // ランキング取得の失敗でページ全体をクラッシュさせない
    // （RankingTopはエラーバウンダリなしでawaitされるため、ここで例外を吸収する）
    console.error("Ranking service error:", error);
    return [];
  }
}
