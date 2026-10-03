"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { AnalyticsTimeseriesRow } from "../services/analytics-report";

const EMPTY_MESSAGE = "この期間のデータはまだありません";

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4 md:p-6 overflow-hidden">
      <div className="mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </Card>
  );
}

/**
 * 区間の開始（日本時間の壁時計時刻）を軸ラベルにする。
 * DB は TIMESTAMP（タイムゾーンなし）で返すので、Date に通さず文字列から切り出す
 */
function bucketLabel(bucketStart: string, unit: "hour" | "day"): string {
  const [date, time = ""] = bucketStart.split("T");
  const [, month, day] = date.split("-");
  if (unit === "hour") return `${Number(time.slice(0, 2))}時`;
  return `${Number(month)}/${Number(day)}`;
}

const trafficConfig = {
  sessions: { label: "セッション", color: "hsl(var(--chart-2))" },
  visitors: { label: "訪問者", color: "hsl(var(--chart-1))" },
  page_views: { label: "ページビュー", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const outcomeConfig = {
  signups: { label: "新規登録", color: "hsl(var(--chart-4))" },
  achievements: { label: "クエスト獲得", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

/** アクセスと成果（登録・獲得）の推移 */
export function TrendCharts({
  rows,
  unit,
}: {
  rows: AnalyticsTimeseriesRow[];
  unit: "hour" | "day";
}) {
  const data = rows.map((row) => ({
    ...row,
    label: bucketLabel(row.bucket_start, unit),
  }));
  const unitLabel = unit === "hour" ? "1時間" : "1日";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard
        title="アクセスの推移"
        description={`${unitLabel}ごと（日本時間）。セッション・訪問者は開始時刻、ページビューは表示された時刻で数えています`}
      >
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {EMPTY_MESSAGE}
          </p>
        ) : (
          <ChartContainer config={trafficConfig} className="h-[260px] w-full">
            <LineChart data={data} margin={{ left: -16, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={10}
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {(
                Object.keys(trafficConfig) as (keyof typeof trafficConfig)[]
              ).map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  dot={data.length <= 31}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </ChartCard>

      <ChartCard
        title="新規登録とクエスト獲得の推移"
        description={`${unitLabel}ごと（日本時間）。行動計測とは紐づけず、全体の件数です`}
      >
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {EMPTY_MESSAGE}
          </p>
        ) : (
          <ChartContainer config={outcomeConfig} className="h-[260px] w-full">
            <BarChart data={data} margin={{ left: -16, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={10}
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="signups"
                fill="var(--color-signups)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="achievements"
                fill="var(--color-achievements)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </ChartCard>
    </div>
  );
}

export interface RankingItem {
  label: string;
  value: number;
}

/** 長いラベルは軸からはみ出すので切り詰める（全文はツールチップで見られる） */
function truncate(label: string, max = 16): string {
  return label.length > max ? `${label.slice(0, max)}…` : label;
}

/**
 * 上位の項目を横棒で比べるグラフ。表の上に置き、同じ数字を見比べやすくする。
 * 0件の項目は落とし、多い順に最大 limit 件を出す。
 */
export function RankingBarChart({
  title,
  description,
  items,
  valueLabel,
  color = "hsl(var(--chart-2))",
  limit = 10,
}: {
  title: string;
  description?: string;
  items: RankingItem[];
  valueLabel: string;
  color?: string;
  limit?: number;
}) {
  const data = items
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((item) => ({ ...item, short: truncate(item.label) }));
  const config = { value: { label: valueLabel, color } } satisfies ChartConfig;

  return (
    <ChartCard title={title} description={description}>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {EMPTY_MESSAGE}
        </p>
      ) : (
        <ChartContainer
          config={config}
          className="w-full"
          style={{ height: Math.max(120, data.length * 32 + 24) }}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 24 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              fontSize={10}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="short"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={150}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.label ?? ""
                  }
                />
              }
            />
            <Bar dataKey="value" fill="var(--color-value)" radius={3} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}
