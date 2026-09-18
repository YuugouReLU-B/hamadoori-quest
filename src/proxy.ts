import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveBasicAuthResponse } from "@/lib/middleware/basic-auth";
import { resolveMaintenanceResponse } from "@/lib/middleware/maintenance";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.jsのLinkが裏で発行するプリフェッチリクエストかどうか。
 *
 * ミッション一覧のようにリンクが大量に並ぶ画面をスマホでスクロールすると、
 * ビューポートに入るたびにプリフェッチが連続発火する。プリフェッチのたびに
 * ここでSupabaseのトークンリフレッシュ（getUser）を走らせていると、
 * トークン有効期限付近で複数のプリフェッチが同じrefresh_tokenを使って
 * 同時にリフレッシュを試み、ローテーションにより後発が
 * "Invalid Refresh Token: Already Used" で失敗する。この失敗レスポンスの
 * Set-Cookieがあとから届くと、正常にローテーション済みのCookieを
 * 上書きしてしまい、実際にはセッションが生きているのにログアウトしたように
 * 見えていた（「スマホですぐログアウトされる」の主因と推定）。
 *
 * プリフェッチはページを実際には表示しない予備読み込みなので、ここで
 * リフレッシュを省略しても実際のナビゲーション（プリフェッチではない
 * リクエスト）で改めてリフレッシュされる。
 */
function isPrefetchRequest(request: NextRequest): boolean {
  return (
    request.headers.get("next-router-prefetch") !== null ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose") === "prefetch"
  );
}

export async function proxy(request: NextRequest) {
  // ベータ公開前のゲート。何よりも先に判定して、メンテナンス画面すら見せない
  const basicAuthResponse = resolveBasicAuthResponse(request);

  if (basicAuthResponse) {
    return basicAuthResponse;
  }

  const maintenanceResponse = resolveMaintenanceResponse(request);

  if (maintenanceResponse) {
    return maintenanceResponse;
  }

  if (isPrefetchRequest(request)) {
    return NextResponse.next();
  }

  // 計測ビーコンではセッションリフレッシュを走らせない。
  // このエンドポイントは操作のたびに、しかも並行して叩かれるため、ここで
  // updateSession を通すと上と同じ refresh_token のローテーション競合を招く。
  // 収集側は認証cookieを読み取るだけでリフレッシュを必要としない
  // （features/analytics/utils/auth-cookie.ts 参照）
  if (request.nextUrl.pathname.startsWith("/api/analytics/")) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * - audio - .mp3, .ogg, .wav
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|ogg|wav)$).*)",
  ],
};
