const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

type DateParts = { year: string; month: string; day: string };

/** `YYYY-MM-DD` をそのまま分解する（JSTの暦日として扱う）。 */
function splitDate(date: string): DateParts {
  const [year, month, day] = date.split("-");
  return { year, month, day };
}

/** JST基準の曜日ラベル。暦日をUTCの同日として解釈すれば曜日は一致する。 */
function weekdayLabel(date: string): string {
  return WEEKDAY_LABELS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

/**
 * 応募フォームの公開日を `M/D(曜)` にする（例: `2026-11-02` → `11/2(月)`）。
 *
 * 月日はゼロ埋めしない。引数の妥当性検証は行わない。
 */
export function formatLotteryOpenDate(date: string): string {
  const { month, day } = splitDate(date);
  return `${Number(month)}/${Number(day)}(${weekdayLabel(date)})`;
}

/**
 * 応募期間を `2026/11/02~11/29` 形式にする。
 *
 * 月日はゼロ埋めし、区切りは半角チルダ。開始年と終了年が異なる場合のみ
 * 終了側にも年を付ける（例: `2026/12/28~2027/01/10`）。逆転した日付が来ても
 * 例外は投げず、そのまま機械的に整形する（逆転の防止は管理画面側で担保する）。
 */
export function formatLotteryEntryPeriod(from: string, until: string): string {
  const start = splitDate(from);
  const end = splitDate(until);
  const endLabel =
    start.year === end.year
      ? `${end.month}/${end.day}`
      : `${end.year}/${end.month}/${end.day}`;
  return `${start.year}/${start.month}/${start.day}~${endLabel}`;
}
