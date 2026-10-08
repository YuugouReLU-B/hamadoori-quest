"use client";

import { Loader2, LocateFixed } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createMapTracker,
  type MapTracker,
} from "@/features/analytics/utils/map-tracking";
import { loadGoogleMaps } from "@/features/missions/utils/load-google-maps";
import type { MapSpot } from "@/features/spot-map/services/spot-map";
import { questMapHref } from "@/lib/utils/map-links";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// 初期表示は浜通り全体が入る位置と倍率に固定する。fitBounds に任せると
// 東京のクエストまで含めた範囲に合わせてしまい、東北全体まで引いてしまう
const DEFAULT_CENTER = { lat: 37.45, lng: 140.85 };
const DEFAULT_ZOOM = 10;
// 吹き出しの中のリンクを押せるように、ピンから離れてもすぐには閉じない
const INFO_WINDOW_CLOSE_DELAY_MS = 200;

const TODO_COLOR = "#9ca3af";
const DONE_COLOR = "#facc15";
const SELECTED_COLOR = "#ef4444";

type MissionsGoogleMapProps = {
  spots: MapSpot[];
  currentPos: [number, number] | null;
  /** 「現在地へ」を押したときに現在地を1回取得する。取れなければ null */
  onRequestLocation: () => Promise<[number, number] | null>;
  /** 現在地を取得中か */
  locating: boolean;
  /** 現在地を取得できなかったときの案内 */
  locationError: string | null;
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
  maps.href =
    questMapHref(spot.googleMapUrl, spot.latitude, spot.longitude) ?? "";
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
  onRequestLocation,
  locating,
  locationError,
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
  // マーカーの作り直しを選択のたびに起こさないよう、コールバックは ref で読む
  const onSelectSpotRef = useRef(onSelectSpot);
  onSelectSpotRef.current = onSelectSpot;
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const scheduleInfoWindowClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      infoWindowRef.current?.close();
      closeTimerRef.current = null;
    }, INFO_WINDOW_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const openInfoWindow = useCallback(
    (spot: MapSpot, marker: google.maps.Marker) => {
      const map = mapRef.current;
      if (!map) return;
      clearCloseTimer();
      const content = createInfoWindowContent(spot);
      // 吹き出しへポインタが移った間は閉じない。中のリンクを押せるようにする
      content.addEventListener("mouseenter", clearCloseTimer);
      content.addEventListener("mouseleave", scheduleInfoWindowClose);
      infoWindowRef.current?.setContent(content);
      infoWindowRef.current?.open({ map, anchor: marker });
    },
    [clearCloseTimer, scheduleInfoWindowClose],
  );

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

    mapRef.current = new google.maps.Map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    infoWindowRef.current = new google.maps.InfoWindow();
  }, [ready]);

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

  // マーカーの張り替え。
  //
  // 選択状態はここに入れない。依存に入れるとピンを押すたびにマーカーを
  // 作り直すことになり、地図が動いて見た目の拡大率が戻ってしまう。
  // 見た目の更新は下の別effectで setIcon するだけにしてある。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    for (const marker of Array.from(markersRef.current.values())) {
      google.maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
    }
    markersRef.current = new Map();

    for (const spot of spots) {
      const marker = new google.maps.Marker({
        position: { lat: spot.latitude, lng: spot.longitude },
        map,
        title: spot.title,
        icon: createMarkerIcon(spot, false),
      });

      marker.addListener("click", () => {
        trackerRef.current?.reportMarkerClick({
          id: spot.id,
          title: spot.title,
        });
        onSelectSpotRef.current(spot.id);
        openInfoWindow(spot, marker);
      });
      // ホバーでも中身を見せる。タップ端末にホバーは無いので click も残す
      marker.addListener("mouseover", () => openInfoWindow(spot, marker));
      marker.addListener("mouseout", scheduleInfoWindowClose);

      markersRef.current.set(spot.id, marker);
    }

    return () => {
      clearCloseTimer();
    };
  }, [spots, ready, openInfoWindow, scheduleInfoWindowClose, clearCloseTimer]);

  // 選択されたピンだけ見た目を差し替える。地図は動かさない
  useEffect(() => {
    if (!ready) return;
    for (const [id, marker] of Array.from(markersRef.current.entries())) {
      const spot = spots.find((s) => s.id === id);
      if (!spot) continue;
      const isSelected = id === selectedSpotId;
      marker.setIcon(createMarkerIcon(spot, isSelected));
      marker.setZIndex(isSelected ? 999 : undefined);
    }
  }, [selectedSpotId, ready, spots]);

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

  // 現在地は押したときにだけ取得する。画面を開いただけでは取らない
  const handleLocate = async () => {
    const pos = await onRequestLocation();
    const map = mapRef.current;
    if (!map || !pos) return;
    onSelectSpot(null);
    map.panTo({ lat: pos[0], lng: pos[1] });
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
          disabled={locating}
        >
          {locating ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LocateFixed className="mr-1 h-4 w-4" aria-hidden="true" />
          )}
          現在地へ
        </Button>
      </div>

      {locationError && (
        <output className="block text-sm text-red-600">{locationError}</output>
      )}
    </div>
  );
}
