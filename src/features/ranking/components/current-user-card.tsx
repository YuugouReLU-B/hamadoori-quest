import { formatPoints } from "@/lib/utils/format-points";
import type { UserRanking } from "../types/ranking-types";
import { BaseCurrentUserCard } from "./base-current-user-card";

interface CurrentUserCardProps {
  currentUser: UserRanking | null;
}

export const CurrentUserCard: React.FC<CurrentUserCardProps> = ({
  currentUser,
}) => {
  if (!currentUser?.user_id) {
    return null;
  }

  const displayUser = {
    ...currentUser,
    xp: currentUser.xp || 0,
  };

  const userForCard = {
    user_id: currentUser.user_id,
    name: currentUser.name,
    address_prefecture: currentUser.address_prefecture,
    rank: currentUser.rank,
  };

  return (
    <BaseCurrentUserCard currentUser={userForCard}>
      <div className="text-lg font-bold">{formatPoints(displayUser.xp)}</div>
    </BaseCurrentUserCard>
  );
};
