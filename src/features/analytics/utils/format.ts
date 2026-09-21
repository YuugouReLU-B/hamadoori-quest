import type { AnalyticsChannel } from "../types";
import { CHANNEL_LABELS } from "./attribution";

/** 集計結果の表示整形。DB関数は数値を NUMERIC で返すため null と文字列化に注意する */

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("ja-JP");
}

/** 秒数を「1分23秒」形式にする。1分未満はそのまま秒で出す */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "-";
  const total = Math.round(seconds);
  if (total < 60) return `${total}秒`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes < 60)
    return rest === 0 ? `${minutes}分` : `${minutes}分${rest}秒`;
  const hours = Math.floor(minutes / 60);
  return `${hours}時間${minutes % 60}分`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${value}%`;
}

export function formatChannel(channel: string | null | undefined): string {
  if (!channel) return CHANNEL_LABELS.direct;
  return CHANNEL_LABELS[channel as AnalyticsChannel] ?? channel;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

/** 参照元やキャンペーンコードが未設定のときの表示 */
export function orDash(value: string | null | undefined): string {
  return value?.trim() ? value : "-";
}
