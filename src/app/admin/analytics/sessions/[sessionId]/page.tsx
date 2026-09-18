import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SessionTimeline } from "@/features/analytics/components/session-timeline";
import { getSessionTimeline } from "@/features/analytics/services/analytics-report";
import { getUser } from "@/features/user-profile/services/profile";
import { isAdmin } from "@/lib/utils/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AnalyticsSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await getUser();

  if (!isAdmin(user)) {
    redirect("/");
  }

  const { sessionId } = await params;

  // UUID以外はDB関数に渡す前に弾く
  if (!UUID_PATTERN.test(sessionId)) {
    notFound();
  }

  const events = await getSessionTimeline(sessionId);

  if (events.length === 0) {
    notFound();
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href="/admin/analytics"
          className="text-sm underline underline-offset-2"
        >
          ← アクセス解析に戻る
        </Link>
        <h1 className="text-2xl font-bold mt-2">セッションの行動</h1>
        <p className="font-mono text-xs text-muted-foreground break-all mt-1">
          {sessionId}
        </p>
      </div>

      <SessionTimeline events={events} />
    </div>
  );
}
