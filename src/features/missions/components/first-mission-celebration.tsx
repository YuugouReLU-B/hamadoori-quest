import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { LotteryProgressBar } from "@/features/lottery/components/lottery-progress-bar";
import { QuestClearPanel } from "@/features/mission-detail/components/quest-clear-panel";
import { HorizontalScrollContainer } from "@/features/missions/components/horizontal-scroll-container";
import Mission from "@/features/missions/components/mission-card";
import { MissionIcon } from "@/features/missions/components/mission-icon";
import type { RecommendedMission } from "@/features/missions/services/first-mission-recommendations";
import type { Tables } from "@/lib/types/supabase";

type FirstMissionCelebrationProps = {
  mission: Pick<Tables<"missions">, "title" | "icon_url" | "points">;
  totalPoints: number;
  events: RecommendedMission[];
  spots: RecommendedMission[];
};

function RecommendationList({
  title,
  missions,
}: {
  title: string;
  missions: RecommendedMission[];
}) {
  if (missions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      <HorizontalScrollContainer>
        <div className="flex w-fit gap-4 pb-2 pt-2">
          {missions.map((mission) => (
            <div key={mission.id} className="w-[260px] shrink-0">
              <Mission mission={mission} userAchievementCount={0} />
            </div>
          ))}
        </div>
      </HorizontalScrollContainer>
    </div>
  );
}

export function FirstMissionCelebration({
  mission,
  totalPoints,
  events,
  spots,
}: FirstMissionCelebrationProps) {
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div className="flex w-full items-center gap-3 rounded-xl border bg-gray-50 p-4 text-left">
        {mission.icon_url && (
          <MissionIcon src={mission.icon_url} alt="" size="sm" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500">達成したクエスト</p>
          <p className="truncate font-bold text-gray-900">{mission.title}</p>
        </div>
        <span className="shrink-0 text-xs font-bold text-emerald-600">
          ✓ 達成
        </span>
      </div>

      <QuestClearPanel
        heading="初回クエストクリア！"
        earnedPoints={mission.points}
        totalPoints={totalPoints}
        note="浜通りでの一歩が、ポイントになりました。"
        showConfetti
      />

      <LotteryProgressBar />

      {(events.length > 0 || spots.length > 0) && (
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-gray-900">
            次は、どこに行ってみる？
          </h2>
          <RecommendationList title="開催が近いイベント" missions={events} />
          <RecommendationList title="おすすめのスポット" missions={spots} />
          <Link
            href="/#missions"
            className="flex items-center justify-center gap-1 rounded-full bg-yellow-300 py-3 text-sm font-bold text-gray-900 transition-colors hover:bg-yellow-400"
          >
            他のクエストを探す
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      )}
    </div>
  );
}
