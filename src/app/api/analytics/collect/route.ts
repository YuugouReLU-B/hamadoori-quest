import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { ingestAnalytics } from "@/features/analytics/services/analytics-ingest";
import { readUserIdFromAuthCookie } from "@/features/analytics/utils/auth-cookie";
import { resolveRequestContext } from "@/features/analytics/utils/request-context";
import { normalizeCollectRequest } from "@/features/analytics/utils/validate-collect";

/**
 * 計測イベントの収集エンドポイント。
 *
 * sendBeacon から未認証で叩かれる前提。認可はかけず、代わりに
 *   - ペイロードの検証・件数制限（validate-collect）
 *   - ボディサイズの上限
 *   - user_id / IP / 地域はクライアント値を使わずサーバーで解決
 * で守る。
 *
 * レスポンスは常に 204 を返す。解析の失敗でクライアント側のコンソールを
 * エラーで埋めても得がないため、異常はサーバーログにだけ残す。
 */

// cookies() / headers() を使うので静的化させない
export const dynamic = "force-dynamic";

/** 訪問者ID cookie。2年保持 */
const VISITOR_COOKIE_NAME = "hq_vid";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 730;

/** ボディサイズの上限(256KB)。イベント50件でも十分に収まる */
const MAX_BODY_BYTES = 256 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: Request) {
  try {
    const contentLength = Number.parseInt(
      request.headers.get("content-length") ?? "0",
      10,
    );
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return noContent();
    }

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return noContent();
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return noContent();
    }

    const normalized = normalizeCollectRequest(body);
    if (!normalized) {
      return noContent();
    }

    const cookieStore = await cookies();
    const headerList = await headers();

    // 訪問者IDはサーバーが発行する。document.cookie で書くと Safari の ITP により
    // 7日で消えてしまい、再訪問がすべて新規訪問者として数えられてしまう
    const existingVisitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
    const visitorId =
      existingVisitorId && UUID_PATTERN.test(existingVisitorId)
        ? existingVisitorId
        : randomUUID();

    await ingestAnalytics({
      session: normalized.session,
      events: normalized.events,
      context: resolveRequestContext(headerList),
      visitorId,
      userId: readUserIdFromAuthCookie(cookieStore),
      currentHost: headerList.get("host"),
    });

    const response = noContent();
    if (visitorId !== existingVisitorId) {
      response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: VISITOR_COOKIE_MAX_AGE,
      });
    }
    return response;
  } catch (error) {
    console.error("アクセス解析イベントの記録に失敗しました", error);
    return noContent();
  }
}
