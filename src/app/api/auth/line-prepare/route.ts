import { type NextRequest, NextResponse } from "next/server";
import { LINE_START_DISABLE_AUTO_LOGIN_PARAM } from "@/features/auth/constants/line-login";
import { startLineLogin } from "@/features/auth/services/line-login-start";

/** cookieを書くので静的化させない */
export const dynamic = "force-dynamic";

/**
 * LINEログインの認可URLを先に用意しておくためのルートハンドラ。
 *
 * ページ表示時にクライアントがこれを叩き、state cookie の発行まで済ませたうえで
 * 認可URLを受け取る。ボタンの href にその認可URLを直接入れておくことで、
 * タップから access.line.me への遷移が「リンクのタップ一回」になる。
 *
 * これは iOS のユニバーサルリンクがリンクのタップに反応する仕組みで、
 * 途中にサーバーサイドのリダイレクト（`/api/auth/line-start` の302）を挟むと
 * LINEアプリが起動せずWebのログイン画面になってしまうため。
 * JSが動かない場合は従来どおり `/api/auth/line-start` へのリンクのままになる。
 */
export async function GET(request: NextRequest) {
  const result = await startLineLogin({
    returnUrl: request.nextUrl.searchParams.get("returnUrl"),
    disableAutoLogin:
      request.nextUrl.searchParams.get(LINE_START_DISABLE_AUTO_LOGIN_PARAM) ===
      "1",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(
    { authorizeUrl: result.authorizeUrl },
    { headers: { "Cache-Control": "no-store" } },
  );
}
