import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/features/analytics/components/analytics-dashboard";
import {
  getAnalyticsDashboard,
  recentPeriod,
} from "@/features/analytics/services/analytics-report";
import { getUser } from "@/features/user-profile/services/profile";
import { isAdmin } from "@/lib/utils/admin";

/** ?days= で受け付ける期間。想定外の値はここで既定値に丸める */
const ALLOWED_DAYS = [1, 7, 30, 90];
const DEFAULT_DAYS = 7;

function resolveDays(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "", 10);
  return ALLOWED_DAYS.includes(parsed) ? parsed : DEFAULT_DAYS;
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string | string[] }>;
}) {
  const user = await getUser();

  // 解析データは個人の行動履歴そのものなので、管理者以外には一切見せない
  if (!isAdmin(user)) {
    redirect("/");
  }

  const days = resolveDays((await searchParams).days);
  const data = await getAnalyticsDashboard(recentPeriod(days));

  return <AnalyticsDashboard data={data} days={days} />;
}
