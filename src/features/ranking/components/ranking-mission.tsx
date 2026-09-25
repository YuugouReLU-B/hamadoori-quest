import type { Tables } from "@/lib/types/supabase";
// TOPページ用のランキングコンポーネント
import {
  getMissionRanking,
  getTopUsersPostingCountByMission,
} from "../loaders/ranking-loaders";
import { BaseRanking } from "./base-ranking";
import { RankingItem } from "./ranking-item";

interface RankingTopProps {
  limit?: number;
  mission?: Tables<"missions">;
  isPostingMission?: boolean;
  seasonId?: string; // シーズン指定
}

export async function RankingMission({
  mission,
  limit = 10,
  isPostingMission,
  seasonId,
}: RankingTopProps) {
  if (!mission) {
    return null;
  }

  const rankings = await getMissionRanking(mission.id, limit, "all", seasonId);

  const rankingMap = new Map(rankings.map((item) => [item.user_id, item]));

  // ポスティングミッションの場合のみ、上位ユーザーの投稿数を取得
  const topUsersPostingCount =
    isPostingMission && rankings.length > 0
      ? await getTopUsersPostingCountByMission(
          rankings.map((user) => user.user_id ?? ""),
          mission.id,
          seasonId,
        )
      : [];

  const topUsersPostingCountMap = new Map(
    topUsersPostingCount.map((user) => [user.user_id, user.posting_count]),
  );

  const badgeText = (userId: string) => {
    const rankingItem = rankingMap.get(userId);
    const postingCount = topUsersPostingCountMap.get(userId);
    if (isPostingMission) {
      return `${(postingCount ?? 0).toLocaleString()}枚`;
    }
    return `${(rankingItem?.user_achievement_count ?? 0).toLocaleString()}回`;
  };

  const title = `「${mission.title}」トップ${limit}`;

  return (
    <BaseRanking title={title}>
      {rankings.map((user) => (
        <RankingItem
          key={user.user_id}
          user={user}
          userWithMission={user}
          mission={
            mission ? { id: mission.id, name: mission.title } : undefined
          }
          badgeText={badgeText(user.user_id || "")}
        />
      ))}
    </BaseRanking>
  );
}
