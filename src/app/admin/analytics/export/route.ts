import type { NextRequest } from "next/server";
import {
  ANALYTICS_DATASETS,
  resolveAnalyticsDays,
  resolveAnalyticsTab,
} from "@/features/analytics/constants/dashboard";
import {
  getAnalyticsDashboard,
  recentPeriod,
} from "@/features/analytics/services/analytics-report";
import {
  analyticsCsvFilename,
  buildAnalyticsCsv,
} from "@/features/analytics/utils/export-csv";
import { getUser } from "@/features/user-profile/services/profile";
import { isAdmin } from "@/lib/utils/admin";

export const dynamic = "force-dynamic";

/**
 * アクセス解析の CSV ダウンロード。
 *
 * ?tab=all で全タブ、?tab=<タブ名> でそのタブの表だけをまとめて返す。
 * ルートハンドラには /admin のレイアウトが効かないので、ここで管理者を確認する。
 */
export async function GET(request: NextRequest) {
  // 解析データは個人の行動履歴そのものなので、管理者以外には存在も伏せる
  if (!isAdmin(await getUser())) {
    return new Response("Not Found", { status: 404 });
  }

  const params = request.nextUrl.searchParams;
  const days = resolveAnalyticsDays(params.get("days"));
  const scope =
    params.get("tab") === "all"
      ? "all"
      : resolveAnalyticsTab(params.get("tab"));

  const period = recentPeriod(days);
  const data = await getAnalyticsDashboard(period);
  const datasets =
    scope === "all"
      ? ANALYTICS_DATASETS
      : ANALYTICS_DATASETS.filter((dataset) => dataset.tab === scope);

  return new Response(buildAnalyticsCsv(data, datasets, period), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${analyticsCsvFilename(scope, days, period.to)}"`,
      "Cache-Control": "no-store",
    },
  });
}
