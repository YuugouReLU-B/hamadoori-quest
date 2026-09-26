"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import MissionAchievementStatus from "@/features/missions/components/mission-achievement-status";
import { MissionIcon } from "@/features/missions/components/mission-icon";
import { calculateMissionXp } from "@/features/user-level/utils/level-calculator";
import type { Tables } from "@/lib/types/supabase";
import { formatPoints } from "@/lib/utils/format-points";

interface OnboardingMissionCardProps {
  mission: Omit<Tables<"missions">, "slug">;
  userAchievementCount?: number;
  onCardClick?: () => void;
}

export default function OnboardingMissionCard({
  mission,
  userAchievementCount = 0,
  onCardClick,
}: OnboardingMissionCardProps) {
  // 最大達成回数が設定されている場合、ユーザーの達成回数が最大に達しているかどうかを確認
  const hasReachedMaxAchievements =
    mission.max_achievement_count !== null &&
    userAchievementCount >= (mission.max_achievement_count || 0);

  const iconUrl = mission.icon_url ?? "/img/mission_fallback.svg";

  // 日付の整形
  const eventDate = mission.event_date ? new Date(mission.event_date) : null;
  const dateStr = eventDate
    ? `${eventDate.getMonth() + 1}月${eventDate.getDate()}日（${["日", "月", "火", "水", "木", "金", "土"][eventDate.getDay()]}）開催`
    : null;

  return (
    <Card className="@container/card">
      <CardHeader className="relative">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full p-[3px]">
              <div className="flex items-center justify-center w-full h-full rounded-full bg-white">
                <MissionIcon src={iconUrl} alt={mission.title} size="md" />
              </div>
            </div>
            <MissionAchievementStatus
              hasReachedMaxAchievements={hasReachedMaxAchievements}
            />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight mb-2 text-gray-900">
              {mission.title}
            </CardTitle>
            {dateStr && (
              <div className="text-sm font-medium text-gray-600">{dateStr}</div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardFooter className="flex flex-col items-stretch gap-6">
        <div className="flex flex-col items-start gap-1.5">
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700">
              獲得ポイント：
              {mission.required_artifact_type === "POSTER" ||
              mission.required_artifact_type === "POSTING"
                ? "-"
                : formatPoints(calculateMissionXp({ points: mission.points }))}
            </span>
          </div>
        </div>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="default"
            className={clsx(
              "w-full rounded-full py-6 text-base font-bold text-white",
              hasReachedMaxAchievements
                ? "bg-yellow-300 hover:bg-yellow-300/90 text-black"
                : userAchievementCount === 0
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-yellow-300 hover:bg-yellow-300/90 text-black",
            )}
            onClick={onCardClick}
          >
            {hasReachedMaxAchievements
              ? "完了しました"
              : userAchievementCount === 0
                ? "チャレンジ"
                : "再チャレンジ"}
          </Button>
        </motion.div>
      </CardFooter>
    </Card>
  );
}
