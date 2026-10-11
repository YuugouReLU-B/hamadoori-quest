import {
  hasEventEnded,
  hasEventStarted,
} from "@/features/missions/utils/mission-period";

type Candidate = {
  title: string;
  event_date: string | null;
  event_end_date: string | null;
};

/**
 * 達成後の「他のイベントもチェック！」に出す1件を選ぶ。
 *
 * 終わったイベントは出さない（以前はタイトル順で先頭を出していたので、
 * 終了済みのイベントを勧めることがあった）。優先順は
 *   1. 開催中のイベント（終わりが近い順）
 *   2. これから開催のイベント（開催日が近い順）
 *   3. 開催日の無い常設スポット（タイトル順）
 */
export function pickSuggestedEvent<T extends Candidate>(
  candidates: T[],
  now: Date = new Date(),
): T | null {
  const rank = (m: T) => {
    if (!m.event_date) return 2;
    return hasEventStarted(m, now) ? 0 : 1;
  };
  // 開催中は最終日、開催前は開催日で並べる。DATE型の文字列なので辞書順で比較できる
  const dateKey = (m: T) =>
    rank(m) === 0
      ? (m.event_end_date ?? m.event_date ?? "")
      : (m.event_date ?? "");

  const sorted = candidates
    .filter((m) => !hasEventEnded(m, now))
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        dateKey(a).localeCompare(dateKey(b)) ||
        a.title.localeCompare(b.title, "ja"),
    );
  return sorted[0] ?? null;
}
