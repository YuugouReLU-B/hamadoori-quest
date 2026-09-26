import { Check, MapPin } from "lucide-react";
import Link from "next/link";
import type { MapSpot } from "@/features/spot-map/services/spot-map";
import { formatPoints } from "@/lib/utils/format-points";
import { googleMapsSearchUrl } from "@/lib/utils/map-links";

/**
 * 地図の下に出すスポットの一覧。
 *
 * 地図はピンを拾わないと中身が読めないので、同じ情報を文字でも並べる。
 * 読み上げや、地図が出ない端末のための代わりも兼ねる。
 */
export function SpotList({ spots }: { spots: MapSpot[] }) {
  return (
    <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200">
      {spots.map((spot) => (
        <li key={spot.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/missions/${spot.slug}`}
              className="font-bold underline underline-offset-2"
            >
              {spot.title}
            </Link>
            <p className="mt-0.5 text-xs text-gray-600">
              {spot.achieved ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  獲得済み
                </span>
              ) : (
                formatPoints(spot.points)
              )}
            </p>
          </div>

          <a
            href={googleMapsSearchUrl(spot.latitude, spot.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs underline underline-offset-2"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            経路
          </a>
        </li>
      ))}
    </ul>
  );
}
