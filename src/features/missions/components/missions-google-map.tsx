"use client";

import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createMapTracker,
  type MapTracker,
} from "@/features/analytics/utils/map-tracking";
import { loadGoogleMaps } from "@/features/missions/utils/load-google-maps";
import type { MapSpot } from "@/features/spot-map/services/spot-map";
import { googleMapsSearchUrl } from "@/lib/utils/map-links";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const TODO_COLOR = "#9ca3af";
const DONE_COLOR = "#facc15";
const SELECTED_COLOR = "#ef4444";

type MissionsGoogleMapProps = {
  spots: MapSpot[];
  currentPos: [number, number] | null;
  selectedSpotId: string | null;
  onSelectSpot: (id: string | null) => void;
};

function createMarkerIcon(
  spot: MapSpot,
  isSelected: boolean,
): google.maps.Icon {
  const color = isSelected
    ? SELECTED_COLOR
    : spot.achieved
      ? DONE_COLOR
      : TODO_COLOR;
  const check = spot.achieved
    ? '<path d="M8.5 14l3 3 6-6.5" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="3"/>${check}</svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(28, 28),
    anchor: new google.maps.Point(14, 14),
  };
}

function createInfoWindowContent(spot: MapSpot): HTMLElement {
  const root = document.createElement("div");
  root.className = "min-w-[180px] space-y-2 text-center";

  const title = document.createElement("p");
  title.className = "text-sm font-bold";
  title.textContent = spot.title;
  root.appendChild(title);

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

export function MissionsGoogleMap({
  spots,
  currentPos,
  selectedSpotId,
  onSelectSpot,
}: MissionsGoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const trackerRef = useRef<MapTracker | null>(null);
  // マーカーは張り替えるので、可視判定のために最新のスポットを ref で持つ
  const spotsRef = useRef(spots);
  spotsRef.current = spots;
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const currentPosMarkerRef = useRef<google.maps.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Google Maps本体の読み込み
  useEffect(() => {
    if (!API_KEY) return;
    let cancelled = false;
    loadGoogleMaps(API_KEY)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 地図本体の生成（1回だけ）
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;

    const first = spots[0];
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: first
        ? { lat: first.latitude, lng: first.longitude }
        : { lat: 37.4, lng: 141.0 },
      zoom: 10,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    infoWindowRef.current = new google.maps.InfoWindow();
    // mapRef.currentのガードにより地図の生成は初回のみ実行される
  }, [ready, spots[0]]);

  // 地図の操作の計測。
  // 上の地図生成effectに同居させないのは、あちらが mapRef.current のガードで
  // 初回しか本体を実行しないため。依存が変わって再実行されるとクリーンアップだけが走り、
  // 購読が外れたまま元に戻らなくなる
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    // 中心座標は残さず、ズームと画面内のスポットだけ記録する
    const tracker = createMapTracker({
      mapId: "missions-map",
      getZoom: () => map.getZoom() ?? null,
      getVisibleSpotIds: () => {
        const viewBounds = map.getBounds();
        if (!viewBounds) return [];
        return spotsRef.current
          .filter((spot) =>
            viewBounds.contains(
              new google.maps.LatLng(spot.latitude, spot.longitude),
            ),
          )
          .map((spot) => spot.id);
      },
    });
    trackerRef.current = tracker;

    // dragend と zoom_changed だけを見る。idle は fitBounds などの自動移動でも発火する
    const listeners = [
      map.addListener("dragend", () => tracker.reportMove()),
      map.addListener("zoom_changed", () => tracker.reportMove()),
    ];

    return () => {
      for (const listener of listeners) listener.remove();
      tracker.dispose();
      trackerRef.current = null;
    };
  }, [ready]);

  // マーカーの張り替え
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    for (const marker of Array.from(markersRef.current.values())) {
      marker.setMap(null);
    }
    markersRef.current = new Map();

    const bounds = new google.maps.LatLngBounds();
    for (const spot of spots) {
      const isSelected = spot.id === selectedSpotId;
      const marker = new google.maps.Marker({
        position: { lat: spot.latitude, lng: spot.longitude },
        map,
        title: spot.title,
        icon: createMarkerIcon(spot, isSelected),
        zIndex: isSelected ? 999 : undefined,
      });
      marker.addListener("click", () => {
        trackerRef.current?.reportMarkerClick({
          id: spot.id,
          title: spot.title,
        });
        onSelectSpot(spot.id);
        infoWindowRef.current?.setContent(createInfoWindowContent(spot));
        infoWindowRef.current?.open({ map, anchor: marker });
      });
      markersRef.current.set(spot.id, marker);
      bounds.extend(marker.getPosition() as google.maps.LatLng);
    }

    if (spots.length > 1) {
      map.fitBounds(bounds, 48);
    } else if (spots.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(15);
    }
  }, [spots, ready, selectedSpotId, onSelectSpot]);

  // 現在地マーカー
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    currentPosMarkerRef.current?.setMap(null);
    currentPosMarkerRef.current = null;

    if (currentPos) {
      const [lat, lng] = currentPos;
      currentPosMarkerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: "あなたの現在地",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#2563eb",
          fillOpacity: 0.8,
          strokeColor: "white",
          strokeWeight: 2,
        },
      });
    }
  }, [currentPos, ready]);

  const handleLocate = () => {
    const map = mapRef.current;
    if (!map || !currentPos) return;
    onSelectSpot(null);
    map.panTo({ lat: currentPos[0], lng: currentPos[1] });
    map.setZoom(15);
  };

  if (!API_KEY) {
    return (
      <div className="flex h-[65vh] min-h-[320px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
        <p>Google MapsのAPIキーが設定されていません。</p>
        <p>環境変数 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を設定してください。</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-[65vh] min-h-[320px] w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
        地図の読み込みに失敗しました。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="h-[65vh] min-h-[320px] w-full rounded-xl border border-gray-200"
        aria-hidden="true"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          <span
            className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle"
            style={{ backgroundColor: TODO_COLOR }}
          />
          未達成
          <span
            className="ml-3 mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle"
            style={{ backgroundColor: DONE_COLOR }}
          />
          達成済み
          <span
            className="ml-3 mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle"
            style={{ backgroundColor: SELECTED_COLOR }}
          />
          選択中
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
