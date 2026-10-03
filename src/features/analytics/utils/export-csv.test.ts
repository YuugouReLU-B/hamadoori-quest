import {
  ANALYTICS_DATASETS,
  ANALYTICS_TABS,
  resolveAnalyticsDays,
  resolveAnalyticsTab,
} from "../constants/dashboard";
import type { AnalyticsDashboard } from "../services/analytics-report";
import { analyticsCsvFilename, buildAnalyticsCsv } from "./export-csv";

const period = {
  from: new Date("2026-09-30T15:00:00Z"),
  to: new Date("2026-10-03T15:00:00Z"),
};

function dashboard(partial: Partial<AnalyticsDashboard>): AnalyticsDashboard {
  return partial as AnalyticsDashboard;
}

describe("buildAnalyticsCsv", () => {
  it("BOM付きで、表ごとに見出し・日本語の列名・データ行を並べる", () => {
    const csv = buildAnalyticsCsv(
      dashboard({
        channels: [
          {
            channel: "social",
            sessions: 3,
            visitors: 2,
            page_views: 10,
            avg_engaged_seconds: 12.5,
            signups: 1,
            achievements: 0,
          },
        ],
      }),
      ANALYTICS_DATASETS.filter((d) => d.dataKey === "channels"),
      period,
    );

    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe("浜通りクエスト アクセス解析");
    expect(lines[1]).toContain("2026/10/01 00:00 〜 2026/10/04 00:00");
    expect(lines).toContain("■ 流入チャネル");
    expect(lines).toContain(
      "チャネル,セッション,訪問者,ページビュー,平均滞在（秒）,新規登録,獲得数",
    );
    expect(lines).toContain("social,3,2,10,12.5,1,0");
  });

  it("1行だけの集計（サマリー）も表として出す", () => {
    const csv = buildAnalyticsCsv(
      dashboard({
        overview: {
          // DB関数は該当データが無いと NULL を返す（型は number だが実際には来る）
          ...({ avg_engaged_seconds: null } as unknown as {
            avg_engaged_seconds: number;
          }),
          sessions: 5,
          visitors: 4,
          logged_in_users: 1,
          page_views: 9,
          avg_max_scroll_pct: 50,
          bounce_rate: 20,
        },
      }),
      ANALYTICS_DATASETS.filter((d) => d.dataKey === "overview"),
      period,
    );

    expect(csv).toContain("■ サマリー");
    // null は空欄にする
    expect(csv).toContain(",5,4,1,9,50,20");
  });

  it("データが無い表は（データなし）と書く", () => {
    const csv = buildAnalyticsCsv(
      dashboard({ clicks: [] }),
      ANALYTICS_DATASETS.filter((d) => d.dataKey === "clicks"),
      period,
    );
    expect(csv).toContain("■ 押されたボタン・リンク\r\n（データなし）");
  });

  it("カンマや改行を含む値は引用符で囲み、オブジェクトはJSONにする", () => {
    const csv = buildAnalyticsCsv(
      dashboard({
        clicks: [
          {
            label: "見る, 行く\n2行目",
            element_path: "main > a",
            page_path: "/",
            href: "/x",
            is_outbound: false,
            clicks: 1,
            visitors: 1,
          },
        ],
        sessions: [{ props: { a: 1 } } as never],
      }),
      ANALYTICS_DATASETS.filter(
        (d) => d.dataKey === "clicks" || d.dataKey === "sessions",
      ),
      period,
    );
    expect(csv).toContain('"見る, 行く\n2行目"');
    expect(csv).toContain('"{""a"":1}"');
  });
});

describe("タブとCSV出力の定義", () => {
  it("どのタブにも少なくとも1つ表があり、集計の重複がない", () => {
    for (const tab of ANALYTICS_TABS) {
      expect(ANALYTICS_DATASETS.some((d) => d.tab === tab.key)).toBe(true);
    }
    const keys = ANALYTICS_DATASETS.map((d) => d.dataKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("想定外のタブ・期間は既定値に丸める", () => {
    expect(resolveAnalyticsTab("quests")).toBe("quests");
    expect(resolveAnalyticsTab("../etc")).toBe("overview");
    expect(resolveAnalyticsTab(undefined)).toBe("overview");
    expect(resolveAnalyticsDays("30")).toBe(30);
    expect(resolveAnalyticsDays("5")).toBe(7);
  });

  it("ファイル名は日本時間の日付と範囲を含むASCII", () => {
    expect(
      analyticsCsvFilename("all", 7, new Date("2026-10-03T16:00:00Z")),
    ).toBe("hamadori-quest-analytics_all_7d_20261004.csv");
  });
});
