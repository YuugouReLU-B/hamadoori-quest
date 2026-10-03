"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/features/analytics/utils/tracker";
import type { TaggedMission } from "@/features/missions/components/missions-tags";
import { layoutWeek } from "@/features/missions/utils/calendar-week-layout";
import { cn } from "@/lib/utils/utils";
import Mission from "./mission-card";

type MissionsCalendarViewProps = {
  missions: TaggedMission[];
};

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

/** PCのマスに出す帯の段数。収まらない分は「他N件」にまとめる */
const MAX_LANES = 2;

function toDateOnly(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

type EventDates = {
  event_date: string | null;
  event_end_date: string | null;
};

/**
 * 開催期間を日付だけに正規化する。終了日が開始日より前という不正データが
 * 入り得るので、そのときは開始日だけの1日扱いにする
 */
function eventRange(mission: EventDates): { start: Date; end: Date } | null {
  if (!mission.event_date) return null;
  const start = toDateOnly(mission.event_date);
  const end = toDateOnly(mission.event_end_date ?? mission.event_date);
  return { start, end: end < start ? start : end };
}

function coversDate(mission: EventDates, date: Date): boolean {
  const range = eventRange(mission);
  return range !== null && date >= range.start && date <= range.end;
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

/** 期間中なら0、期間外なら近い端までの日数。開催中の長期イベントを下に沈めない */
function daysToEvent(mission: EventDates, date: Date): number {
  const range = eventRange(mission);
  if (!range) return Number.MAX_SAFE_INTEGER;
  if (date >= range.start && date <= range.end) return 0;
  return Math.min(daysBetween(range.start, date), daysBetween(range.end, date));
}

/**
 * ミッション一覧のカレンダーモード（特設クエスト向け）。
 *
 * 日付を選ぶとその日のミッションが一覧の一番上に来る。選んでいなければ
 * 今日から「近い順」に並べる。開催日を持たないミッションは対象外。
 */
export function MissionsCalendarView({ missions }: MissionsCalendarViewProps) {
  // 開催期間の内外判定に使うので時刻を落としておく
  const today = useMemo(() => startOfDay(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // カレンダーの外を触ったら選択を解除する。月送りはカード内なので影響しない。
  // クエスト一覧も外す。解除すると一覧が並び替わってカードが動き、押そうとした
  // 「詳細を見る」のクリックが成立しなくなるため
  useEffect(() => {
    if (!selectedDate) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (calendarRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setSelectedDate(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [selectedDate]);

  const datedMissions = useMemo(
    () => missions.filter((entry) => entry.mission.event_date),
    [missions],
  );

  const calendarItems = useMemo(
    () =>
      datedMissions.flatMap((entry) => {
        const range = eventRange(entry.mission);
        return range ? [{ item: entry, ...range }] : [];
      }),
    [datedMissions],
  );

  const missionsByDay = useMemo(() => {
    const map = new Map<string, TaggedMission[]>();
    for (const { item, start, end } of calendarItems) {
      // 複数日にまたがるイベントは開始日から終了日までの全マスに立てる
      for (const day of eachDayOfInterval({ start, end })) {
        const key = day.toDateString();
        const list = map.get(key) ?? [];
        list.push(item);
        map.set(key, list);
      }
    }
    return map;
  }, [calendarItems]);

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
    return [...datedMissions].sort(
      (a, b) =>
        daysToEvent(a.mission, referenceDate) -
        daysToEvent(b.mission, referenceDate),
    );
  }, [datedMissions, referenceDate]);

  const selectedMissions = selectedDate
    ? (missionsByDay.get(selectedDate.toDateString()) ?? [])
    : [];
  const otherMissions = selectedDate
    ? sortedMissions.filter((entry) => !coversDate(entry.mission, selectedDate))
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
      <div
        ref={calendarRef}
        className="mx-auto max-w-2xl rounded-xl border border-gray-300 overflow-hidden"
      >
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
          {weeks.map((week) => {
            const { segments, overflowByCol } = layoutWeek(
              week,
              calendarItems,
              visibleMonth,
              MAX_LANES,
            );

            return (
              // 1行目は日付、続く段がイベントの帯と「他N件」。日付のマスは全段を
              // 貫く背景として敷き、帯はその上に列をまたいで重ねる
              <div
                key={week[0].toISOString()}
                className="grid min-h-16 grid-cols-7 grid-rows-[1.5rem_repeat(3,auto)_minmax(0.25rem,1fr)] border-t border-gray-200 md:min-h-20"
              >
                {week.map((day, col) => {
                  const inMonth = isSameMonth(day, visibleMonth);
                  const dayMissions =
                    missionsByDay.get(day.toDateString()) ?? [];
                  const isSelected = selectedDate
                    ? isSameDay(day, selectedDate)
                    : false;

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={!inMonth || dayMissions.length === 0}
                      onClick={() =>
                        setSelectedDate((prev) =>
                          prev && isSameDay(prev, day) ? null : day,
                        )
                      }
                      aria-label={`${format(day, "yyyy年M月d日（E）", { locale: ja })}、${dayMissions.length}件の開催`}
                      aria-pressed={isSelected}
                      style={{ gridColumn: col + 1 }}
                      className={cn(
                        "row-span-full flex min-w-0 flex-col items-end gap-1 border-gray-200 p-1 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                        col < week.length - 1 && "border-r",
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
                        <span className="max-w-full self-center rounded bg-primary px-1 py-0.5 text-[10px] font-bold text-primary-foreground md:hidden">
                          {dayMissions.length}件
                        </span>
                      )}
                    </button>
                  );
                })}
                {/* 件数はマスのaria-labelで伝えているので、帯は見た目だけ。
                    クリックは下のマスに通す */}
                {segments.map((segment) => (
                  <span
                    key={segment.item.mission.id}
                    aria-hidden="true"
                    data-testid="calendar-event-bar"
                    style={{
                      gridColumn: `${segment.startCol + 1} / span ${segment.span}`,
                      gridRow: segment.lane + 2,
                    }}
                    className={cn(
                      "pointer-events-none mb-0.5 hidden min-w-0 truncate bg-primary px-1 py-0.5 text-left text-[10px] font-bold text-primary-foreground md:block",
                      // 週や月をまたいで続く側は角を落とし、マスの端まで伸ばす
                      !segment.continuesBefore && "ml-1 rounded-l",
                      !segment.continuesAfter && "mr-1 rounded-r",
                    )}
                  >
                    {segment.item.mission.title}
                  </span>
                ))}
                {overflowByCol.map(
                  (count, col) =>
                    count > 0 && (
                      <span
                        key={week[col].toISOString()}
                        aria-hidden="true"
                        style={{ gridColumn: col + 1, gridRow: MAX_LANES + 2 }}
                        className="pointer-events-none hidden min-w-0 truncate px-2 text-left text-[10px] text-gray-500 md:block"
                      >
                        他{count}件
                      </span>
                    ),
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div ref={listRef} className="space-y-6">
        {selectedDate ? (
          <>
            <section aria-label={selectedHeading} className="space-y-4">
              <h3 className="text-lg font-bold" aria-live="polite">
                {selectedHeading}
              </h3>
              {selectedMissions.length > 0 ? (
                renderMissions(selectedMissions)
              ) : (
                <p className="text-sm text-gray-600">
                  この日の開催はありません
                </p>
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
    </div>
  );
}
