import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

/**
 * ダッシュボード内で使う素朴な表。
 *
 * 行数が多くなりやすいので、横スクロールできることと、
 * スマホでもヘッダが読めることだけを担保する。
 */

export interface AnalyticsColumn<Row> {
  key: string;
  header: string;
  /** 数値列は右寄せにする */
  align?: "left" | "right";
  render: (row: Row) => ReactNode;
}

interface AnalyticsTableProps<Row> {
  title: string;
  description?: string;
  columns: AnalyticsColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  emptyMessage?: string;
}

export function AnalyticsTable<Row>({
  title,
  description,
  columns,
  rows,
  rowKey,
  emptyMessage = "この期間のデータはまだありません",
}: AnalyticsTableProps<Row>) {
  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`py-2 px-2 font-medium text-muted-foreground whitespace-nowrap ${
                      column.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  className="border-b last:border-b-0 hover:bg-muted/50"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`py-2 px-2 align-top ${
                        column.align === "right"
                          ? "text-right tabular-nums whitespace-nowrap"
                          : "text-left"
                      }`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** 到達率などの 0-100 の値をバーで見せる */
export function PercentBar({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-muted-foreground">-</span>;
  }
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--app-brand-primary-strong)]"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="tabular-nums w-12 text-right">{clamped}%</span>
    </div>
  );
}
