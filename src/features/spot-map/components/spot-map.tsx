"use client";

import L from "leaflet";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import {
  createMapTracker,
  type MapTracker,
} from "@/features/analytics/utils/map-tracking";
import {
  DEFAULT_ZOOM,
  FIT_BOUNDS_PADDING,
  MAX_ZOOM,
  TILE_ATTRIBUTION,
  TILE_URL,
} from "@/features/spot-map/constants/map-view";
import type { MapSpot } from "@/features/spot-map/services/spot-map";
import {
  computeInitialView,
  computeSpotBounds,
} from "@/features/spot-map/utils/spot-bounds";
import { useCurrentLocation } from "@/lib/hooks/use-current-location";
import { googleMapsSearchUrl } from "@/lib/utils/map-links";

type SpotMapProps = {
  spots: MapSpot[];
};

/** ピンの色。達成済みは落ち着かせて、未達成を目立たせる */
function pinColor(achieved: boolean): string {
  return achieved ? "var(--app-map-spot-done)" : "var(--app-map-spot-todo)";
}

function createPinIcon(spot: MapSpot): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${pinColor(spot.achieved)};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: 700;
      ">${spot.achieved ? "✓" : ""}</div>
    `,
    className: "hamadori-spot-pin",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/**
 * 吹き出しの中身を DOM で組む。
 *
 * HTML文字列に流し込むとミッション名がそのままマークアップとして解釈される。
 * 名前は管理画面から自由に入れられるので、文字列連結では作らない。
 */
function createPopupContent(spot: MapSpot): HTMLElement {
  const root = document.createElement("div");
  root.className = "min-w-[180px] space-y-2 text-center";

  const title = document.createElement("p");
  title.className = "text-sm font-bold";
  title.textContent = spot.title;
  root.appendChild(title);

  const points = document.createElement("p");
  points.className = "text-xs text-gray-600";
  points.textContent = spot.achieved
    ? `獲得済み（${spot.points}P）`
    : `${spot.points}P`;
  root.appendChild(points);

  const detail = document.createElement("a");
  detail.href = `/missions/${spot.slug}`;
  detail.className =
    "block rounded-md bg-gray-900 px-3 py-1.5 text-xs font-bold text-white no-underline";
  detail.textContent = "クエストを見る";
  root.appendChild(detail);

  const maps = document.createElement("a");
  maps.href = googleMapsSearchUrl(spot.latitude, spot.longitude);
  maps.target = "_blank";
  maps.rel = "noopener noreferrer";
  maps.className = "block text-xs underline underline-offset-2";
  maps.textContent = "Google マップで開く";
  root.appendChild(maps);

  return root;
}

export default function SpotMap({ spots }: SpotMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const trackerRef = useRef<MapTracker | null>(null);
  // マーカーは張り替えるので、可視判定のために最新のスポットを ref で持つ
  const spotsRef = useRef(spots);
  spotsRef.current = spots;
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const { currentPos, handleLocate } = useCurrentLocation(mapInstance);
  // 初期表示の位置は最初のスポットから決める。あとでスポットが変わっても
  // 勝手に地図が動くと、利用者がずらした表示を奪ってしまう
  const initialSpotsRef = useRef(spots);

  // 地図の生成は1回だけ。スポットの増減では作り直さない
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    // 共通の現在地hookが window.L を見るので渡しておく
    (window as Window & { L?: typeof L }).L = L;

    const initialSpots = initialSpotsRef.current;
    const { center, zoom } = computeInitialView(initialSpots);
    const map = L.map(container, { maxZoom: MAX_ZOOM }).setView(center, zoom);
    mapRef.current = map;

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: MAX_ZOOM,
    }).addTo(map);

    const bounds = computeSpotBounds(initialSpots);
    if (bounds) {
      map.fitBounds([bounds.southWest, bounds.northEast], {
        padding: [FIT_BOUNDS_PADDING, FIT_BOUNDS_PADDING],
        maxZoom: DEFAULT_ZOOM + 4,
      });
    }

    // 地図の操作を計測する。中心座標は残さず、ズームと画面内のスポットだけ記録する
    const tracker = createMapTracker({
      mapId: "spot-map",
      getZoom: () => map.getZoom(),
      getVisibleSpotIds: () => {
        const viewBounds = map.getBounds();
        return spotsRef.current
          .filter((spot) =>
            viewBounds.contains(L.latLng(spot.latitude, spot.longitude)),
          )
          .map((spot) => spot.id);
      },
    });
    trackerRef.current = tracker;

    const handleMove = () => tracker.reportMove();
    // dragend / zoomend だけを見る。moveend は自動移動でも発火してしまう
    map.on("dragend", handleMove);
    map.on("zoomend", handleMove);

    setMapInstance(map);

    return () => {
      map.off("dragend", handleMove);
      map.off("zoomend", handleMove);
      tracker.dispose();
      trackerRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, []);

  // マーカーはスポットが変わるたびに張り替える
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = spots.map((spot) =>
      L.marker([spot.latitude, spot.longitude], { icon: createPinIcon(spot) })
        .bindPopup(createPopupContent(spot))
        .on("click", () =>
          trackerRef.current?.reportMarkerClick({
            id: spot.id,
            title: spot.title,
          }),
        )
        .addTo(map),
    );

    return () => {
      for (const marker of markers) marker.remove();
    };
  }, [spots]);

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="h-[65vh] min-h-[320px] w-full rounded-xl border border-gray-200"
        // 地図はマウス・タッチで操作する図形。読み上げ向けには下の一覧を用意している
        aria-hidden="true"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          <span
            className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle"
            style={{ backgroundColor: "var(--app-map-spot-todo)" }}
          />
          未達成
          <span
            className="ml-3 mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle"
            style={{ backgroundColor: "var(--app-map-spot-done)" }}
          />
          達成済み
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLocate}
          disabled={!currentPos}
        >
          <LocateFixed className="mr-1 h-4 w-4" aria-hidden="true" />
          現在地へ
        </Button>
      </div>
    </div>
  );
}
