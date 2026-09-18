"use client";

import type {
  AnalyticsEventName,
  AnalyticsGeoPoint,
  CollectEventInput,
  CollectSessionInput,
  RegionDwellPayload,
} from "../types";
import {
  createEventId,
  nextSeq,
  resolveSession,
  resolveTabId,
} from "./session-store";

/**
 * 計測イベントのキューイングと送信。
 *
 * ページ離脱時にも確実に届けたいので、送信は sendBeacon を第一候補にする。
 * sendBeacon は unload 後もブラウザが送り切ってくれる一方、成否をJS側で
 * 待てないため、失敗が返った場合だけ keepalive 付き fetch に落とす。
 */

const ENDPOINT = "/api/analytics/collect";

/** まとめ送りの待ち時間。page_view とその直後のスクロールを1リクエストに束ねる */
const FLUSH_DEBOUNCE_MS = 1500;
/** キューが溜まりすぎたら待たずに送る */
const MAX_BATCH_SIZE = 20;
/** 送信できずに溜まり続けた場合の上限。これを超えたら古いものから捨てる */
const MAX_QUEUE_SIZE = 200;
/** GPS座標をイベントに添付してよい鮮度 */
const GPS_MAX_AGE_MS = 5 * 60 * 1000;

let queue: CollectEventInput[] = [];
/**
 * キューに入っているイベントが属するセッション。
 * 送信時ではなくイベント発生時に確定させる。送信を待っている間に
 * アイドル30分をまたぐと、古いイベントが新しいセッションに付け替わってしまうため。
 */
let queuedSession: CollectSessionInput | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let latestGps: AnalyticsGeoPoint | null = null;

/**
 * 地図・ジオチェックインなど、すでに位置情報の利用に同意を得ている画面から
 * 現在地を渡してもらう。ここで渡された座標だけがイベントに添付される。
 * トラッカー側から navigator.geolocation を呼ぶことは一切しない。
 */
export function setAnalyticsGps(
  position: Pick<AnalyticsGeoPoint, "latitude" | "longitude"> & {
    accuracyMeters?: number | null;
  },
): void {
  latestGps = {
    latitude: position.latitude,
    longitude: position.longitude,
    accuracyMeters: position.accuracyMeters ?? null,
    capturedAt: Date.now(),
  };
}

/** 位置情報の利用をやめた画面から呼ぶ（地図から離れたとき等） */
export function clearAnalyticsGps(): void {
  latestGps = null;
}

function freshGps(): AnalyticsGeoPoint | null {
  if (!latestGps) return null;
  if (Date.now() - latestGps.capturedAt > GPS_MAX_AGE_MS) return null;
  return latestGps;
}

function send(payload: string, preferBeacon: boolean): void {
  if (preferBeacon && typeof navigator.sendBeacon === "function") {
    // Blob に type を付けないと Content-Type が text/plain になり、
    // route handler 側の req.json() が通らない
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon(ENDPOINT, blob)) {
      return;
    }
  }

  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    // 離脱中でも送り切らせる
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {
    // 解析データの取りこぼしでユーザー体験を壊さない。失敗は黙って捨てる
  });
}

export function flushAnalytics(preferBeacon = false): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0 || !queuedSession) return;

  const events = queue;
  const session = queuedSession;
  queue = [];
  queuedSession = null;

  send(JSON.stringify({ session, events }), preferBeacon);
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushAnalytics(false);
  }, FLUSH_DEBOUNCE_MS);
}

export interface TrackOptions {
  pageViewId?: string | null;
  pagePath?: string | null;
  pageQuery?: string | null;
  pageTitle?: string | null;
  pageReferrer?: string | null;
  engagedMs?: number | null;
  visibleMs?: number | null;
  msSincePageView?: number | null;
  scrollPct?: number | null;
  maxScrollPct?: number | null;
  scrollDepthPx?: number | null;
  pageHeightPx?: number | null;
  regionDwell?: RegionDwellPayload | null;
  props?: Record<string, unknown> | null;
  /** 離脱時など、待たずに送り切りたいイベント */
  immediate?: boolean;
}

/**
 * 任意のイベントを記録する。
 *
 * 画面側からはこれだけを呼べばよい。ページ情報を渡さなかった場合は
 * 呼び出し時点の location から補完する。
 */
export function trackEvent(
  eventName: AnalyticsEventName,
  options: TrackOptions = {},
): void {
  if (typeof window === "undefined") return;

  const { immediate, ...rest } = options;

  // セッションはイベント発生のたびに解決する。これが最終アクティビティの更新も兼ねる
  const { session } = resolveSession();
  if (queuedSession && queuedSession.sessionId !== session.sessionId) {
    // セッションが切り替わった。古いセッションのイベントを先に送り切る
    flushAnalytics(false);
  }
  queuedSession = session;

  const event: CollectEventInput = {
    eventId: createEventId(),
    tabId: resolveTabId(),
    seq: nextSeq(),
    eventName,
    occurredAt: new Date().toISOString(),
    pagePath: rest.pagePath ?? window.location.pathname,
    pageQuery:
      rest.pageQuery ??
      (window.location.search ? window.location.search.slice(1) : null),
    pageTitle: rest.pageTitle ?? document.title ?? null,
    pageReferrer: rest.pageReferrer ?? null,
    pageViewId: rest.pageViewId ?? null,
    engagedMs: rest.engagedMs ?? null,
    visibleMs: rest.visibleMs ?? null,
    msSincePageView: rest.msSincePageView ?? null,
    scrollPct: rest.scrollPct ?? null,
    maxScrollPct: rest.maxScrollPct ?? null,
    scrollDepthPx: rest.scrollDepthPx ?? null,
    pageHeightPx: rest.pageHeightPx ?? null,
    gps: freshGps(),
    regionDwell: rest.regionDwell ?? null,
    props: rest.props ?? null,
  };

  queue.push(event);
  if (queue.length > MAX_QUEUE_SIZE) {
    // 古いものから捨てる。直近の行動のほうが分析価値が高い
    queue = queue.slice(-MAX_QUEUE_SIZE);
  }

  if (immediate || queue.length >= MAX_BATCH_SIZE) {
    flushAnalytics(Boolean(immediate));
    return;
  }
  scheduleFlush();
}
