"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/features/analytics/utils/tracker";
import type { TaggedMission } from "@/features/missions/components/missions-tags";
import { cn } from "@/lib/utils/utils";
import Mission from "./mission-card";

type MissionsCalendarViewProps = {
  missions: TaggedMission[];
};

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

function toDateOnly(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.abs(
    Math.round(
      (Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) -
        Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) /
        msPerDay,
    ),
  );
}

/**
 * ミッション一覧のカレンダーモード（特設クエスト向け）。
 *
 * 日付を選ぶとその日のミッションが一覧の一番上に来る。選んでいなければ
 * 今日から「近い順」に並べる。開催日を持たないミッションは対象外。
 */
export function MissionsCalendarView({ missions }: MissionsCalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const datedMissions = useMemo(
    () => missions.filter((entry) => entry.mission.event_date),
    [missions],
  );

  const missionsByDay = useMemo(() => {
    const map = new Map<string, TaggedMission[]>();
    for (const entry of datedMissions) {
      if (!entry.mission.event_date) continue;
      const key = toDateOnly(entry.mission.event_date).toDateString();
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [datedMissions]);

  const eventDays = useMemo(
    () =>
      Array.from(missionsByDay.keys(), (key) => new Date(key)).sort(
        (a, b) => a.getTime() - b.getTime(),
      ),
    [missionsByDay],
  );
  const hasEventsInMonth = eventDays.some((day) =>
    isSameMonth(day, visibleMonth),
  );
  const nextEventDate = eventDays.find((day) => day > endOfMonth(visibleMonth));

  function changeMonth(month: Date) {
    setVisibleMonth(month);
    setSelectedDate(null);

    // 月の移動は「開催日でクエストを探す」操作なので絞り込みとして記録する。
    // その月にイベントがあるかも一緒に残すと、空振りしている月が分かる
    trackEvent("calendar_month_change", {
      props: {
        month: format(month, "yyyy-MM"),
        eventCount: eventDays.filter((day) => isSameMonth(day, month)).length,
      },
    });
  }

  const weeks = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(visibleMonth), {
      weekStartsOn: 1,
    });
    const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [visibleMonth]);

  const referenceDate = selectedDate ?? today;

  const sortedMissions = useMemo(() => {
    return [...datedMissions].sort((a, b) => {
      if (!a.mission.event_date) return 1;
      if (!b.mission.event_date) return -1;
      return (
        daysBetween(toDateOnly(a.mission.event_date), referenceDate) -
        daysBetween(toDateOnly(b.mission.event_date), referenceDate)
      );
    });
  }, [datedMissions, referenceDate]);

  const selectedMissions = selectedDate
    ? (missionsByDay.get(selectedDate.toDateString()) ?? [])
    : [];
  const otherMissions = selectedDate
    ? sortedMissions.filter(
        (entry) =>
          entry.mission.event_date &&
          !isSameDay(toDateOnly(entry.mission.event_date), selectedDate),
      )
    : sortedMissions;
  const selectedHeading = selectedDate
    ? `${format(selectedDate, "yyyy年M月d日（E）", { locale: ja })}の開催 ${selectedMissions.length}件`
    : "";

  function renderMissions(entries: TaggedMission[]) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {entries.map(({ mission, userAchievementCount }) => (
          <Mission
            key={mission.id}
            mission={mission}
            userAchievementCount={userAchievementCount}
          />
        ))}
      </div>
    );
  }

  if (datedMissions.length === 0) {
    return (
      <p className="py-12 text-center text-gray-500">
        開催日が設定された特設クエストがありません
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-300 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-lg font-bold" aria-live="polite">
            {format(visibleMonth, "yyyy年M月", { locale: ja })}
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => changeMonth(subMonths(visibleMonth, 1))}
              aria-label="前の月"
              data-analytics-id="calendar-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => changeMonth(addMonths(visibleMonth, 1))}
              aria-label="次の月"
              data-analytics-id="calendar-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!hasEventsInMonth && (
          <div className="space-y-2 border-t border-gray-200 bg-yellow-50 px-4 py-4 text-center">
            <p className="font-bold">
              {isSameMonth(visibleMonth, today)
                ? "今月の開催なし"
                : "この月の開催なし"}
            </p>
            {nextEventDate ? (
              <Button
                type="button"
                className="h-auto max-w-full flex-wrap rounded-full"
                onClick={() => {
                  setVisibleMonth(startOfMonth(nextEventDate));
                  setSelectedDate(nextEventDate);
                  // 「次の開催日へ」は、月送りとは別の探し方として区別する
                  trackEvent("calendar_jump_to_next_event", {
                    props: { month: format(nextEventDate, "yyyy-MM") },
                  });
                }}
                data-analytics-id="calendar-jump-next-event"
              >
                <span>次の開催日へ</span>
                <span>
                  {format(nextEventDate, "yyyy年M月d日", { locale: ja })}
                </span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <p className="text-sm text-gray-600">
                この月より後の開催予定はありません
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-7 bg-yellow-300 text-center text-xs font-bold">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1.5">
              {label}
            </div>
          ))}
        </div>

        <div>
          {weeks.map((week) => (
            <div
              key={week[0].toISOString()}
              className="grid grid-cols-7 border-t border-gray-200"
            >
              {week.map((day) => {
                const inMonth = isSameMonth(day, visibleMonth);
                const dayMissions = missionsByDay.get(day.toDateString()) ?? [];
                const isSelected = selectedDate
                  ? isSameDay(day, selectedDate)
                  : false;

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={!inMonth || dayMissions.length === 0}
                    onClick={() => setSelectedDate(day)}
                    aria-label={`${format(day, "yyyy年M月d日（E）", { locale: ja })}、${dayMissions.length}件の開催`}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex min-h-16 min-w-0 flex-col items-end gap-1 border-r border-gray-200 p-1 text-right last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary md:min-h-20",
                      !inMonth && "bg-gray-50",
                      isSelected &&
                        "bg-yellow-50 ring-2 ring-inset ring-primary",
                      dayMissions.length > 0 && inMonth && "cursor-pointer",
                    )}
                  >
                    <span
                      className={cn(
                        "rounded px-1 text-xs",
                        !inMonth ? "text-gray-300" : "text-gray-700",
                        isSameDay(day, today) &&
                          inMonth &&
                          "bg-orange-100 font-bold text-gray-900",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {inMonth && dayMissions.length > 0 && (
                      <>
                        <span className="max-w-full self-center rounded bg-primary px-1 py-0.5 text-[10px] font-bold text-primary-foreground md:hidden">
                          {dayMissions.length}件
                        </span>
                        <span className="hidden w-full min-w-0 flex-col gap-0.5 md:flex">
                          {dayMissions.slice(0, 2).map((entry) => (
                            <span
                              key={entry.mission.id}
                              className="w-full truncate rounded bg-primary px-1 py-0.5 text-left text-[10px] font-bold text-primary-foreground"
                            >
                              {entry.mission.title}
                            </span>
                          ))}
                          {dayMissions.length > 2 && (
                            <span className="text-left text-[10px] text-gray-500">
                              他{dayMissions.length - 2}件
                            </span>
                          )}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-gray-600">
        {selectedDate
          ? "選択日の開催を先に、その他の日程は選択日から近い順に表示しています"
          : "今日から近い順に並んでいます"}
        <span className="mt-1 block">
          日付を選ぶと、その日の開催を下の一覧で確認できます
        </span>
      </p>

      {selectedDate ? (
        <>
          <section aria-label={selectedHeading} className="space-y-4">
            <h3 className="text-lg font-bold" aria-live="polite">
              {selectedHeading}
            </h3>
            {selectedMissions.length > 0 ? (
              renderMissions(selectedMissions)
            ) : (
              <p className="text-sm text-gray-600">この日の開催はありません</p>
            )}
          </section>
          {otherMissions.length > 0 && (
            <section
              aria-label={`その他の日程 ${otherMissions.length}件`}
              className="space-y-4 border-t border-gray-200 pt-6"
            >
              <h3 className="text-lg font-bold">
                その他の日程 {otherMissions.length}件
              </h3>
              {renderMissions(otherMissions)}
            </section>
          )}
        </>
      ) : (
        renderMissions(sortedMissions)
      )}
    </div>
  );
}
