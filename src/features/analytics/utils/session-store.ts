"use client";

import { getClientCookie } from "@/lib/utils/cookies";
import type { CollectSessionInput } from "../types";
import { parseUtmParams } from "./attribution";

/**
 * ブラウザ側のセッション管理。
 *
 * visitor_id はここでは扱わない。document.cookie で書いた値は Safari の ITP により
 * 7日で消えてしまい再訪判定が壊れるため、収集API側が HttpOnly cookie として
 * 発行・再読み取りする（analytics/collect の route を参照）。
 *
 * セッションIDだけはアイドル30分での切り替え判定がクライアントにしかできないので、
 * localStorage で保持する。
 */

const SESSION_STORAGE_KEY = "hq_analytics_session";
const TAB_ID_KEY = "hq_analytics_tab_id";
const TAB_SEQ_KEY = "hq_analytics_tab_seq";

/** 無操作がこの時間続いたら次のイベントから新しいセッションにする（GA4と同じ30分） */
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

interface StoredSession extends CollectSessionInput {
  /** 最終アクティビティ(epoch ms)。セッション切り替え判定に使う */
  lastSeenAt: number;
}

function createId(): string {
  // crypto.randomUUID は Safari 15.4 以降。古い端末向けに手書きのフォールバックを持つ
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createEventId(): string {
  return createId();
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.sessionId || typeof parsed.lastSeenAt !== "number")
      return null;
    return parsed;
  } catch {
    // プライベートブラウジング等で localStorage が使えない場合は毎回新規セッション扱い
    return null;
  }
}

function writeStoredSession(session: StoredSession): void {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // 保存できなくても計測自体は続行する
  }
}

/**
 * セッション開始時の流入情報を今のページから組み立てる。
 *
 * ?cv= と ?ref= は campaign-code-handler / referral-code-handler が
 * history.replaceState でURLから削除するため、URLとcookieの両方を見る。
 * cookie は30日保持なので、URL側が取れた場合はそちらを優先する。
 */
function captureEntryContext(): Omit<
  StoredSession,
  "sessionId" | "startedAt" | "lastSeenAt"
> {
  const url = new URL(window.location.href);
  const utm = parseUtmParams(url.searchParams);

  // 同一オリジンからの遷移は「流入」ではないので参照元として記録しない
  const referrer = document.referrer || null;
  const referrerHost = (() => {
    try {
      return referrer ? new URL(referrer).hostname : null;
    } catch {
      return null;
    }
  })();
  const isInternalReferrer = referrerHost === window.location.hostname;

  return {
    landingPath: url.pathname,
    landingQuery: url.search ? url.search.slice(1) : null,
    referrer: isInternalReferrer ? null : referrer,
    ...utm,
    campaignCode:
      url.searchParams.get("cv") || getClientCookie("campaign_code") || null,
    referralCode:
      url.searchParams.get("ref") || getClientCookie("referral_code") || null,
    viewportWidth: window.innerWidth || null,
    viewportHeight: window.innerHeight || null,
    screenWidth: window.screen?.width ?? null,
    screenHeight: window.screen?.height ?? null,
    language: navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
  };
}

/**
 * 現在のセッションを返す。期限切れなら新しいセッションを開始する。
 * 第2戻り値は「このセッションが今まさに始まったか」で、session_start の発火に使う。
 */
export function resolveSession(): {
  session: CollectSessionInput;
  isNew: boolean;
} {
  const now = Date.now();
  const stored = readStoredSession();

  if (stored && now - stored.lastSeenAt < SESSION_IDLE_TIMEOUT_MS) {
    const refreshed: StoredSession = { ...stored, lastSeenAt: now };
    writeStoredSession(refreshed);
    const { lastSeenAt: _lastSeenAt, ...session } = refreshed;
    return { session, isNew: false };
  }

  const created: StoredSession = {
    sessionId: createId(),
    startedAt: new Date(now).toISOString(),
    lastSeenAt: now,
    ...captureEntryContext(),
  };
  writeStoredSession(created);
  const { lastSeenAt: _lastSeenAt, ...session } = created;
  return { session, isNew: true };
}

/** タブごとの識別子。リロードしても同じタブなら維持される */
export function resolveTabId(): string {
  try {
    const existing = window.sessionStorage.getItem(TAB_ID_KEY);
    if (existing) return existing;
    const created = createId();
    window.sessionStorage.setItem(TAB_ID_KEY, created);
    return created;
  } catch {
    return createId();
  }
}

/**
 * タブ内で単調増加する連番を1つ払い出す。
 *
 * カウンタの正はメモリ側に置き、sessionStorage へは復元用に書き戻すだけにしている。
 * sessionStorage が使えない環境でも連番が 0 に張り付かないようにするため。
 */
let seqCounter: number | null = null;

export function nextSeq(): number {
  if (seqCounter === null) {
    try {
      const stored = Number.parseInt(
        window.sessionStorage.getItem(TAB_SEQ_KEY) ?? "0",
        10,
      );
      seqCounter = Number.isFinite(stored) ? stored : 0;
    } catch {
      seqCounter = 0;
    }
  }

  seqCounter += 1;
  try {
    window.sessionStorage.setItem(TAB_SEQ_KEY, String(seqCounter));
  } catch {
    // 保存できなくてもメモリ側のカウンタで順序は保てる
  }
  return seqCounter;
}
