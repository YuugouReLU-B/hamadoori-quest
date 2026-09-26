import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SCAN_PATH } from "@/features/qr-spot/constants/qr-scan";
import { SpotList } from "@/features/spot-map/components/spot-list";
import { SpotMapLoader } from "@/features/spot-map/components/spot-map-loader";
import { getMapSpots } from "@/features/spot-map/services/spot-map";
import { getUser } from "@/features/user-profile/services/profile";

export const metadata: Metadata = {
  title: "スポットマップ",
  description: "浜通りのチェックポイントを地図で探せます。",
};

export const dynamic = "force-dynamic";

export default async function SpotMapPage() {
  const user = await getUser();
  const spots = await getMapSpots(user?.id ?? null);

  const remaining = spots.filter((spot) => !spot.achieved).length;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold">スポットマップ</h1>
      <p className="mt-1 mb-5 text-sm text-gray-600">
        ピンの場所にQRコードが置いてあります。読み取るとポイントを獲得できます。
        {spots.length > 0 && user && (
          <>
            <br />
            残り {remaining} / {spots.length} か所
          </>
        )}
      </p>

      {spots.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm font-bold">
            まだ地図に出せるスポットがありません
          </p>
          <p className="mt-2 text-sm text-gray-600">
            スポットの緯度・経度を管理画面で登録すると、ここに並びます。
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <SpotMapLoader spots={spots} />
          <SpotList spots={spots} />
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href={SCAN_PATH}>QRコードを読み取る</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/">ホームへ戻る</Link>
        </Button>
      </div>
    </div>
  );
}
