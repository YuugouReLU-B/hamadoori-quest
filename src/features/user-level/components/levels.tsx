import Link from "next/link";
import { UserName } from "@/components/common/user-name";
import { UserTopBadge } from "@/features/user-badges/components/user-top-badge";
import { getUserLevel } from "@/features/user-level/services/level";
import { getProfile } from "@/features/user-profile/services/profile";
import { POINT_UNIT } from "@/lib/utils/format-points";

interface LevelsProps {
  userId: string;
  clickable?: boolean;
  showBadge?: boolean;
  seasonId?: string;
  /** ニックネームを表示するか（デフォルトtrue） */
  showName?: boolean;
  /** 背景の白いカードを消し、文字だけにするか（デフォルトfalse） */
  transparent?: boolean;
}

// TODO: UserProfileCardにリネーム
export default async function Levels({
  userId,
  clickable = false,
  showBadge = false,
  seasonId,
  showName = true,
  transparent = false,
}: LevelsProps) {
  const profile = await getProfile(userId);

  if (!profile) {
    throw new Error("Private user data not found");
  }

  const userLevel = await getUserLevel(userId, seasonId);

  const cardContent = (
    <div
      className={`w-full flex flex-col items-stretch ${transparent ? "" : "bg-white rounded-md p-6"} ${clickable ? `${transparent ? "" : "hover:bg-gray-50 transition-colors"} max-w-lg` : "max-w-md"}`}
    >
      <div className="flex flex-col items-center min-w-0">
        <div className="text-3xl font-bold">
          現在{" "}
          <span
            className="text-6xl text-yellow-300"
            style={{ WebkitTextStroke: "1.5px black" }}
          >
            {userLevel ? userLevel.xp : 0}
          </span>
          {POINT_UNIT}
        </div>
      </div>
      {showName && (
        <div className="mt-2 flex justify-end min-w-0">
          <UserName name={profile.name} nameClassName="text-base font-bold" />
        </div>
      )}
      {showBadge && (
        <div className="mt-3">
          <UserTopBadge userId={userId} seasonId={seasonId} />
        </div>
      )}
    </div>
  );

  if (clickable) {
    return (
      <section className="flex justify-center py-6 px-4">
        <Link
          href={`/users/${userId}`}
          aria-label={`${profile.name}さんのプロフィールへ`}
          className="w-full max-w-xl flex justify-center"
        >
          {cardContent}
        </Link>
      </section>
    );
  }

  return (
    <section className="flex justify-center py-6 px-4">{cardContent}</section>
  );
}
