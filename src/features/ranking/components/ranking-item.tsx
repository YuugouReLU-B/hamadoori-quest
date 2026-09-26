import Link from "next/link";
// TOPページ用のランキングコンポーネント
import { UserName } from "@/components/common/user-name";
import { Badge } from "@/components/ui/badge";
import { formatPoints } from "@/lib/utils/format-points";
import type { UserMissionRanking, UserRanking } from "../types/ranking-types";
import { getRankIcon } from "./ranking-icon";

interface RankingItemProps {
  user: UserRanking;
  userWithMission?: UserMissionRanking;
  showDetailedInfo?: boolean; // フル版では詳細情報を表示
  mission?: {
    id: string;
    name: string;
  };
  badgeText?: string;
}

export function RankingItem({
  user,
  userWithMission,
  showDetailedInfo = false,
  mission,
  badgeText,
}: RankingItemProps) {
  return (
    <Link
      href={`/users/${user.user_id}`}
      className="grid grid-cols-subgrid col-span-full items-center gap-4 py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
    >
      {getRankIcon(user.rank ?? 0)}
      <div className="min-w-0 pl-1">
        <UserName name={user.name ?? ""} nameClassName="font-bold text-lg" />
        {/* 都道府県は表示しない。浜通り向けでは意味が薄いうえ、
            未選択の人が北海道として並んでしまっていた */}
        {showDetailedInfo && (
          <div className="text-xs text-gray-500 mt-1">ID: {user.user_id}</div>
        )}
      </div>
      {/* ミッション別ランキングの場合はポイントと達成回数を表示 */}
      {mission ? (
        <>
          <span className="text-sm text-gray-600 font-bold justify-self-end">
            {badgeText}
          </span>
          <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full w-fit justify-self-end font-bold">
            {formatPoints(userWithMission?.total_points)}
          </Badge>
        </>
      ) : (
        <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full w-fit justify-self-end font-bold">
          {formatPoints(user.xp)}
        </Badge>
      )}
    </Link>
  );
}
