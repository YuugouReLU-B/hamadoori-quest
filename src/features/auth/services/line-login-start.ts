import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import {
  getBotPrompt,
  LINE_AUTHORIZE_ENDPOINT,
  LINE_LOGIN_COOKIE,
  LINE_LOGIN_COOKIE_MAX_AGE,
  LINE_LOGIN_SCOPE,
  LINE_STATE_PREFIX,
} from "@/features/auth/constants/line-login";
import { LINE_REDIRECT_URI } from "@/lib/constants/app-origin";
import { validateReturnUrl } from "@/lib/validation/url";

type StartLineLoginOptions = {
  /** ログイン後の戻り先（相対パスのみ有効） */
  returnUrl?: string | null;
  /**
   * LINEの自動ログイン（LINEアプリを起動して無操作でログインを完了させる機能）を
   * 無効にする。自動ログインに失敗したあとの再試行でのみ true にする。
   */
  disableAutoLogin?: boolean;
};

type StartLineLoginResult =
  | { ok: true; authorizeUrl: string }
  | { ok: false; error: string };

/**
 * LINEログインのフローを開始する。
 *
 * state を発行して HttpOnly cookie に保存し、認可URLを組み立てる。
 * cookie を書くのでルートハンドラからのみ呼べる（Server Component からは呼べない）。
 *
 * 認可URLへ「飛ばす」のではなく「返す」のは、iOSのユニバーサルリンクの都合。
 * ユニバーサルリンクはリンクのタップに反応するもので、サーバーサイドのリダイレクトを
 * 挟むと反応しないことがある。実機（iPhone/Safari）でも、ボタンのタップから
 * `/api/auth/line-start` の302を経由するとLINEアプリが起動せずWebのログイン画面になり、
 * 同じリンクを長押しして「"LINE"で開く」を選ぶとアプリが起動する、という差が出た。
 * そのため呼び出し側（line-prepare）は認可URLをJSONで受け取り、ボタンの href に
 * 直接入れる。タップ＝access.line.me への単一の遷移になり、302が挟まらない。
 */
export async function startLineLogin({
  returnUrl,
  disableAutoLogin = false,
}: StartLineLoginOptions): Promise<StartLineLoginResult> {
  const clientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID;
  if (!clientId) {
    console.error("NEXT_PUBLIC_LINE_CLIENT_ID is not set");
    return {
      ok: false,
      error: "LINE認証の設定が不完全です。管理者にお問い合わせください。",
    };
  }

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

  return { ok: true, authorizeUrl: authorizeUrl.toString() };
}
