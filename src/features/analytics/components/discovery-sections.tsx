import type {
  CalendarUsageRow,
  FilterUsageRow,
  MapSpotExposureRow,
  MapUsageRow,
} from "../services/analytics-report";
import { formatCount, formatPercent, orDash } from "../utils/format";
import { AnalyticsTable } from "./analytics-table";

/**
 * 「クエストをどう探しているか」の集計。絞り込みと地図の操作。
 *
 * 地図は画面から到達できる2つだけが対象。
 * ポスティング・ポスターの地図はルートが存在しないため計測していない。
 */

const MAP_LABELS: Record<string, string> = {
  "spot-map": "スポットマップ（/map）",
  "missions-map": "クエスト一覧の地図モード",
};

export function FilterUsageTable({ rows }: { rows: FilterUsageRow[] }) {
  return (
    <AnalyticsTable<FilterUsageRow>
      title="絞り込みの使われ方"
      description="チップを選んだ組み合わせと、その結果の件数。0件になる組み合わせは選択肢の出し方に無理があります"
      rows={rows}
      rowKey={(row, index) =>
        `${row.quest_type}-${row.kinds}-${row.regions}-${index}`
      }
      emptyMessage="まだ絞り込みが使われていません"
      columns={[
        {
          key: "quest_type",
          header: "クエスト種別",
          render: (row) => orDash(row.quest_type),
        },
        { key: "kinds", header: "種類", render: (row) => orDash(row.kinds) },
        {
          key: "regions",
          header: "地域",
          render: (row) => orDash(row.regions),
        },
        {
          key: "selections",
          header: "選択回数",
          align: "right",
          render: (row) => formatCount(row.selections),
        },
        {
          key: "visitors",
          header: "人数",
          align: "right",
          render: (row) => formatCount(row.visitors),
        },
        {
          key: "avg_result_count",
          header: "平均の結果件数",
          align: "right",
          render: (row) =>
            row.avg_result_count === null ? "-" : `${row.avg_result_count}件`,
        },
        {
          key: "zero_result_rate",
          header: "0件になった率",
          align: "right",
          render: (row) => formatPercent(row.zero_result_rate),
        },
      ]}
    />
  );
}

export function MapUsageTable({ rows }: { rows: MapUsageRow[] }) {
  return (
    <AnalyticsTable<MapUsageRow>
      title="地図の操作"
      description="ズームとドラッグの回数、ピンを押した回数。地図の中心座標は記録していません"
      rows={rows}
      rowKey={(row) => row.map_id ?? "unknown"}
      emptyMessage="まだ地図が操作されていません"
      columns={[
        {
          key: "map_id",
          header: "地図",
          render: (row) => MAP_LABELS[row.map_id ?? ""] ?? orDash(row.map_id),
        },
        {
          key: "moves",
          header: "操作回数",
          align: "right",
          render: (row) => formatCount(row.moves),
        },
        {
          key: "marker_clicks",
          header: "ピンを押した",
          align: "right",
          render: (row) => formatCount(row.marker_clicks),
        },
        {
          key: "visitors",
          header: "人数",
          align: "right",
          render: (row) => formatCount(row.visitors),
        },
        {
          key: "avg_zoom",
          header: "平均ズーム",
          align: "right",
          render: (row) => (row.avg_zoom === null ? "-" : String(row.avg_zoom)),
        },
        {
          key: "avg_visible_spots",
          header: "画面内のスポット数",
          align: "right",
          render: (row) =>
            row.avg_visible_spots === null ? "-" : `${row.avg_visible_spots}件`,
        },
      ]}
    />
  );
}

export function MapSpotExposureTable({ rows }: { rows: MapSpotExposureRow[] }) {
  return (
    <AnalyticsTable<MapSpotExposureRow>
      title="地図のスポット別の反応"
      description="地図に映った回数と、押された回数。映っているのに押されないスポットが見つかります"
      rows={rows}
      rowKey={(row, index) => `${row.map_id}-${row.spot_id}-${index}`}
      emptyMessage="まだ地図が操作されていません"
      columns={[
        {
          key: "spot",
          header: "スポット",
          render: (row) => (
            <div className="max-w-[20rem]">
              <p className="text-sm">{orDash(row.spot_title)}</p>
              <p className="font-mono text-[10px] text-muted-foreground break-all">
                {row.spot_id}
              </p>
            </div>
          ),
        },
        {
          key: "map_id",
          header: "地図",
          render: (row) => MAP_LABELS[row.map_id ?? ""] ?? orDash(row.map_id),
        },
        {
          key: "times_in_view",
          header: "映った回数",
          align: "right",
          render: (row) => formatCount(row.times_in_view),
        },
        {
          key: "viewers",
          header: "人数",
          align: "right",
          render: (row) => formatCount(row.viewers),
        },
        {
          key: "clicks",
          header: "押された",
          align: "right",
          render: (row) => formatCount(row.clicks),
        },
        {
          key: "click_rate",
          header: "押された率",
          align: "right",
          render: (row) => formatPercent(row.click_rate),
        },
      ]}
    />
  );
}

export function CalendarUsageTable({ rows }: { rows: CalendarUsageRow[] }) {
  return (
    <AnalyticsTable<CalendarUsageRow>
      title="カレンダーでの探し方"
      description="どの月を見に行ったか。開催が0件の月がよく見られていれば、月送りで空振りしています"
      rows={rows}
      rowKey={(row) => row.month ?? "unknown"}
      emptyMessage="まだカレンダーが使われていません"
      columns={[
        { key: "month", header: "月", render: (row) => orDash(row.month) },
        {
          key: "views",
          header: "見に行った回数",
          align: "right",
          render: (row) => formatCount(row.views),
        },
        {
          key: "visitors",
          header: "人数",
          align: "right",
          render: (row) => formatCount(row.visitors),
        },
        {
          key: "event_count",
          header: "その月の開催",
          align: "right",
          render: (row) =>
            row.event_count === null ? "-" : `${row.event_count}件`,
        },
        {
          key: "jumped_to_next",
          header: "「次の開催日へ」",
          align: "right",
          render: (row) => formatCount(row.jumped_to_next),
        },
      ]}
    />
  );
}
