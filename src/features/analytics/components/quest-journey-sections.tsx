import { Card } from "@/components/ui/card";
import type {
  QuestJourneyRow,
  QuestProgressionRow,
  QuestSequenceRow,
  QuestTimingRow,
  QuestTransitionRow,
} from "../services/analytics-report";
import {
  formatCount,
  formatDateTime,
  formatPercent,
  orDash,
} from "../utils/format";
import { AnalyticsTable } from "./analytics-table";

/**
 * クエスト達成の「順番」と「かかった期間」。
 *
 * ここだけは achievements テーブルから直接出しているので、
 * 行動計測を入れる前の過去データにも遡って効く。
 * 集団は「その期間に登録した人」で、登録から1個目までの時間を測るためにこの切り方にしている。
 */

/** 時間を人が読める単位にする。分・時間・日で切り替える */
function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "-";
  if (hours < 1) return `${Math.round(hours * 60)}分`;
  if (hours < 48) return `${Math.round(hours * 10) / 10}時間`;
  return `${Math.round((hours / 24) * 10) / 10}日`;
}

/** 「登録→1個目」「n個目→n+1個目」のラベル */
function stepLabel(stepIndex: number): string {
  if (stepIndex === 0) return "登録 → 1個目";
  return `${stepIndex}個目 → ${stepIndex + 1}個目`;
}

export function QuestTimingCard({ rows }: { rows: QuestTimingRow[] }) {
  const max = Math.max(...rows.map((row) => row.median_hours ?? 0), 1);

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold">次の1個までにかかる時間</h2>
        <p className="text-xs text-muted-foreground mt-1">
          中央値。棒の薄い部分は上位25%〜75%の幅で、人によるばらつきを表します
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          この期間に登録した人の達成データがまだありません
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.step_index} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 shrink-0">
                {stepLabel(row.step_index)}
              </span>
              <div className="relative flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                {/* 25〜75パーセンタイルの帯 */}
                <div
                  className="absolute inset-y-0 bg-[var(--app-brand-primary-strong)] opacity-25 rounded-sm"
                  style={{
                    left: `${((row.p25_hours ?? 0) / max) * 100}%`,
                    width: `${(((row.p75_hours ?? 0) - (row.p25_hours ?? 0)) / max) * 100}%`,
                  }}
                />
                {/* 中央値 */}
                <div
                  className="absolute inset-y-0 w-1 bg-[var(--app-brand-primary-strong)]"
                  style={{ left: `${((row.median_hours ?? 0) / max) * 100}%` }}
                />
              </div>
              <span className="text-xs tabular-nums w-28 text-right">
                {formatHours(row.median_hours)}
                <span className="text-muted-foreground ml-1">
                  ({formatCount(row.users)}人)
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function QuestProgressionCard({
  rows,
}: {
  rows: QuestProgressionRow[];
}) {
  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold">何個まで達成が続くか</h2>
        <p className="text-xs text-muted-foreground mt-1">
          この期間に登録した人のうち、n個目まで到達した人数。どこで止まるかが見えます
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          この期間に登録した人の達成データがまだありません
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.step_index} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-16 shrink-0 tabular-nums">
                {row.step_index}個目
              </span>
              <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[var(--app-brand-primary-strong)] rounded-sm"
                  style={{ width: `${row.share_of_cohort_pct ?? 0}%` }}
                />
              </div>
              <span className="text-xs tabular-nums w-36 text-right">
                {formatCount(row.users_reached)}人
                <span className="text-muted-foreground ml-1">
                  （登録者の {formatPercent(row.share_of_cohort_pct)}
                  {row.continued_from_previous_pct !== null &&
                    ` / 前段から ${row.continued_from_previous_pct}%`}
                  ）
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function QuestSequenceTable({ rows }: { rows: QuestSequenceRow[] }) {
  return (
    <AnalyticsTable<QuestSequenceRow>
      title="何個目にどのクエストを達成したか"
      description="1個目に選ばれるクエスト、その次に選ばれるクエストの並び"
      rows={rows}
      rowKey={(row) => `${row.step_index}-${row.mission_id}`}
      emptyMessage="この期間に登録した人の達成データがまだありません"
      columns={[
        {
          key: "step_index",
          header: "順番",
          align: "right",
          render: (row) => `${row.step_index}個目`,
        },
        {
          key: "mission",
          header: "クエスト",
          render: (row) => (
            <div className="max-w-[24rem]">
              <p className="text-sm">{row.mission_title}</p>
              <p className="font-mono text-xs text-muted-foreground break-all">
                /missions/{row.mission_slug}
              </p>
            </div>
          ),
        },
        {
          key: "users",
          header: "人数",
          align: "right",
          render: (row) => formatCount(row.users),
        },
        {
          key: "share_pct",
          header: "その順番での割合",
          align: "right",
          render: (row) => formatPercent(row.share_pct),
        },
      ]}
    />
  );
}

export function QuestTransitionsTable({
  rows,
}: {
  rows: QuestTransitionRow[];
}) {
  return (
    <AnalyticsTable<QuestTransitionRow>
      title="クエストのつながり"
      description="あるクエストの次にどのクエストへ進んだか、その間隔の中央値"
      rows={rows}
      rowKey={(row, index) =>
        `${row.from_title}-${row.to_title}-${row.step_index}-${index}`
      }
      emptyMessage="この期間に登録した人の達成データがまだありません"
      columns={[
        {
          key: "step_index",
          header: "順番",
          align: "right",
          render: (row) => `${row.step_index} → ${row.step_index + 1}`,
        },
        {
          key: "from_title",
          header: "このクエストの次に",
          render: (row) => row.from_title,
        },
        {
          key: "to_title",
          header: "このクエスト",
          render: (row) => row.to_title,
        },
        {
          key: "users",
          header: "人数",
          align: "right",
          render: (row) => formatCount(row.users),
        },
        {
          key: "median_hours",
          header: "間隔の中央値",
          align: "right",
          render: (row) => formatHours(row.median_hours),
        },
      ]}
    />
  );
}

export function QuestJourneyTable({ rows }: { rows: QuestJourneyRow[] }) {
  return (
    <AnalyticsTable<QuestJourneyRow>
      title="ユーザーごとの達成の流れ"
      description="登録した順に、達成したクエストを達成順に並べています"
      rows={rows}
      rowKey={(row) => row.user_id}
      emptyMessage="この期間に登録した人がまだいません"
      columns={[
        {
          key: "user",
          header: "ユーザー",
          render: (row) => (
            <div className="max-w-[12rem]">
              <p className="text-sm">{row.user_name ?? "（名前未設定）"}</p>
              <p className="font-mono text-[10px] text-muted-foreground break-all">
                {row.user_id}
              </p>
            </div>
          ),
        },
        {
          key: "registered_at",
          header: "登録",
          align: "right",
          render: (row) => formatDateTime(row.registered_at),
        },
        {
          key: "quest_count",
          header: "達成数",
          align: "right",
          render: (row) => formatCount(row.quest_count),
        },
        {
          key: "hours_to_first",
          header: "1個目まで",
          align: "right",
          render: (row) => formatHours(row.hours_to_first),
        },
        {
          key: "days_span",
          header: "最初〜最後",
          align: "right",
          render: (row) =>
            row.days_span === null ? "-" : `${row.days_span}日`,
        },
        {
          key: "quest_titles",
          header: "達成した順番",
          render: (row) => (
            <p className="text-xs max-w-[30rem]">{orDash(row.quest_titles)}</p>
          ),
        },
      ]}
    />
  );
}
