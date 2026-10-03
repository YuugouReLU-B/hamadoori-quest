import { differenceInCalendarDays, isSameMonth } from "date-fns";

export type CalendarItem<T> = {
  item: T;
  /** 時刻を落とした開催初日 */
  start: Date;
  /** 時刻を落とした開催最終日（その日を含む） */
  end: Date;
};

export type WeekSegment<T> = {
  item: T;
  /** 週内の開始列（0始まり） */
  startCol: number;
  /** 何日分つなげるか */
  span: number;
  /** 上から何段目か（0始まり） */
  lane: number;
  /** この帯より前（前の週・前の月）から続いている */
  continuesBefore: boolean;
  /** この帯より後（次の週・次の月）へ続く */
  continuesAfter: boolean;
};

export type WeekLayout<T> = {
  /** 表示できる段に収まった帯 */
  segments: WeekSegment<T>[];
  /** 列ごとの、段に収まらなかった件数 */
  overflowByCol: number[];
};

/**
 * 1週間ぶんのイベントを、連続する日をつないだ帯に並べる。
 *
 * 帯は表示月の中だけに引く（月外のマスは選べないので、帯も出さない）。
 * 前の週から続いている帯と長い帯を先に上の段へ置き、重なるものは下の段へ送る。
 * `maxLanes` に収まらない帯は捨て、その日ごとの件数だけ返す。
 */
export function layoutWeek<T>(
  week: Date[],
  items: CalendarItem<T>[],
  visibleMonth: Date,
  maxLanes: number,
): WeekLayout<T> {
  const overflowByCol = week.map(() => 0);
  const inMonthDays = week.filter((day) => isSameMonth(day, visibleMonth));
  if (inMonthDays.length === 0) return { segments: [], overflowByCol };

  const weekStart = inMonthDays[0];
  const weekEnd = inMonthDays[inMonthDays.length - 1];

  const clipped = items
    .filter(({ start, end }) => start <= weekEnd && end >= weekStart)
    .map(({ item, start, end }) => {
      const from = start < weekStart ? weekStart : start;
      const to = end > weekEnd ? weekEnd : end;
      return {
        item,
        startCol: differenceInCalendarDays(from, week[0]),
        span: differenceInCalendarDays(to, from) + 1,
        continuesBefore: start < weekStart,
        continuesAfter: end > weekEnd,
      };
    })
    // sortは安定なので、同じ位置・同じ長さなら渡された順を保つ
    .sort((a, b) => a.startCol - b.startCol || b.span - a.span);

  const segments: WeekSegment<T>[] = [];
  // 段ごとの「最後に埋まっている列」
  const laneEnds: number[] = [];
  for (const segment of clipped) {
    let lane = laneEnds.findIndex((endCol) => endCol < segment.startCol);
    if (lane === -1) lane = laneEnds.length;
    const endCol = segment.startCol + segment.span - 1;
    laneEnds[lane] = endCol;

    if (lane < maxLanes) {
      segments.push({ ...segment, lane });
    } else {
      for (let col = segment.startCol; col <= endCol; col++) {
        overflowByCol[col] += 1;
      }
    }
  }

  return { segments, overflowByCol };
}
