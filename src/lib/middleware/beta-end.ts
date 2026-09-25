import { type NextRequest, NextResponse } from "next/server";
// API判定はメンテナンス機構と同じものを使う（あちらは編集しない）
import { isApiRequest } from "@/lib/middleware/maintenance";
import { isBetaEndPreview, shouldShowBetaEnd } from "@/lib/utils/beta-end-mode";

const BETA_ENDED_PATH = "/beta-ended";
const ADMIN_PATH = "/admin";
const AUTH_API_PATH = "/api/auth";
const ANALYTICS_COLLECT_PATH = "/api/analytics/collect";
const TERMS_PATH = "/terms";
const PRIVACY_PATH = "/privacy";
const RETRY_AFTER_SECONDS = "3600";
const PREVIEW_QUERY = "preview=beta-end";

/**
 * ベータ終了中でも素通しするパスか。
 *
 * - `/admin` 配下: 終了後も管理者は管理画面に入れる必要がある
 * - `/api/auth` 配下: 上のためにLINEログインを通す
 * - `/terms` `/privacy`: LineLoginButton の同意文のリンク先なので辿れる必要がある
 * - `/api/analytics/collect`: 終了ページの閲覧数を取るためビーコンを通す
 */
export function isBetaEndExcludedPath(pathname: string): boolean {
  return (
    pathname === ADMIN_PATH ||
    pathname.startsWith(`${ADMIN_PATH}/`) ||
    pathname === AUTH_API_PATH ||
    pathname.startsWith(`${AUTH_API_PATH}/`) ||
    pathname === TERMS_PATH ||
    pathname === PRIVACY_PATH ||
    pathname === ANALYTICS_COLLECT_PATH
  );
}

export function createBetaEndApiResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "service_unavailable",
      message: "ベータ期間は終了しました。",
    },
    {
      status: 503,
      headers: {
        "Retry-After": RETRY_AFTER_SECONDS,
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * 終了ページへのリダイレクト。
 *
 * 元URLのクエリは引き継がない。ただし `preview=beta-end` だけは、
 * 遷移先でも終了ページを出し続けるために残す。
 */
export function createBetaEndRedirectResponse(
  request: NextRequest,
): NextResponse {
  const betaEndedUrl = request.nextUrl.clone();
  betaEndedUrl.pathname = BETA_ENDED_PATH;
  betaEndedUrl.search = isBetaEndPreview(request.nextUrl) ? PREVIEW_QUERY : "";
  return NextResponse.redirect(betaEndedUrl);
}

/**
 * 終了していないときの `/beta-ended` への応答。
 *
 * ページ側で `notFound()` を呼ぶと終了ページが動的になるので、ここで素の404を返す。
 */
export function createBetaEndNotFoundResponse(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

export function resolveBetaEndResponse(
  request: NextRequest,
): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (isBetaEndExcludedPath(pathname)) {
    return null;
  }

  if (shouldShowBetaEnd(request.nextUrl)) {
    if (isApiRequest(pathname)) {
      return createBetaEndApiResponse();
    }
    if (pathname !== BETA_ENDED_PATH) {
      return createBetaEndRedirectResponse(request);
    }
    return null;
  }

  if (pathname === BETA_ENDED_PATH) {
    return createBetaEndNotFoundResponse();
  }

  return null;
}
