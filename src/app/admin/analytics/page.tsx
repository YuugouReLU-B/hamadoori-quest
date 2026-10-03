import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/features/analytics/components/analytics-dashboard";
import {
  resolveAnalyticsDays,
  resolveAnalyticsTab,
} from "@/features/analytics/constants/dashboard";
import {
  getAnalyticsDashboard,
  recentPeriod,
} from "@/features/analytics/services/analytics-report";
import { getUser } from "@/features/user-profile/services/profile";
import { isAdmin } from "@/lib/utils/admin";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string | string[];
    tab?: string | string[];
  }>;
}) {
  const user = await getUser();

  // 解析データは個人の行動履歴そのものなので、管理者以外には一切見せない
  if (!isAdmin(user)) {
    redirect("/");
  }

  const params = await searchParams;
  const days = resolveAnalyticsDays(params.days);
  const tab = resolveAnalyticsTab(params.tab);
  const data = await getAnalyticsDashboard(recentPeriod(days));

  return <AnalyticsDashboard data={data} days={days} tab={tab} />;
}
