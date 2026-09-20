import Link from "next/link";
import { Card } from "@/components/ui/card";
import type {
  AnalyticsAcquisitionRow,
  AnalyticsChannelRow,
  AnalyticsFlowRow,
  AnalyticsLocationRow,
  AnalyticsPageRow,
  AnalyticsReferrerRow,
  AnalyticsSessionRow,
  AnalyticsDashboard as DashboardData,
} from "../services/analytics-report";
import {
  formatChannel,
  formatCount,
  formatDateTime,
  formatDuration,
  formatPercent,
  orDash,
} from "../utils/format";
import {
  AccessHeatmapCard,
  ClickTargetsTable,
  ContentDwellTable,
  PageBandsCard,
  SectionDwellTable,
  VisitFrequencyCard,
  VisitorActivityTable,
} from "./analytics-extra-sections";
import { AnalyticsTable, PercentBar } from "./analytics-table";

/** 期間切り替えの選択肢 */
const PERIOD_OPTIONS = [
  { days: 1, label: "24時間" },
  { days: 7, label: "7日" },
  { days: 30, label: "30日" },
  { days: 90, label: "90日" },
] as const;

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </Card>
  );
}

function PeriodSwitcher({ days }: { days: number }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PERIOD_OPTIONS.map((option) => (
        <Link
          key={option.days}
          href={`/admin/analytics?days=${option.days}`}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            option.days === days
              ? "bg-[var(--app-brand-primary-strong)] text-white border-transparent"
              : "hover:bg-muted"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

export function AnalyticsDashboard({
  data,
  days,
}: {
  data: DashboardData;
  days: number;
}) {
  const { overview } = data;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">アクセス解析</h1>
          <p className="text-xs text-muted-foreground mt-1">
            /admin と /dev、およびクローラからのアクセスは除外しています
          </p>
        </div>
        <PeriodSwitcher days={days} />
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="セッション"
          value={formatCount(overview?.sessions)}
          hint="30分の無操作で区切り"
        />
        <StatCard label="訪問者" value={formatCount(overview?.visitors)} />
        <StatCard
          label="ログイン済み"
          value={formatCount(overview?.logged_in_users)}
          hint="セッション中にログインしていた人数"
        />
        <StatCard
          label="ページビュー"
          value={formatCount(overview?.page_views)}
        />
        <StatCard
          label="平均滞在時間"
          value={formatDuration(overview?.avg_engaged_seconds)}
          hint="1ページ表示あたり・操作があった時間のみ"
        />
        <StatCard
          label="平均スクロール到達率"
          value={formatPercent(overview?.avg_max_scroll_pct)}
          hint="ページの高さのどこまで見たか"
        />
        <StatCard
          label="直帰率"
          value={formatPercent(overview?.bounce_rate)}
          hint="1ページだけ見て終えた割合"
        />
      </div>

      {/* 流入元 */}
      <AnalyticsTable<AnalyticsChannelRow>
        title="流入チャネル"
        description="どこから来た人が、どれだけ回遊して、どれだけクエストを獲得したか"
        rows={data.channels}
        rowKey={(row) => row.channel}
        columns={[
          {
            key: "channel",
            header: "チャネル",
            render: (row) => formatChannel(row.channel),
          },
          {
            key: "sessions",
            header: "セッション",
            align: "right",
            render: (row) => formatCount(row.sessions),
          },
          {
            key: "visitors",
            header: "訪問者",
            align: "right",
            render: (row) => formatCount(row.visitors),
          },
          {
            key: "page_views",
            header: "PV",
            align: "right",
            render: (row) => formatCount(row.page_views),
          },
          {
            key: "avg_engaged_seconds",
            header: "平均滞在",
            align: "right",
            render: (row) => formatDuration(row.avg_engaged_seconds),
          },
          {
            key: "signups",
            header: "新規登録",
            align: "right",
            render: (row) => formatCount(row.signups),
          },
          {
            key: "achievements",
            header: "獲得",
            align: "right",
            render: (row) => formatCount(row.achievements),
          },
        ]}
      />

      <AnalyticsTable<AnalyticsReferrerRow>
        title="参照元の内訳"
        description="参照元ホストと、こちらで付けた計測パラメータ別"
        rows={data.referrers}
        rowKey={(row, index) =>
          `${row.referrer_host ?? "none"}-${row.utm_source ?? ""}-${row.campaign_code ?? ""}-${index}`
        }
        columns={[
          {
            key: "channel",
            header: "チャネル",
            render: (row) => formatChannel(row.channel),
          },
          {
            key: "referrer_host",
            header: "参照元",
            render: (row) => orDash(row.referrer_host),
          },
          {
            key: "utm",
            header: "utm (source / medium / campaign)",
            render: (row) =>
              [row.utm_source, row.utm_medium, row.utm_campaign]
                .filter(Boolean)
                .join(" / ") || "-",
          },
          {
            key: "campaign_code",
            header: "キャンペーンコード",
            render: (row) => orDash(row.campaign_code),
          },
          {
            key: "sessions",
            header: "セッション",
            align: "right",
            render: (row) => formatCount(row.sessions),
          },
          {
            key: "visitors",
            header: "訪問者",
            align: "right",
            render: (row) => formatCount(row.visitors),
          },
        ]}
      />

      {/* ページ別の滞在とスクロール */}
      <AnalyticsTable<AnalyticsPageRow>
        title="ページ別の滞在とスクロール"
        description="どのページにどれだけ留まり、ページの高さのどこまで読まれたか"
        rows={data.pages}
        rowKey={(row) => row.page_path ?? "unknown"}
        columns={[
          {
            key: "page_path",
            header: "ページ",
            render: (row) => (
              <div className="max-w-[22rem]">
                <p className="font-mono text-xs break-all">{row.page_path}</p>
                {row.page_title && (
                  <p className="text-xs text-muted-foreground truncate">
                    {row.page_title}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: "page_views",
            header: "PV",
            align: "right",
            render: (row) => formatCount(row.page_views),
          },
          {
            key: "visitors",
            header: "訪問者",
            align: "right",
            render: (row) => formatCount(row.visitors),
          },
          {
            key: "avg_engaged_seconds",
            header: "平均滞在",
            align: "right",
            render: (row) => formatDuration(row.avg_engaged_seconds),
          },
          {
            key: "median_engaged_seconds",
            header: "中央値",
            align: "right",
            render: (row) => formatDuration(row.median_engaged_seconds),
          },
          {
            key: "avg_max_scroll_pct",
            header: "平均到達率",
            align: "right",
            render: (row) => <PercentBar value={row.avg_max_scroll_pct} />,
          },
          {
            key: "read_to_bottom_rate",
            header: "ほぼ最後まで",
            align: "right",
            render: (row) => formatPercent(row.read_to_bottom_rate),
          },
          {
            key: "entries",
            header: "入口",
            align: "right",
            render: (row) => formatCount(row.entries),
          },
          {
            key: "exits",
            header: "出口",
            align: "right",
            render: (row) => formatCount(row.exits),
          },
        ]}
      />

      {/* どのコンテンツが見られたか */}
      <ContentDwellTable rows={data.contents} />

      {/* ページ内のどこを見ていたか */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PageBandsCard rows={data.bands} />
        <AccessHeatmapCard rows={data.hours} />
      </div>

      <SectionDwellTable rows={data.sections} />

      {/* 押されたボタン */}
      <ClickTargetsTable rows={data.clicks} />

      {/* 回遊経路 */}
      <AnalyticsTable<AnalyticsFlowRow>
        title="ページ遷移"
        description="セッション内で何ページ目にどこからどこへ動いたか"
        rows={data.flows}
        rowKey={(row, index) =>
          `${row.from_path}-${row.to_path}-${row.step_index}-${index}`
        }
        columns={[
          {
            key: "step_index",
            header: "何ページ目",
            align: "right",
            render: (row) => `${row.step_index} → ${row.step_index + 1}`,
          },
          {
            key: "from_path",
            header: "遷移元",
            render: (row) => (
              <span className="font-mono text-xs break-all">
                {row.from_path}
              </span>
            ),
          },
          {
            key: "to_path",
            header: "遷移先",
            render: (row) => (
              <span className="font-mono text-xs break-all">{row.to_path}</span>
            ),
          },
          {
            key: "transitions",
            header: "回数",
            align: "right",
            render: (row) => formatCount(row.transitions),
          },
        ]}
      />

      {/* 獲得 */}
      <AnalyticsTable<AnalyticsAcquisitionRow>
        title="クエスト獲得と流入元"
        description="達成した時刻を含むセッションの流入元で紐づけています"
        rows={data.acquisitions}
        rowKey={(row, index) =>
          `${row.mission_id}-${row.channel}-${row.referrer_host ?? ""}-${index}`
        }
        columns={[
          {
            key: "mission",
            header: "クエスト",
            render: (row) => (
              <div className="max-w-[20rem]">
                <p className="text-sm">{row.mission_title}</p>
                <p className="font-mono text-xs text-muted-foreground break-all">
                  /missions/{row.mission_slug}
                </p>
              </div>
            ),
          },
          {
            key: "channel",
            header: "流入元",
            render: (row) =>
              row.channel === "unknown"
                ? "計測前・不明"
                : formatChannel(row.channel),
          },
          {
            key: "referrer_host",
            header: "参照元",
            render: (row) => orDash(row.referrer_host),
          },
          {
            key: "campaign_code",
            header: "キャンペーン",
            render: (row) => orDash(row.campaign_code),
          },
          {
            key: "achievements",
            header: "獲得数",
            align: "right",
            render: (row) => formatCount(row.achievements),
          },
          {
            key: "users",
            header: "人数",
            align: "right",
            render: (row) => formatCount(row.users),
          },
        ]}
      />

      {/* 地域 */}
      <AnalyticsTable<AnalyticsLocationRow>
        title="地域（IPからの推定）"
        description="端末のGPSではなく、接続元IPから推定した市区町村レベルの位置です"
        rows={data.locations}
        rowKey={(row, index) =>
          `${row.ip_country ?? ""}-${row.ip_region ?? ""}-${row.ip_city ?? ""}-${index}`
        }
        columns={[
          {
            key: "country",
            header: "国",
            render: (row) => orDash(row.ip_country),
          },
          {
            key: "region",
            header: "都道府県",
            render: (row) => orDash(row.ip_region),
          },
          {
            key: "city",
            header: "市区町村",
            render: (row) => orDash(row.ip_city),
          },
          {
            key: "sessions",
            header: "セッション",
            align: "right",
            render: (row) => formatCount(row.sessions),
          },
          {
            key: "visitors",
            header: "訪問者",
            align: "right",
            render: (row) => formatCount(row.visitors),
          },
        ]}
      />

      {/* 再訪と訪問者ごとの行動 */}
      <VisitFrequencyCard rows={data.visitFrequency} />
      <VisitorActivityTable rows={data.visitors} />

      {/* 個別セッション */}
      <AnalyticsTable<AnalyticsSessionRow>
        title="直近のセッション"
        description="1件の行動を最初から最後まで追いたいときはここから"
        rows={data.sessions}
        rowKey={(row) => row.session_id}
        columns={[
          {
            key: "started_at",
            header: "開始",
            render: (row) => (
              <Link
                href={`/admin/analytics/sessions/${row.session_id}`}
                className="underline underline-offset-2"
              >
                {formatDateTime(row.started_at)}
              </Link>
            ),
          },
          {
            key: "channel",
            header: "流入元",
            render: (row) => (
              <div>
                <p>{formatChannel(row.channel)}</p>
                {row.referrer_host && (
                  <p className="text-xs text-muted-foreground">
                    {row.referrer_host}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: "landing_path",
            header: "入口",
            render: (row) => (
              <span className="font-mono text-xs break-all">
                {orDash(row.landing_path)}
              </span>
            ),
          },
          {
            key: "device",
            header: "端末",
            render: (row) =>
              [row.device_type, row.browser].filter(Boolean).join(" / ") || "-",
          },
          {
            key: "location",
            header: "地域",
            render: (row) =>
              [row.ip_region, row.ip_city].filter(Boolean).join(" ") || "-",
          },
          {
            key: "page_views",
            header: "PV",
            align: "right",
            render: (row) => formatCount(row.page_views),
          },
          {
            key: "engaged_seconds",
            header: "滞在",
            align: "right",
            render: (row) => formatDuration(row.engaged_seconds),
          },
          {
            key: "achievements",
            header: "獲得",
            align: "right",
            render: (row) => formatCount(row.achievements),
          },
        ]}
      />
    </div>
  );
}
