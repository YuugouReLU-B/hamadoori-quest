import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
  getBotPrompt,
  LINE_AUTHORIZE_ENDPOINT,
  LINE_LOGIN_COOKIE,
  LINE_LOGIN_COOKIE_MAX_AGE,
  LINE_LOGIN_SCOPE,
  LINE_START_DISABLE_AUTO_LOGIN_PARAM,
  LINE_STATE_PREFIX,
} from "@/features/auth/constants/line-login";
import { LINE_REDIRECT_URI } from "@/lib/constants/app-origin";
import { validateReturnUrl } from "@/lib/validation/url";

/**
 * LINEログインを開始するルートハンドラ。
 *
 * 以前はクライアントから Server Action (startLineLogin) を await してから
 * `window.location.href` で遷移していたが、その非同期の間隙のせいで
 * iOSの「ユーザー操作から連続した遷移」判定が外れやすくなっていた。
 * ボタンを素の `<a href>` にしてこのルートへの単一のブラウザ遷移にすることで、
 * ユーザー操作と遷移が地続きになるようにしてある。
 *
 * スマホでは、LINEの「自動ログイン」（Universal Links/App LinksでLINEアプリを
 * 起動し、無操作でログインを完了させる機能）が効くようにしてある。これが
 * 「ブラウザ上でメール/パスワードを入れる」のではなく「ネイティブのLINEアプリが
 * 立ち上がってログインが終わる」体験の正体で、Webからこれを起こす手段は
 * LINE公式にはこの自動ログインしかない。
 *
 * 自動ログインはOSやブラウザの事情（プライベートブラウジング、Universal Linksが
 * 効かない等）で失敗することがあり、その場合は無効なcodeと一致しないstateを付けて
 * コールバックに戻ってくる。コールバック側（line-callback）でそれを検知して、
 * `?noAutoLogin=1` でこのルートを踏み直す＝自動ログインを切った認可URLへ
 * 黙って送り直す。LINE公式が案内しているフォールバック手順そのもの。
 * 参照: https://developers.line.biz/ja/docs/line-login/how-to-handle-auto-login-failure/
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID;
  if (!clientId) {
    console.error("NEXT_PUBLIC_LINE_CLIENT_ID is not set");
    return NextResponse.redirect(
      new URL(
        "/sign-in?error=LINE認証の設定が不完全です。管理者にお問い合わせください。",
        request.url,
      ),
    );
  }

  // 自動ログイン失敗からの再試行かどうか
  const disableAutoLogin =
    request.nextUrl.searchParams.get(LINE_START_DISABLE_AUTO_LOGIN_PARAM) ===
    "1";

  const state = `${
    disableAutoLogin
      ? LINE_STATE_PREFIX.autoLoginRetry
      : LINE_STATE_PREFIX.initial
  }${randomBytes(32).toString("base64url")}`;

  const cookieStore = await cookies();
  const cookieOptions = {
    maxAge: LINE_LOGIN_COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  cookieStore.set(LINE_LOGIN_COOKIE.state, state, cookieOptions);

  // 再試行であることを cookie にも残しておき、それでも state が合わずに
  // 戻ってきた場合（＝自動ログイン以外の理由）は素直にエラーにする
  if (disableAutoLogin) {
    cookieStore.set(LINE_LOGIN_COOKIE.autoLoginRetry, "1", cookieOptions);
  } else {
    // 中断された前回のフォールバックの印が残っていると、
    // 次の自動ログイン失敗を黙って救えなくなるので消しておく
    cookieStore.delete(LINE_LOGIN_COOKIE.autoLoginRetry);
  }

  const returnUrl = request.nextUrl.searchParams.get("returnUrl");
  const safeReturnUrl = validateReturnUrl(returnUrl);
  if (safeReturnUrl) {
    cookieStore.set(LINE_LOGIN_COOKIE.returnUrl, safeReturnUrl, cookieOptions);
  }

  const authorizeUrl = new URL(LINE_AUTHORIZE_ENDPOINT);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", LINE_REDIRECT_URI);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("scope", LINE_LOGIN_SCOPE);
  // 通常フローでは自動ログインを有効のままにする（LINEアプリが起動する導線）。
  // 失敗して戻ってきた再試行のときだけ無効化する。
  if (disableAutoLogin) {
    authorizeUrl.searchParams.set("disable_auto_login", "true");
  }

  const botPrompt = getBotPrompt();
  if (botPrompt) {
    authorizeUrl.searchParams.set("bot_prompt", botPrompt);
  }

  return NextResponse.redirect(authorizeUrl);
}
