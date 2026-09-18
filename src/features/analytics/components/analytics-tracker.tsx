"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { buildElementPath } from "../utils/element-path";
import { PageRegionTracker } from "../utils/page-regions";
import { createEventId, resolveSession } from "../utils/session-store";
import { flushAnalytics, trackEvent } from "../utils/tracker";

/**
 * サイト全体の自動計測。
 *
 * 取るもの:
 *   - page_view        どのページを開いたか（ルート遷移ごと）
 *   - scroll_depth     25/50/75/100% に到達した瞬間と、そこまでの経過時間
 *   - page_engagement  そのページ表示での滞在時間・最大スクロール到達率
 *   - click            ボタン・リンクなど操作できる要素のクリック
 *   - outbound_click   外部ドメインへの離脱クリック
 *
 * page_engagement には、ページを高さで10等分した帯ごとの表示時間と
 * セクションごとの表示時間（region_dwell）も載せる。
 * 「どの画面のどの場所にどれくらいいたか」を、ページ側の対応なしで取れるようにするため。
 *
 * page_view / scroll_depth / page_engagement / click は同じ page_view_id を持つので、
 * 「1回のページ表示」単位で滞在と読了率を突き合わせられる。
 */

/** スクロール到達率のマイルストーン */
const SCROLL_MILESTONES = [25, 50, 75, 100] as const;
/** 無操作がこれだけ続いたら「滞在はしているが読んでいない」とみなしエンゲージメント計上を止める */
const INTERACTION_IDLE_MS = 30 * 1000;
/** 滞在時間の積算間隔 */
const TICK_INTERVAL_MS = 1000;
/**
 * 1回の積算で加算を許す上限。
 * PCのスリープ復帰やタブの復帰で巨大な差分が出たときに、滞在時間が跳ね上がるのを防ぐ。
 */
const MAX_TICK_DELTA_MS = 60 * 1000;
/** クリックしたテキストを記録する長さの上限 */
const MAX_LABEL_LENGTH = 80;

/**
 * クリックを記録する対象。
 * 「全てのボタン」を取りこぼさないよう、実際の button 要素だけでなく
 * role でボタンを名乗る要素や、カード全体がリンクになっている作りも拾う。
 */
const CLICKABLE_SELECTOR = [
  "[data-analytics-id]",
  "a[href]",
  "button",
  "summary",
  "select",
  "label[for]",
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  'input[type="submit"]',
  'input[type="button"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
].join(", ");

/**
 * 離脱イベントが連続したときに、同じ内容の page_engagement を送らないためのしきい値。
 * 画面非表示と pagehide は数ミリ秒差で続けて発火し、その間にも滞在時間が数ミリ秒進むため、
 * 完全一致では重複を止められない。
 */
const ENGAGEMENT_RESEND_TOLERANCE_MS = 500;

/** セクションを走査し直すタイミング。ストリーミングで後から届く本文を拾うため */
const SECTION_RESCAN_DELAYS_MS = [1500, 4000];

interface PageViewState {
  id: string;
  path: string;
  query: string | null;
  title: string;
  startedAt: number;
  isVisible: boolean;
  visibleMs: number;
  engagedMs: number;
  lastTickAt: number;
  lastInteractionAt: number;
  maxScrollPct: number;
  maxScrollDepthPx: number;
  pageHeightPx: number;
  firedMilestones: Set<number>;
  regions: PageRegionTracker;
  /**
   * 直前に送った page_engagement の内容。
   * タブ非表示と pagehide は連続して発火するため、中身が変わっていなければ送らない
   */
  lastSentEngagedMs: number | null;
  lastSentMaxScrollPct: number | null;
}

function createPageViewState(
  path: string,
  query: string | null,
): PageViewState {
  const now = Date.now();
  return {
    id: createEventId(),
    path,
    query,
    title: document.title,
    startedAt: now,
    isVisible: document.visibilityState === "visible",
    visibleMs: 0,
    engagedMs: 0,
    lastTickAt: now,
    // 表示直後は「読んでいる」とみなして計上を始める
    lastInteractionAt: now,
    maxScrollPct: 0,
    maxScrollDepthPx: 0,
    pageHeightPx: 0,
    firedMilestones: new Set<number>(),
    regions: new PageRegionTracker(),
    lastSentEngagedMs: null,
    lastSentMaxScrollPct: null,
  };
}

/** 経過時間を滞在時間へ積算する。可視でなかった区間は数えない */
function accumulate(state: PageViewState, now: number): void {
  const delta = Math.min(now - state.lastTickAt, MAX_TICK_DELTA_MS);
  state.lastTickAt = now;
  if (delta <= 0) return;

  if (!state.isVisible) return;

  state.visibleMs += delta;
  // 画面に映っている帯・セクションにも同じ時間を配る
  state.regions.accumulate(delta);
  if (now - state.lastInteractionAt <= INTERACTION_IDLE_MS) {
    state.engagedMs += delta;
  }
}

