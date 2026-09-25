/** 抽選応募の表示状態。判定順序は closed → not_eligible → before_open → open。 */
export type LotteryState = "closed" | "not_eligible" | "before_open" | "open";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * 応募フォームの公開日前かどうか。
 *
 * DATE型の公開日は日本時間の0時を境界とする。未設定なら日付条件なしとみなし、
 * 常に false を返す。JST境界の実装をこの関数に閉じ込め、呼び出し側で日付比較を
 * 複製しないようにする。
 */
export function isBeforeOpenDate(
  eligibleDisplayFrom: string | null,
  now: Date = new Date(),
): boolean {
  if (eligibleDisplayFrom === null) return false;
  return (
    now.getTime() < new Date(`${eligibleDisplayFrom}T00:00:00+09:00`).getTime()
  );
}

/**
 * 応募受付の最終日を過ぎたかどうか。
 *
 * 終了日は「その日を含む」ため、日本時間の翌日0時が境界になる。未設定なら
 * 終了しない。
 */
function isAfterCloseDate(
  eligibleDisplayUntil: string | null,
  now: Date,
): boolean {
  if (eligibleDisplayUntil === null) return false;
  const closeAt =
    new Date(`${eligibleDisplayUntil}T00:00:00+09:00`).getTime() + DAY_IN_MS;
  return now.getTime() >= closeAt;
}

/**
 * ポイント条件と日付条件から、抽選応募の表示状態を求める。
 *
 * 応募期間が終了していればポイントの達成・未達成に関係なく closed を返す。
 */
export function getLotteryState(params: {
  points: number;
  thresholdPoints: number;
  eligibleDisplayFrom: string | null;
  eligibleDisplayUntil: string | null;
  now?: Date;
}): LotteryState {
  const {
    points,
    thresholdPoints,
    eligibleDisplayFrom,
    eligibleDisplayUntil,
    now = new Date(),
  } = params;

  if (isAfterCloseDate(eligibleDisplayUntil, now)) return "closed";
  if (points < thresholdPoints) return "not_eligible";
  if (isBeforeOpenDate(eligibleDisplayFrom, now)) return "before_open";
  return "open";
}
