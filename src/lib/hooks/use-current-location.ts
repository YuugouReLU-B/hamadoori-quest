"use client";

import type { CircleMarker, Map as LeafletMap } from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { readTokenColor } from "@/lib/design/color-tokens";

type LeafletWindow = Window & { L: typeof import("leaflet") };

interface UseCurrentLocationOptions {
  /** 初回の現在地取得時に自動で現在地に移動するか (default: false) */
  flyToOnFirstLocation?: boolean;
}

export type LocateStatus = "idle" | "locating" | "located" | "error";

export const LOCATION_PERMISSION_DENIED_MESSAGE =
  "位置情報の利用が許可されていません。端末の位置情報設定を確認してください。";
export const LOCATION_UNAVAILABLE_MESSAGE =
  "位置情報を取得できませんでした。端末の位置情報設定を確認してください。";

// GeolocationPositionError.PERMISSION_DENIED。jsdom などで定数が無い環境もあるので数値で持つ
const PERMISSION_DENIED = 1;

/**
 * 現在地の取得とマーカー表示を管理するhook。
 *
 * プライバシーポリシー上、位置情報は利用者が操作したときにだけ取得する。
 * 画面を開いただけでは取得せず、`requestLocation`（または `handleLocate`）が
 * 呼ばれたときに `getCurrentPosition` を1回だけ呼ぶ。`watchPosition` による
 * 継続取得はしない。取得した座標はブラウザ内で使うだけでサーバーへは送らない。
 */
export function useCurrentLocation(
  mapInstance: LeafletMap | null,
  options: UseCurrentLocationOptions = {},
) {
  const { flyToOnFirstLocation = false } = options;
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<LocateStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentMarkerRef = useRef<CircleMarker | null>(null);
  const hasFlownToLocationRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /** 現在地を1回だけ取得する。取れなければ null */
  const requestLocation = useCallback((): Promise<[number, number] | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setErrorMessage(LOCATION_UNAVAILABLE_MESSAGE);
      return Promise.resolve(null);
    }

    setStatus("locating");
    setErrorMessage(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next: [number, number] = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];
          if (isMountedRef.current) {
            setCurrentPos(next);
            setStatus("located");
          }
          resolve(next);
        },
        (error) => {
          if (isMountedRef.current) {
            setStatus("error");
            setErrorMessage(
              error.code === PERMISSION_DENIED
                ? LOCATION_PERMISSION_DENIED_MESSAGE
                : LOCATION_UNAVAILABLE_MESSAGE,
            );
          }
          resolve(null);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
      );
    });
  }, []);

  // 初回の現在地取得時に自動で飛ぶ
  useEffect(() => {
    if (
      flyToOnFirstLocation &&
      mapInstance &&
      currentPos &&
      !hasFlownToLocationRef.current
    ) {
      hasFlownToLocationRef.current = true;
      mapInstance.flyTo(currentPos, mapInstance.getZoom(), {
        animate: false,
      });
    }
  }, [flyToOnFirstLocation, mapInstance, currentPos]);

  // Manage current location marker
  useEffect(() => {
    if (!mapInstance) return;

    const L = (window as LeafletWindow).L;
    if (!L) return;

    // Remove existing current location marker
    if (currentMarkerRef.current) {
      currentMarkerRef.current.remove();
      currentMarkerRef.current = null;
    }

    // Add marker if current position is available
    if (currentPos) {
      const marker = L.circleMarker(currentPos, {
        radius: 12,
        color: readTokenColor("--app-map-location-stroke"),
        fillColor: readTokenColor("--app-map-location-fill"),
        fillOpacity: 0.7,
        weight: 3,
      })
        .addTo(mapInstance)
        .bindTooltip("あなたの現在地", { permanent: false, direction: "top" });

      currentMarkerRef.current = marker;
    }
  }, [currentPos, mapInstance]);

  // 「現在地へ」ボタン: その場で現在地を取得して移動する
  const handleLocate = useCallback(async () => {
    const pos = await requestLocation();
    if (pos && mapInstance) {
      mapInstance.flyTo(pos, mapInstance.getZoom(), {
        animate: true,
        duration: 0.8,
      });
    }
  }, [requestLocation, mapInstance]);

  return {
    currentPos,
    status,
    errorMessage,
    requestLocation,
    handleLocate,
  };
}