/** 現在のスクロール到達率(0-100)と、可視領域下端のページ内位置を返す */
function readScrollPosition(): {
  pct: number;
  depthPx: number;
  pageHeightPx: number;
} {
  const doc = document.documentElement;
  const pageHeightPx = Math.max(
    doc.scrollHeight,
    doc.offsetHeight,
    document.body?.scrollHeight ?? 0,
    document.body?.offsetHeight ?? 0,
  );
  const viewportHeight = window.innerHeight || doc.clientHeight || 0;
  const depthPx = Math.round(
    (window.scrollY || doc.scrollTop || 0) + viewportHeight,
  );

  // ページが1画面に収まっている場合はスクロールしようがないので、表示=100%到達とする
  if (pageHeightPx <= viewportHeight) {
    return { pct: 100, depthPx: Math.min(depthPx, pageHeightPx), pageHeightPx };
  }

  const pct = Math.min(
    100,
    Math.max(0, Math.round((depthPx / pageHeightPx) * 100)),
  );
  return { pct, depthPx, pageHeightPx };
}

function labelOf(element: Element): string | null {
  const text = (element as HTMLElement).innerText ?? element.textContent ?? "";
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.slice(0, MAX_LABEL_LENGTH);
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageRef = useRef<PageViewState | null>(null);
  // 同じURLで effect が二重に走っても page_view を重複して送らないための番人。
  // React の StrictMode は開発時に effect を2回実行する
  const lastPageKeyRef = useRef<string | null>(null);

  // クエリだけが変わるページ（ランキングのタブ等）も別のページ表示として数えたいので、
  // pathname と併せて effect の依存に使う
  const query = searchParams.toString();

  // 送信系は複数の effect / イベントハンドラから呼ぶので ref に載せる
  const sendEngagementRef = useRef<
    (reason: string, immediate: boolean) => void
  >(() => {});

  sendEngagementRef.current = (reason: string, immediate: boolean) => {
    const state = pageRef.current;
    if (!state) return;

    accumulate(state, Date.now());

    // 離脱時点の到達率も取り込む。
    // スクロールが一度も起きなかったページ（1画面に収まる・本文が遅れて伸びた）は
    // ここで初めて到達率が確定する。表示直後に測ると、ストリーミングで本文が
    // 届く前の高さを見てしまい、どのページも100%読了に見えてしまう
    const current = readScrollPosition();
    state.pageHeightPx = current.pageHeightPx;
    if (current.pct > state.maxScrollPct) state.maxScrollPct = current.pct;
    if (current.depthPx > state.maxScrollDepthPx) {
      state.maxScrollDepthPx = current.depthPx;
    }

    const engagedMs = Math.round(state.engagedMs);

    // 非表示 → pagehide のように離脱イベントが連続しても、
    // 実質同じ内容なら送らない（同一ページ表示の重複行を作らない）
    if (
      state.lastSentEngagedMs !== null &&
      Math.abs(engagedMs - state.lastSentEngagedMs) <
        ENGAGEMENT_RESEND_TOLERANCE_MS &&
      state.lastSentMaxScrollPct === state.maxScrollPct
    ) {
      return;
    }
    state.lastSentEngagedMs = engagedMs;
    state.lastSentMaxScrollPct = state.maxScrollPct;

    trackEvent("page_engagement", {
      pageViewId: state.id,
      pagePath: state.path,
      pageQuery: state.query,
      pageTitle: state.title,
      engagedMs,
      visibleMs: Math.round(state.visibleMs),
      msSincePageView: Date.now() - state.startedAt,
      maxScrollPct: state.maxScrollPct,
      scrollDepthPx: state.maxScrollDepthPx,
      pageHeightPx: state.pageHeightPx,
      regionDwell: state.regions.snapshot(),
      props: { reason },
      immediate,
    });
  };

  // ページ表示ごと: 直前のページを締めて page_view を送る
  useEffect(() => {
    const pageKey = `${pathname}?${query}`;
    if (lastPageKeyRef.current === pageKey) return;
    lastPageKeyRef.current = pageKey;

    // 前のページ表示の滞在を確定させる。
    // この時点で DOM は次のページに入れ替わっているので、領域の計測だけ先に打ち切る
    if (pageRef.current) {
      pageRef.current.regions.stop();
      sendEngagementRef.current("navigate", false);
    }

    const { isNew } = resolveSession();
    const state = createPageViewState(pathname, query || null);
    pageRef.current = state;

    if (isNew) {
      trackEvent("session_start", { pageViewId: state.id });
    }

    trackEvent("page_view", {
      pageViewId: state.id,
      pagePath: state.path,
      pageQuery: state.query,
      pageTitle: state.title,
      // 外部からの流入かサイト内遷移かをイベント単位でも見られるようにする
      pageReferrer: document.referrer || null,
    });

    state.regions.rescanSections();

    // ストリーミングで本文が後から届くページがあるので、少し待ってから探し直す
    const rescanTimers = SECTION_RESCAN_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        if (pageRef.current === state) state.regions.rescanSections();
      }, delay),
    );

    return () => {
      for (const timer of rescanTimers) clearTimeout(timer);
    };
  }, [pathname, query]);

  // 滞在時間の積算
  useEffect(() => {
    const timer = setInterval(() => {
      const state = pageRef.current;
      if (state) accumulate(state, Date.now());
    }, TICK_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  // 操作・スクロール・離脱の監視
  useEffect(() => {
    const markInteraction = () => {
      const state = pageRef.current;
      if (!state) return;
      const now = Date.now();
      accumulate(state, now);
      state.lastInteractionAt = now;
    };

    let scrollFrame: number | null = null;
    const handleScroll = () => {
      if (scrollFrame !== null) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        const state = pageRef.current;
        if (!state) return;

        markInteraction();

        const { pct, depthPx, pageHeightPx } = readScrollPosition();
        state.pageHeightPx = pageHeightPx;
        if (depthPx > state.maxScrollDepthPx) state.maxScrollDepthPx = depthPx;
        if (pct <= state.maxScrollPct) return;
        state.maxScrollPct = pct;

        // 到達したマイルストーンを、到達までの経過時間つきで記録する。
        // 一気にスクロールされた場合はまとめて複数発火する
        for (const milestone of SCROLL_MILESTONES) {
          if (pct < milestone || state.firedMilestones.has(milestone)) continue;
          state.firedMilestones.add(milestone);
          trackEvent("scroll_depth", {
            pageViewId: state.id,
            pagePath: state.path,
            pageQuery: state.query,
            pageTitle: state.title,
            scrollPct: milestone,
            maxScrollPct: pct,
            scrollDepthPx: depthPx,
            pageHeightPx,
            msSincePageView: Date.now() - state.startedAt,
            engagedMs: Math.round(state.engagedMs),
          });
        }
      });
    };

    const handleVisibilityChange = () => {
      const state = pageRef.current;
      if (!state) return;
      const now = Date.now();
      // 可視状態を切り替える前に、それまでの区間を積算する
      accumulate(state, now);
      state.isVisible = document.visibilityState === "visible";

      if (state.isVisible) {
        // 戻ってきた時点を操作とみなす
        state.lastInteractionAt = now;
        return;
      }
      // スマホではタブ非表示がそのまま離脱になることが多いので、ここで送り切る
      sendEngagementRef.current("hidden", true);
    };

    const handlePageHide = () => {
      sendEngagementRef.current("pagehide", true);
      flushAnalytics(true);
    };

    const handleClick = (event: MouseEvent) => {
      markInteraction();

      const state = pageRef.current;
      const target = event.target;
      if (!state || !(target instanceof Element)) return;

      const tracked = target.closest<HTMLElement>(CLICKABLE_SELECTOR);
      if (!tracked) return;

      const analyticsId = tracked.getAttribute("data-analytics-id");
      const anchor = tracked instanceof HTMLAnchorElement ? tracked : null;
      const href = anchor?.href ?? null;

      const isOutbound = (() => {
        if (!href) return false;
        try {
          const url = new URL(href, window.location.href);
          return (
            (url.protocol === "http:" || url.protocol === "https:") &&
            url.hostname !== window.location.hostname
          );
        } catch {
          return false;
        }
      })();

      const common = {
        pageViewId: state.id,
        pagePath: state.path,
        pageQuery: state.query,
        pageTitle: state.title,
        msSincePageView: Date.now() - state.startedAt,
        scrollPct: state.maxScrollPct,
        props: {
          analyticsId,
          href,
          label: labelOf(tracked),
          tag: tracked.tagName.toLowerCase(),
          role: tracked.getAttribute("role"),
          // どのボタンかを後から特定するための位置表現
          elementPath: buildElementPath(tracked),
        },
      };

      if (isOutbound) {
        // 離脱してしまう前に送り切る
        trackEvent("outbound_click", { ...common, immediate: true });
        return;
      }
      trackEvent("click", common);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("click", handleClick, { capture: true });
    for (const eventName of ["keydown", "pointerdown", "touchstart"] as const) {
      document.addEventListener(eventName, markInteraction, { passive: true });
    }

    return () => {
      if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("click", handleClick, { capture: true });
      for (const eventName of [
        "keydown",
        "pointerdown",
        "touchstart",
      ] as const) {
        document.removeEventListener(eventName, markInteraction);
      }
    };
  }, []);

  return null;
}
