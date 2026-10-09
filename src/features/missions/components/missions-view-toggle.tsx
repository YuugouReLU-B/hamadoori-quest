"use client";

import { Calendar as CalendarIcon, List, Map as MapIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { MissionsCalendarView } from "@/features/missions/components/missions-calendar-view";
import { MissionsMapView } from "@/features/missions/components/missions-map-view";
import type { TaggedMission } from "@/features/missions/components/missions-tags";

type ViewMode = "list" | "map" | "calendar";

type MissionsViewToggleProps = {
  /** クエストカテゴリ別の横スクロール一覧 */
  children: ReactNode;
  /** 地図モードで表示する、座標を持つミッションの一覧 */
  mapMissions: TaggedMission[];
  /** カレンダーモードで表示する、開催日を持つ特設クエストの一覧 */
  calendarMissions: TaggedMission[];
};

export function MissionsViewToggle({
  children,
  mapMissions,
  calendarMissions,
}: MissionsViewToggleProps) {
  const [view, setView] = useState<ViewMode>("list");
  const showToggle = mapMissions.length > 0 || calendarMissions.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-center text-2xl md:text-3xl my-5">クエスト</h2>
        {showToggle && (
          // 幅が足りないときはアイコンを消して1段に収める。しきい値を rem で書いているので
          // 端末の文字サイズを大きくしているときも、それに合わせてアイコンが消える。
          // アイコンを消しても入らない極端な条件では、2段にせず横にスクロールさせる
          <div className="@container flex justify-center px-4 md:px-10">
            <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-gray-200 bg-white p-1">
              <Button
                type="button"
                size="sm"
                variant={view === "list" ? "default" : "ghost"}
                className="rounded-md px-3 sm:px-4"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                data-analytics-id="missions-view-list"
              >
                <List
                  className="mr-1 hidden h-4 w-4 @min-[17.5rem]:inline-block"
                  aria-hidden="true"
                />
                一覧
              </Button>
              {mapMissions.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant={view === "map" ? "default" : "ghost"}
                  className="rounded-md px-3 sm:px-4"
                  onClick={() => setView("map")}
                  aria-pressed={view === "map"}
                  data-analytics-id="missions-view-map"
                >
                  <MapIcon
                    className="mr-1 hidden h-4 w-4 @min-[17.5rem]:inline-block"
                    aria-hidden="true"
                  />
                  地図
                </Button>
              )}
              {calendarMissions.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant={view === "calendar" ? "default" : "ghost"}
                  className="rounded-md px-3 sm:px-4"
                  onClick={() => setView("calendar")}
                  aria-pressed={view === "calendar"}
                  data-analytics-id="missions-view-calendar"
                >
                  <CalendarIcon
                    className="mr-1 hidden h-4 w-4 @min-[17.5rem]:inline-block"
                    aria-hidden="true"
                  />
                  カレンダー
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {view === "list" && children}

      {view === "map" && (
        <div className="w-full md:container md:mx-auto px-4">
          <MissionsMapView missions={mapMissions} />
        </div>
      )}

      {view === "calendar" && (
        <div className="w-full md:container md:mx-auto px-4">
          <MissionsCalendarView missions={calendarMissions} />
        </div>
      )}
    </div>
  );
}
