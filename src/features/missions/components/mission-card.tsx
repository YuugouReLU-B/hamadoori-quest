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
import { formatPoints } from "@/lib/utils/format-points";
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
      ? `1枚あたり${formatPoints(POSTER_POINTS_PER_UNIT)}`
      : mission.required_artifact_type === "POSTING"
        ? `1枚あたり${formatPoints(POSTING_POINTS_PER_UNIT)}`
        : formatPoints(calculateMissionXp({ points: mission.points }));

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
      className="h-full"
      data-analytics-content="mission"
      data-analytics-content-id={missionKey}
      data-analytics-content-label={mission.title}
    >
      <Card className="@container/card h-full flex flex-col">
        <CardHeader className="relative p-5 pb-4">
          <div className="flex items-center gap-4">
            <MissionIcon
              src={iconUrl}
              alt={mission.title}
              size="lg"
              className="shrink-0 w-20 h-20"
            />
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <CardTitle className="text-base leading-normal text-gray-900 [word-break:auto-phrase]">
                <span className="line-clamp-3">{mission.title}</span>
              </CardTitle>
              {dateStr && (
                <div className="mt-1.5 text-sm text-gray-600">{dateStr}</div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardFooter className="mt-auto flex flex-col items-stretch gap-3 p-5 pt-0">
          {(regionLabel || mission.tag2) && (
            // タグは折り返さず横スクロールさせる。overscroll-x-contain でホイール/タッチの
            // スクロール連鎖を止め、mousedown をキャプチャ段階で止めることで
            // HorizontalScrollContainer 側のドラッグスクロールが始まらないようにしている
            <div
              data-testid="mission-card-tags"
              className="flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onMouseDownCapture={(event) => event.stopPropagation()}
            >
              {regionLabel && (
                <Badge variant="outline" className="shrink-0 text-xs px-2">
                  <MapPin size={14} className="mr-1" />
                  <span className="text-sm text-gray-700">{regionLabel}</span>
                </Badge>
              )}
              {mission.tag2 && (
                <Badge variant="outline" className="shrink-0 text-xs px-2">
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
              className="px-3 py-1 text-sm font-medium text-gray-800"
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
              "w-full h-11 text-sm font-medium text-primary-foreground border-none transition-[color,background-color,transform] active:scale-95 motion-reduce:transform-none motion-reduce:transition-none",
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
