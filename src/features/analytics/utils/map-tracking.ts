"use client";

import { trackEvent } from "./tracker";

/**
 * 地図の操作の計測。Leaflet と Google Maps の両方から同じ形で使う。
 *
 * 記録するのは「ズーム」と「いま画面に入っているスポットのID」で、
 * 地図の中心座標は残さない。
 * 知りたいのは「どのあたりのスポットを探しているか」であって、それは
 * 自分たちのスポットIDで十分に表現できる。緯度経度をそのまま貯めると、
 * 自宅付近を中心に置いた利用者の居場所が推定できてしまう。
 *
 * 地図はドラッグ1回で何十回もイベントが飛ぶので、必ずここで間引く。
 */

/** 操作が止まってから送るまでの待ち時間。1回のドラッグ／ズームを1件にまとめる */
const MOVE_DEBOUNCE_MS = 1200;
/**
 * 地図生成直後は fitBounds などの自動移動が走るため、この時間は送らない。
 * 利用者の操作と区別がつかず、全セッションに同じ初期表示が記録されてしまう
 */
const INITIAL_SETTLE_MS = 2000;
/** 1ページ表示あたりの map_move の上限。延々とスクロールされても増えすぎないように */
const MAX_MOVES_PER_PAGE = 20;
/** 1イベントに載せるスポットIDの上限 */
const MAX_VISIBLE_IDS = 20;

export interface MapTrackerOptions {
  /** どの地図か。"spot-map" / "missions-map" */
  mapId: string;
  getZoom: () => number | null;
  /** いま画面内に入っているスポットのID */
  getVisibleSpotIds: () => string[];
}

export interface MapTracker {
  /** 地図が動いたときに呼ぶ。内部で間引くので毎回呼んでよい */
  reportMove: () => void;
  /** ピンが押されたときに呼ぶ */
  reportMarkerClick: (spot: { id: string; title?: string | null }) => void;
  /** アンマウント時に呼ぶ */
  dispose: () => void;
}

export function createMapTracker({
  mapId,
  getZoom,
  getVisibleSpotIds,
}: MapTrackerOptions): MapTracker {
  const createdAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let moveCount = 0;
  let disposed = false;

  const flushMove = () => {
    timer = null;
    if (disposed || moveCount >= MAX_MOVES_PER_PAGE) return;

    const visibleSpotIds = getVisibleSpotIds().slice(0, MAX_VISIBLE_IDS);
    moveCount += 1;

    trackEvent("map_move", {
      props: {
        mapId,
        zoom: getZoom(),
        visibleSpotCount: visibleSpotIds.length,
        visibleSpotIds,
      },
    });
  };

  return {
    reportMove() {
      if (disposed) return;
      // 生成直後の自動移動は利用者の操作ではない
      if (Date.now() - createdAt < INITIAL_SETTLE_MS) return;
      if (moveCount >= MAX_MOVES_PER_PAGE) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(flushMove, MOVE_DEBOUNCE_MS);
    },

    reportMarkerClick(spot) {
      if (disposed) return;
      trackEvent("map_marker_click", {
        props: {
          mapId,
          spotId: spot.id,
          spotTitle: spot.title ?? null,
          zoom: getZoom(),
        },
      });
    },

    dispose() {
      disposed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
