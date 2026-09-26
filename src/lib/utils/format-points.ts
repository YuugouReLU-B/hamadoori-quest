/** ポイントの単位。画面・通知・履歴の表記はすべてこれに揃える */
export const POINT_UNIT = "pt";

/**
 * ポイントを表示用の文字列にする。
 *
 * 表記は「単位 pt・桁区切りなし・数字と単位の間に空白なし」で統一している（例: 1000pt）。
 * 以前は P / pt / ポイント / XP が混在し、桁区切りの有無も画面ごとに違っていた。
 * 数字と単位で見た目を分けたい箇所は、数字を `String(points)` で出し、
 * 単位に POINT_UNIT を使うこと。
 */
export function formatPoints(points: number | null | undefined): string {
  return `${points ?? 0}${POINT_UNIT}`;
}
