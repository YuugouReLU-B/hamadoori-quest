import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QrSpotLoginPrompt } from "@/features/qr-spot/components/qr-spot-login-prompt";
import { QR_SCAN_PATH } from "@/features/qr-spot/constants/qr-scan";
import { redeemQrSpot } from "@/features/qr-spot/use-cases/redeem-qr-spot";
import { getUser } from "@/features/user-profile/services/profile";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/client";
import { POINT_UNIT } from "@/lib/utils/format-points";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "スポット",
  // コードが検索結果に載ると現地に行かずに獲得できてしまう
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ code: string }> };

function Frame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export default async function QrSpotPage({ params }: PageProps) {
  const { code } = await params;
  const user = await getUser();

  if (!user) {
    // ログイン後に同じURLへ戻し、そのまま獲得処理へ進ませる
    return (
      <Frame title="スポットに到着しました">
        <QrSpotLoginPrompt returnUrl={`${QR_SCAN_PATH}/${code}`} />
      </Frame>
    );
  }

  const adminSupabase = await createAdminClient();
  const userSupabase = createClient();
  const result = await redeemQrSpot(adminSupabase, userSupabase, user.id, code);

  if (result.status === "invalid") {
    return (
      <Frame title="読み取れませんでした">
        <p className="text-sm text-gray-600">
          このQRコードは無効です。スポットの方にお声がけいただくか、
          時間をおいてもう一度お試しください。
        </p>
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link href="/">ホームへ</Link>
        </Button>
      </Frame>
    );
  }

  if (result.status === "unavailable") {
    return (
      <Frame title="いまは受付していません">
        <p className="text-sm text-gray-600">
          「{result.mission.title}」は現在受付を停止しています。
        </p>
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link href="/">ホームへ</Link>
        </Button>
      </Frame>
    );
  }

  if (result.status === "already") {
    return (
      <Frame title="獲得済みです">
        <p className="text-sm text-gray-600">
          「{result.mission.title}」のポイントは受け取り済みです。
          ほかのスポットも回ってみてください。
        </p>
        <Button asChild className="mt-4 w-full">
          <Link href="/">ほかのスポットを見る</Link>
        </Button>
      </Frame>
    );
  }

  if (result.status === "error") {
    return (
      <Frame title="獲得できませんでした">
        <p className="text-sm text-gray-600">{result.message}</p>
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link href={`/missions/${result.mission.slug}`}>クエストを見る</Link>
        </Button>
      </Frame>
    );
  }

  return (
    <Frame title="ポイントを獲得しました！">
      <p className="text-sm text-gray-600">{result.mission.title}</p>
      <p className="my-4 text-4xl font-bold">
        +{result.xpGranted}
        <span className="ml-1 text-base font-bold">{POINT_UNIT}</span>
      </p>
      <Button asChild className="w-full">
        <Link href="/">ほかのスポットを見る</Link>
      </Button>
    </Frame>
  );
}
