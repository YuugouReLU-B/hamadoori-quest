import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { AchievedMission } from "@/features/user-achievements/services/achievements";
import { dateFormatter } from "@/lib/utils/date-formatters";
import { cn } from "@/lib/utils/utils";

type AchievedMissionListProps = {
  missions: AchievedMission[];
};

/**
 * 達成したミッションの一覧。新しい順。
 *
 * イベントのチェックインがここに並ぶので、いつどこに行ったかが残る。
 */
export function AchievedMissionList({ missions }: AchievedMissionListProps) {
  if (missions.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        まだ達成したクエストはありません。
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {missions.map((mission) => {
        // 非公開クエストの詳細ページは notFound() になる
        // （app/missions/[slug]/page.tsx）。紹介された側の達成のように
        // 自動達成で is_hidden なものはリンクにせず、ホバーの演出も外して
        // 押せないことが分かるようにする。表示内容は同じ。
        const card = (
          <Card
            className={cn(
              "flex items-center justify-between gap-4 border-gray-300 p-4",
              !mission.isHidden && "transition-shadow hover:shadow-md",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-800">
                {mission.title}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {dateFormatter(new Date(mission.achievedAt))}
                {mission.count > 1 && `（${mission.count}回）`}
              </p>
            </div>
          </Card>
        );

        return (
          <li key={mission.missionId}>
            {mission.isHidden ? (
              card
            ) : (
              <Link href={`/missions/${mission.slug}`}>{card}</Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
