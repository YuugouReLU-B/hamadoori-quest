const DAY_IN_MS = 24 * 60 * 60 * 1000;

type MissionPeriod = {
  event_date: string | null;
  event_end_date: string | null;
};

/**
 * 開催が終わったクエストかどうか。
 *
 * 終了日があればそれを、無ければ開催日を最終日とみなす。最終日は「その日を含む」
 * ので、境界は日本時間の翌日0時。DATE型の値を日本時間の日付として扱う実装を
 * この関数に閉じ込め、呼び出し側で日付比較を複製しないようにする
 * （抽選の eligibility.ts と同じ流儀）。
 *
 * 開催日を持たない常設クエストは終わらないので常に false。
 */
export function hasEventEnded(
  mission: MissionPeriod,
  now: Date = new Date(),
): boolean {
  const lastDay = mission.event_end_date ?? mission.event_date;
  if (!lastDay) return false;

  const endsAt = new Date(`${lastDay}T00:00:00+09:00`).getTime() + DAY_IN_MS;
  return now.getTime() >= endsAt;
}
