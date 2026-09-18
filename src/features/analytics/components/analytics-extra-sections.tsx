import { Card } from "@/components/ui/card";
import type {
  AnalyticsBandRow,
  AnalyticsClickRow,
  AnalyticsHourRow,
  AnalyticsSectionRow,
  AnalyticsVisitFrequencyRow,
  AnalyticsVisitorRow,
} from "../services/analytics-report";
import {
  formatCount,
  formatDateTime,
  formatDuration,
  orDash,
} from "../utils/format";
import { AnalyticsTable } from "./analytics-table";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
/** 0時から23時。map のインデックスを key に使わずに済むよう値の配列として持つ */
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * ページ内のどの高さに何秒いたか。
 * ページを上から10等分した帯ごとの平均滞在を横棒で並べる。
 */
export function PageBandsCard({ rows }: { rows: AnalyticsBandRow[] }) {
  const max = Math.max(...rows.map((row) => row.avg_seconds ?? 0), 1);

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold">ページ内のどこを見ていたか</h2>
        <p className="text-xs text-muted-foreground mt-1">
          ページを上から10等分した各帯が画面に映っていた平均時間（全ページ合算）
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          この期間のデータはまだありません
        </p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => {
            const seconds = row.avg_seconds ?? 0;
            const width = (seconds / max) * 100;
            const from = row.band_index * 10;

            return (
              <div key={row.band_index} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 shrink-0 tabular-nums">
                  {from}〜{from + 10}%
                </span>
                <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-[var(--app-brand-primary-strong)] rounded-sm"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums w-16 text-right">
                  {formatDuration(seconds)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/** 曜日 × 時間帯のヒートマップ。いつアクセスされているかを見る */
export function AccessHeatmapCard({ rows }: { rows: AnalyticsHourRow[] }) {
  const lookup = new Map<string, number>();
  for (const row of rows) {
    lookup.set(`${row.day_of_week}-${row.hour_of_day}`, row.sessions);
  }
  const max = Math.max(...rows.map((row) => row.sessions), 1);

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold">いつアクセスされているか</h2>
        <p className="text-xs text-muted-foreground mt-1">
          曜日 × 時間帯のセッション数（日本時間）
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="w-8" />
              {HOURS.map((hour) => (
                <th
                  key={hour}
                  className="text-[10px] font-normal text-muted-foreground w-5"
                >
                  {hour % 3 === 0 ? hour : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_LABELS.map((label, day) => (
              <tr key={label}>
                <td className="text-xs text-muted-foreground pr-1">{label}</td>
                {HOURS.map((hour) => {
                  const sessions = lookup.get(`${day}-${hour}`) ?? 0;
                  return (
                    <td key={`${label}-${hour}`} className="p-[1px]">
                      <div
                        className="w-4 h-4 rounded-[2px] bg-[var(--app-brand-primary-strong)]"
                        // 0件は薄すぎて枠だけ見える状態にする
                        style={{
                          opacity:
                            sessions === 0
                              ? 0.06
                              : 0.2 + (sessions / max) * 0.8,
                        }}
                        title={`${label}曜 ${hour}時: ${sessions}セッション`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** 同じ人が何回来ているか */
export function VisitFrequencyCard({
  rows,
}: {
  rows: AnalyticsVisitFrequencyRow[];
}) {
  const max = Math.max(...rows.map((row) => row.visitors), 1);

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold">再訪の回数</h2>
        <p className="text-xs text-muted-foreground mt-1">
          期間中に何回来たかの分布。10回以上はまとめています
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          この期間のデータはまだありません
        </p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div key={row.visit_count} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-16 shrink-0 tabular-nums">
                {row.visit_count === 10 ? "10回以上" : `${row.visit_count}回`}
              </span>
              <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[var(--app-brand-primary-strong)] rounded-sm"
                  style={{ width: `${(row.visitors / max) * 100}%` }}
                />
              </div>
              <span className="text-xs tabular-nums w-24 text-right">
                {formatCount(row.visitors)}人
                <span className="text-muted-foreground">
                  （登録 {formatCount(row.logged_in_visitors)}）
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ClickTargetsTable({ rows }: { rows: AnalyticsClickRow[] }) {
  return (
    <AnalyticsTable<AnalyticsClickRow>
      title="押されたボタン・リンク"
      description="ボタン、リンク、role でボタンを名乗る要素のクリックを記録しています"
      rows={rows}
      rowKey={(row, index) => `${row.page_path}-${row.element_path}-${index}`}
      columns={[
        {
          key: "label",
          header: "ラベル",
          render: (row) => (
            <div className="max-w-[18rem]">
              <p className="text-sm">{orDash(row.label)}</p>
              <p className="font-mono text-[10px] text-muted-foreground break-all">
                {orDash(row.element_path)}
              </p>
            </div>
          ),
        },
        {
          key: "page_path",
          header: "ページ",
          render: (row) => (
            <span className="font-mono text-xs break-all">{row.page_path}</span>
          ),
        },
        {
          key: "href",
          header: "リンク先",
          render: (row) => (
            <span className="font-mono text-xs break-all">
              {orDash(row.href)}
              {row.is_outbound && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  (外部)
                </span>
              )}
            </span>
          ),
        },
        {
          key: "clicks",
          header: "クリック",
          align: "right",
          render: (row) => formatCount(row.clicks),
        },
        {
          key: "visitors",
          header: "人数",
          align: "right",
          render: (row) => formatCount(row.visitors),
        },
      ]}
    />
  );
}

export function SectionDwellTable({ rows }: { rows: AnalyticsSectionRow[] }) {
  return (
    <AnalyticsTable<AnalyticsSectionRow>
      title="セクション別の滞在"
      description="ページ内の <section> 単位。見出しが取れたものだけ表示しています"
      rows={rows}
      rowKey={(row, index) => `${row.page_path}-${row.section_label}-${index}`}
      columns={[
        {
          key: "section",
          header: "セクション",
          render: (row) => (
            <div className="max-w-[20rem]">
              <p className="text-sm">{orDash(row.section_label)}</p>
              <p className="font-mono text-xs text-muted-foreground break-all">
                {row.page_path}
              </p>
            </div>
          ),
        },
        {
          key: "section_top",
          header: "ページ内位置",
          align: "right",
          render: (row) => `${formatCount(row.section_top)}px`,
        },
        {
          key: "page_views",
          header: "表示回数",
          align: "right",
          render: (row) => formatCount(row.page_views),
        },
        {
          key: "avg_seconds",
          header: "平均滞在",
          align: "right",
          render: (row) => formatDuration(row.avg_seconds),
        },
        {
          key: "total_seconds",
          header: "合計滞在",
          align: "right",
          render: (row) => formatDuration(row.total_seconds),
        },
      ]}
    />
  );
}

export function VisitorActivityTable({
  rows,
}: {
  rows: AnalyticsVisitorRow[];
}) {
  return (
    <AnalyticsTable<AnalyticsVisitorRow>
      title="訪問者ごとの行動"
      description="同じ端末（1st party cookie）を同一人物として数えています。ログインすればユーザーと紐づきます"
      rows={rows}
      rowKey={(row) => row.visitor_id}
      columns={[
        {
          key: "visitor",
          header: "訪問者",
          render: (row) => (
            <div className="max-w-[16rem]">
              <p className="text-sm">
                {row.user_name ??
                  (row.user_id ? "（名前未設定）" : "未ログイン")}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground break-all">
                {row.visitor_id}
              </p>
            </div>
          ),
        },
        {
          key: "visits",
          header: "訪問回数",
          align: "right",
          render: (row) => formatCount(row.visits),
        },
        {
          key: "first_seen_at",
          header: "初回",
          align: "right",
          render: (row) => formatDateTime(row.first_seen_at),
        },
        {
          key: "last_seen_at",
          header: "最終",
          align: "right",
          render: (row) => formatDateTime(row.last_seen_at),
        },
        {
          key: "page_views",
          header: "PV",
          align: "right",
          render: (row) => formatCount(row.page_views),
        },
        {
          key: "engaged_seconds",
          header: "滞在合計",
          align: "right",
          render: (row) => formatDuration(row.engaged_seconds),
        },
        {
          key: "achievements",
          header: "獲得",
          align: "right",
          render: (row) => formatCount(row.achievements),
        },
        {
          key: "channels",
          header: "流入元",
          render: (row) => orDash(row.channels),
        },
        {
          key: "locations",
          header: "地域",
          render: (row) => orDash(row.locations),
        },
        {
          key: "devices",
          header: "端末",
          render: (row) => orDash(row.devices),
        },
      ]}
    />
  );
}
