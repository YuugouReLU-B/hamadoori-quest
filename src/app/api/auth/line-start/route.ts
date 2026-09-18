import { type NextRequest, NextResponse } from "next/server";
import { LINE_START_DISABLE_AUTO_LOGIN_PARAM } from "@/features/auth/constants/line-login";
import { startLineLogin } from "@/features/auth/services/line-login-start";

/**
 * LINEログインを開始するルートハンドラ。
 *
 * 通常の導線ではもう使わない。ボタンの href には `/api/auth/line-prepare` で
 * 先に用意した認可URLを直接入れてあり、タップから access.line.me へ一回で遷移する
 * （間に302を挟むとiOSのユニバーサルリンクが反応せず、LINEアプリが起動しないため）。
 *
 * ここが残っているのは次の2つのため。
 * - JSが動かない/prepareが失敗した場合のフォールバック
 * - 自動ログインに失敗したコールバックからの再試行（`?noAutoLogin=1`）。
 *   こちらは自動ログインを切ることが目的なので、302で構わない
 */
export async function GET(request: NextRequest) {
  const result = await startLineLogin({
    returnUrl: request.nextUrl.searchParams.get("returnUrl"),
    disableAutoLogin:
      request.nextUrl.searchParams.get(LINE_START_DISABLE_AUTO_LOGIN_PARAM) ===
      "1",
  });

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeURIComponent(result.error)}`,
        request.url,
      ),
    );
  }

  return NextResponse.redirect(result.authorizeUrl);
}
