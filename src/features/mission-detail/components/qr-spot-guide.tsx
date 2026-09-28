import { MapIcon, MapPin, QrCode } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SCAN_PATH } from "@/features/qr-spot/constants/qr-scan";
import { SPOT_MAP_PATH } from "@/features/spot-map/constants/spot-map-path";
import { questMapHref } from "@/lib/utils/map-links";

type QrSpotGuideProps = {
  latitude: number | null;
  longitude: number | null;
  /** 管理画面で入れたGoogleマップの共有URL。あれば地図リンクに優先して使う */
  googleMapUrl: string | null;
};

/**
 * QRスポットのミッション画面に出す案内。
 *
 * **ここにQRコードは出さない。** 画面に出すと、現地に行かなくても
 * 読み取れてしまい、スポットを回ってもらうという目的が成立しなくなる。
 * QRは印刷して現地に掲示するものだけにする。
 */
export function QrSpotGuide({
  latitude,
  longitude,
  googleMapUrl,
}: QrSpotGuideProps) {
  const mapHref = questMapHref(googleMapUrl, latitude, longitude);

  return (
    <div className="rounded-xl border-2 bg-white p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <QrCode className="h-10 w-10 text-gray-700" aria-hidden="true" />
        <p className="text-lg font-bold">現地のQRコードを読み取ろう</p>
        <p className="text-sm text-gray-600">
          スポットに掲示されているQRコードを読み取ると、自動でクエスト達成に
          なります。この画面での提出は不要です。
        </p>

        <Button asChild size="lg" className="mt-1 w-full sm:w-auto">
          <Link href={SCAN_PATH}>カメラを起動する</Link>
        </Button>

        <p className="text-xs text-gray-500">
          スマホの標準カメラアプリで読み取っても同じように進めます。
        </p>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {mapHref && (
            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              地図で場所を見る
            </a>
          )}

          <Link
            href={SPOT_MAP_PATH}
            className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
          >
            <MapIcon className="h-4 w-4" aria-hidden="true" />
            ほかのスポットも見る
          </Link>
        </div>
      </div>
    </div>
  );
}
