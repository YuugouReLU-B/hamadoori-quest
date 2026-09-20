"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MissionIcon } from "@/features/missions/components/mission-icon";
import { getMissionRegionLabel } from "@/features/missions/constants/mission-regions";
import { getEventCategoryIcon } from "@/features/missions/constants/quest-categories";
import { calculateMissionXp } from "@/features/user-level/utils/level-calculator";
import {
  POSTER_POINTS_PER_UNIT,
  POSTING_POINTS_PER_UNIT,
} from "@/lib/constants/mission-config";
import type { Tables } from "@/lib/types/supabase";
import { cn } from "@/lib/utils/utils";

interface MissionProps {
  mission: Tables<"missions">;
  userAchievementCount: number;
}

export default function Mission({
  mission,
  userAchievementCount,
}: MissionProps) {
  // 最大達成回数が設定されている場合、ユーザーの達成回数が最大に達しているかどうかを確認
  const hasReachedMaxAchievements =
    mission.max_achievement_count !== null &&
    userAchievementCount >= (mission.max_achievement_count || 0);

  const iconUrl =
    mission.icon_url || getEventCategoryIcon(mission.event_category);

  // regionが未設定の既存ミッションはtag1を地域チップとして流用する
  const regionLabel = getMissionRegionLabel(mission.region) ?? mission.tag1;

  // 遷移操作とは分けて表示する報酬
  const pointsLabel =
    mission.required_artifact_type === "POSTER"
      ? `1枚あたり${POSTER_POINTS_PER_UNIT}P`
      : mission.required_artifact_type === "POSTING"
        ? `1枚あたり${POSTING_POINTS_PER_UNIT}P`
        : `${calculateMissionXp({ points: mission.points })}P`;

  // 日付の整形
  const eventDate = mission.event_date ? new Date(mission.event_date) : null;
  const dateStr = eventDate
    ? `${eventDate.getMonth() + 1}月${eventDate.getDate()}日（${["日", "月", "火", "水", "木", "金", "土"][eventDate.getDay()]}）開催`
    : null;

  const missionKey = mission.slug || mission.id;

  return (
    // data-analytics-* は計測用。どのクエストがどれだけ見られたかを
    // 画面内の表示時間で測るために付けている（features/analytics）
    <article
      data-analytics-content="mission"
      data-analytics-content-id={missionKey}
      data-analytics-content-label={mission.title}
    >
      <Card className="@container/card">
        <CardHeader className="relative pl-1">
          <div className="flex items-center gap-1">
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="w-32 h-32 rounded-full p-1">
                <div className="flex items-center justify-center w-full h-full rounded-full bg-white">
                  <MissionIcon src={iconUrl} alt={mission.title} size="lg" />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <CardTitle className="text-lg leading-tight min-h-[4.25rem] flex items-center text-gray-900">
                <span className="line-clamp-3">{mission.title}</span>
              </CardTitle>
              {dateStr && (
                <div className="mt-2 text-sm font-medium text-gray-600">
                  {dateStr}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardFooter className="flex flex-col items-stretch gap-3">
          {(regionLabel || mission.tag2) && (
            <div className="flex flex-wrap items-center gap-2">
              {regionLabel && (
                <Badge variant="outline" className="text-xs px-2">
                  <MapPin size={14} className="mr-1" />
                  <span className="text-sm font-medium text-gray-700">
                    {regionLabel}
                  </span>
                </Badge>
              )}
              {mission.tag2 && (
                <Badge variant="outline" className="text-xs px-2">
                  <span className="text-sm font-medium text-gray-700">
                    {mission.tag2}
                  </span>
                </Badge>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge
              variant="outline"
              className="px-3 py-1 text-sm font-bold text-gray-700"
            >
              {pointsLabel}
            </Badge>
            {hasReachedMaxAchievements && (
              <Badge variant="outline" className="bg-gray-100 text-gray-700">
                クリア済み
              </Badge>
            )}
          </div>
          <Link
            href={`/missions/${missionKey}`}
            data-analytics-id="mission-card-detail"
            className={cn(
              buttonVariants({ variant: "default" }),
              "w-full rounded-full py-6 text-base font-bold text-primary-foreground border-none transition-[color,background-color,transform] active:scale-95 motion-reduce:transform-none motion-reduce:transition-none",
              hasReachedMaxAchievements
                ? "bg-gray-300 hover:bg-gray-300/90 text-gray-700"
                : userAchievementCount === 0
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-yellow-300 hover:bg-yellow-300/90 text-black",
            )}
          >
            詳細を見る
          </Link>
        </CardFooter>
      </Card>
    </article>
  );
}
