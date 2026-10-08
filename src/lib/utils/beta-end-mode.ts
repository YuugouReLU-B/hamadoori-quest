/**
 * ベータ終了モード判定ユーティリティ
 */

/**
 * 実証実験の終了時刻。利用規約（第2条・第10条）で「2026年11月29日をもって
 * いったん提供を終了」としているので、11月29日の終わり＝11月30日0時（日本時間）にする。
 */
export const BETA_END_AT: Date | null = new Date("2026-11-30T00:00:00+09:00");

/**
 * ベータ終了時刻を過ぎているかを判定する。
 */
export function isBetaEndActive(
  now: Date = new Date(),
  betaEndAt: Date | null = BETA_END_AT,
): boolean {
  if (!betaEndAt) {
    return false;
  }

  return now >= betaEndAt;
}

/**
 * previewパラメータでベータ終了画面を強制表示するかを判定する。
 */
export function isBetaEndPreview(url: URL): boolean {
  return url.searchParams.get("preview") === "beta-end";
}

/**
 * ベータ終了画面を表示すべきかを判定する。
 */
export function shouldShowBetaEnd(
  url: URL,
  now: Date = new Date(),
  betaEndAt: Date | null = BETA_END_AT,
): boolean {
  return isBetaEndActive(now, betaEndAt) || isBetaEndPreview(url);
}
