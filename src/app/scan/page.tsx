import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QrScanner } from "@/features/qr-spot/components/qr-scanner";
import { SPOT_MAP_PATH } from "@/features/spot-map/constants/spot-map-path";

export const metadata: Metadata = {
  title: "QRコードを読み取る",
};

export default function ScanPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="mb-2 text-xl font-bold">QRコードを読み取る</h1>
      <p className="mb-5 text-sm text-gray-600">
        スポットやイベント会場に掲示されているQRコードを読み取ると、
        ポイントを獲得できます。
      </p>

      <QrScanner />

      <p className="mt-6 text-xs text-gray-500">
        うまく読み取れないときは、スマホの標準カメラアプリでQRコードを
        写しても同じように進めます。
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <Button asChild variant="outline">
          <Link href={SPOT_MAP_PATH}>スポットを地図で探す</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">ホームへ戻る</Link>
        </Button>
      </div>
    </div>
  );
}
