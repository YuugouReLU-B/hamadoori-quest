import { redirect } from "next/navigation";
import type { Message } from "@/components/common/form-message";
import Hero from "@/components/top/hero";
import { HowToParticipateSection } from "@/components/top/how-to-participate-section";
import { syncPointMilestoneAudience } from "@/features/line-notification/use-cases/sync-point-milestone-audience";
import MissionsByCategory from "@/features/missions/components/missions-by-category";
import RankingSection from "@/features/ranking/components/ranking-section";
import { getUnnotifiedBadges } from "@/features/user-badges/services/get-unnotified-badges";
import { BadgeNotificationCheck } from "@/features/user-badges-notification/components/badge-notification-check";
import {
  getUser,
  hasPrivateProfile,
} from "@/features/user-profile/services/profile";
import { getCurrentSeasonId } from "@/lib/loaders/seasons-loaders";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { generateRootMetadata } from "@/lib/utils/metadata";
import { validateReturnUrl } from "@/lib/validation/url";

// メタデータ生成を外部関数に委譲
export const generateMetadata = generateRootMetadata;

/**
 * ヒーローのLINEボタンの上に出すメッセージを組み立てる。
 *
 * ログイン導線を `/sign-in` からトップに移したので、認証エラーや
 * 「ログインが必要」の理由をここで受け取って表示する必要がある。
 */
function buildAuthMessage(params: {
  returnUrl?: string;
  error?: string;
  success?: string;
  message?: string;
}): Message | undefined {
  if (params.error) return { error: params.error };
  if (params.success) return { success: params.success };
  if (params.message) return { message: params.message };
  if (params.returnUrl) {
    return { message: "ログインすると続きから遊べます。" };
  }
  return undefined;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    ref?: string;
    returnUrl?: string;
    error?: string;
    success?: string;
    message?: string;
  }>;
}) {
  const params = await searchParams;
  const _referralCode = params.ref;
  const returnUrl = validateReturnUrl(params.returnUrl) ?? undefined;
  const authMessage = buildAuthMessage({ ...params, returnUrl });

  const user = await getUser();

  // バッジ通知をチェック
  let badgeNotifications = null;

  if (user) {
    const hasProfile = await hasPrivateProfile(user.id);
    if (!hasProfile) {
      redirect("/settings/profile?new=true");
    }

    // 現在のシーズンIDを取得
    const currentSeasonId = await getCurrentSeasonId();

    // バッジ通知をチェック（現在のシーズンのみ）
    const unnotifiedBadges = await getUnnotifiedBadges(
      user.id,
      currentSeasonId ?? undefined,
    );
    if (unnotifiedBadges.length > 0) {
      badgeNotifications = unnotifiedBadges;
    }

    // 累計ポイントが閾値に到達していればLINEオーディエンスへ追加（画面表示への影響なし）
    await syncPointMilestoneAudience(await createAdminClient(), user.id);
  }

  return (
    <div className="flex flex-col min-h-screen w-full pt-2">
      {/* バッジ通知 */}
      {badgeNotifications && (
        <BadgeNotificationCheck badgeData={badgeNotifications} />
      )}

      {/* ヒーローセクション */}
      <section className="relative">
        <Hero returnUrl={returnUrl} message={authMessage} />
      </section>

      {/* 参加方法の案内図（活動状況・タイムライン・ランキングの代わりに表示）。
          ログイン済みユーザーにはヒーロー内の「遊び方」モーダルで見せるので、
          ここでは未ログイン時のみ表示する */}
      {!user && (
        <section className="pt-4 pb-12 md:pt-6 md:pb-8 bg-background">
          <HowToParticipateSection collapsible={false} />
        </section>
      )}

      {/* ランキングセクション */}
      <section className="md:pt-8 md:pb-16 bg-background">
        <RankingSection />
      </section>

      <section
        id="quests"
        className="scroll-mt-24 py-12 md:py-16 bg-background"
      >
        <MissionsByCategory userId={user?.id} />
      </section>
    </div>
  );
}
