import { Card } from "@/components/ui/card";
import type { AnalyticsTimelineRow } from "../services/analytics-report";
import { formatDuration } from "../utils/format";

/**
 * 1セッションの行動を時系列で並べる。
 *
 * 「どういう順番でどのページを開き、どこまで読んで、何を獲得したか」を
 * そのまま読める形にするのが目的なので、集計はせず生のイベントを並べる。
 */

const EVENT_LABELS: Record<string, string> = {
  session_start: "訪問開始",
  page_view: "ページ表示",
  scroll_depth: "スクロール到達",
  page_engagement: "ページ離脱",
  click: "クリック",
  outbound_click: "外部リンク",
  qr_scan: "QR読み取り",
  geo_checkin: "現地チェックイン",
};

/** イベントの見た目上の強弱。ページ表示と獲得系を目立たせる */
const EMPHASIZED_EVENTS = new Set([
  "page_view",
  "geo_checkin",
  "qr_scan",
  "session_start",
]);

function formatClock(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

function describe(event: AnalyticsTimelineRow): string | null {
  switch (event.event_name) {
    case "scroll_depth":
      return `${event.scroll_pct}% まで到達（表示から ${formatDuration(
        (event.ms_since_page_view ?? 0) / 1000,
      )}）`;
    case "page_engagement":
      return `滞在 ${formatDuration((event.engaged_ms ?? 0) / 1000)} ／ 最大 ${
        event.max_scroll_pct ?? 0
      }% まで表示`;
    case "click":
    case "outbound_click": {
      const props = event.props as Record<string, unknown> | null;
      const label = typeof props?.label === "string" ? props.label : null;
      const href = typeof props?.href === "string" ? props.href : null;
      return [label, href].filter(Boolean).join(" → ") || null;
    }
    default: {
      const props = event.props as Record<string, unknown> | null;
      if (!props || Object.keys(props).length === 0) return null;
      return JSON.stringify(props);
    }
  }
}

export function SessionTimeline({
  events,
}: {
  events: AnalyticsTimelineRow[];
}) {
  return (
    <Card className="p-4 md:p-6">
      <ol className="space-y-0">
        {events.map((event) => {
          const emphasized = EMPHASIZED_EVENTS.has(event.event_name);
          const detail = describe(event);

          return (
            <li
              key={`${event.occurred_at}-${event.seq}`}
              className="flex gap-3 py-2 border-b last:border-b-0"
            >
              <span className="text-xs tabular-nums text-muted-foreground w-16 shrink-0 pt-0.5">
                {formatClock(event.occurred_at)}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={
                    emphasized
                      ? "text-sm font-semibold"
                      : "text-sm text-muted-foreground"
                  }
                >
                  {EVENT_LABELS[event.event_name] ?? event.event_name}
                  {event.page_path && (
                    <span className="font-mono text-xs ml-2 break-all">
                      {event.page_path}
                    </span>
                  )}
                </p>

                {detail && (
                  <p className="text-xs text-muted-foreground mt-0.5 break-all">
                    {detail}
                  </p>
                )}

                {event.gps_latitude !== null &&
                  event.gps_longitude !== null && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      位置: {event.gps_latitude.toFixed(5)},{" "}
                      {event.gps_longitude.toFixed(5)}
                    </p>
                  )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
