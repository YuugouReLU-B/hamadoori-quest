import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { buildLineLoginHref } from "@/features/auth/client/line-auth";
import {
  LINE_LOGIN_COOKIE,
  LINE_STATE_PREFIX,
} from "@/features/auth/constants/line-login";
import { LineApiClientImpl } from "@/features/auth/services/line-api-client";
import { grantLineFriendMission } from "@/features/auth/use-cases/grant-line-friend-mission";
import { lineLogin } from "@/features/auth/use-cases/line-login";
import { saveCampaignAttribution } from "@/features/campaign-attribution/services/campaign-attribution";
import { grantReferralReward } from "@/features/referral/services/grant-referral-reward";
import { getOrInitializeUserLevel } from "@/features/user-level/services/level";
import { APP_ORIGIN, LINE_REDIRECT_URI } from "@/lib/constants/app-origin";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/client";
import { deleteCookie, getCookie } from "@/lib/utils/server-cookies";
import { validateReturnUrl } from "@/lib/validation/url";

/** ログイン導線はトップに一本化したので、失敗もトップに表示する */
function signInRedirect(error: string) {
  return NextResponse.redirect(
    new URL(`/?error=${encodeURIComponent(error)}`, APP_ORIGIN),
  );
}

/** 長さの違いで分岐しないよう固定長ハッシュ比較ではなくバイト列比較の前に長さを揃える */
function safeEquals(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * cookie に保存される際に "/missions/x" が "%2Fmissions%2Fx" へエンコードされる。
 * 読み出し側が復号するかはランタイム実装に依存するため、
 * パスとして解釈できない形だったときだけ復号する。
 */
function decodeReturnUrl(raw: string | undefined): string | undefined {
  if (!raw || raw.startsWith("/")) return raw;
  try {
    return decodeURIComponent(raw);
  } catch {
    return undefined;
  }
}

async function clearFlowCookies() {
  await Promise.all([
    deleteCookie(LINE_LOGIN_COOKIE.state),
    deleteCookie(LINE_LOGIN_COOKIE.returnUrl),
    deleteCookie(LINE_LOGIN_COOKIE.autoLoginRetry),
  ]);
}

/**
 * 自動ログイン（LINEアプリを起動して無操作でログインを完了させる機能）が失敗したとき、
 * LINEは「無効なcode」と「認可リクエスト時と一致しないstate」を付けてここへ戻してくる。
 * そのため state 不一致はCSRFだけでなく自動ログイン失敗でも起きる。
 *
 * LINE公式の案内どおり、自動ログインを無効にした認可URLへ黙って送り直して救済する。
 * 救済は1フローにつき1回だけ（cookieで印を付ける）にして、リダイレクトループを防ぐ。
 * 参照: https://developers.line.biz/ja/docs/line-login/how-to-handle-auto-login-failure/
 */
async function retryWithAutoLoginDisabled() {
  const returnUrl = validateReturnUrl(
    decodeReturnUrl(await getCookie(LINE_LOGIN_COOKIE.returnUrl)),
  );
  // state は使い切り。returnUrl は再試行でも引き継ぎたいので残す
  await deleteCookie(LINE_LOGIN_COOKIE.state);
  return NextResponse.redirect(
    new URL(
      buildLineLoginHref(returnUrl ?? undefined, { disableAutoLogin: true }),
      APP_ORIGIN,
    ),
  );
}

/**
 * LINEログインのコールバック。
 *
 * 以前は「ルートハンドラ → クライアントページ → サーバーアクション」の3ホップで、
 * state の照合が localStorage を読むクライアント側でしか行われていなかった。
 * ここに集約してサーバー側で state を検証する。
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // LINE 側でのエラー（ユーザーがキャンセルした等）
    const lineError = searchParams.get("error");
    if (lineError) {
      await clearFlowCookies();
      return signInRedirect(
        lineError === "access_denied"
          ? "LINE認証がキャンセルされました。再度お試しください。"
          : searchParams.get("error_description") ||
              `LINE認証エラー: ${lineError}`,
      );
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const storedState = await getCookie(LINE_LOGIN_COOKIE.state);

    // CSRF対策: state の照合はここ（サーバー側）で行う。
    // ただし自動ログイン失敗でも state は一致しないので、
    // まだフォールバックしていなければ自動ログインを切って一度だけやり直す
    if (!state || !storedState || !safeEquals(state, storedState)) {
      const alreadyRetried =
        state?.startsWith(LINE_STATE_PREFIX.autoLoginRetry) ||
        Boolean(await getCookie(LINE_LOGIN_COOKIE.autoLoginRetry));
      if (!alreadyRetried && state && code) {
        return retryWithAutoLoginDisabled();
      }
      await clearFlowCookies();
      return signInRedirect(
        "セキュリティエラー: 認証状態が無効です。最初からやり直してください。",
      );
    }

    if (!code) {
      await clearFlowCookies();
      return signInRedirect("認証コードが取得できませんでした");
    }

    const clientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID;
    const clientSecret = process.env.LINE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      await clearFlowCookies();
      console.error("LINE認証の環境変数が設定されていません");
      return signInRedirect("LINE認証の設定が不完全です");
    }

    const adminSupabase = await createAdminClient();
    const result = await lineLogin(
      adminSupabase,
      new LineApiClientImpl(clientId, clientSecret),
      {
        code,
        redirectUri: LINE_REDIRECT_URI,
        onUserCreated: async (userId) => {
          await getOrInitializeUserLevel(userId);
        },
      },
    );

    if (!result.success) {
      await clearFlowCookies();
      return signInRedirect(result.error);
    }

    // 新規登録時のみ、流入元の記録を行う
    if (result.isNewUser) {
      const referralCode = await getCookie("referral_code");
      if (referralCode && result.email) {
        await grantReferralReward(referralCode, result.email, result.userId);
        await deleteCookie("referral_code");
      }

      const campaignCode = await getCookie("campaign_code");
      if (campaignCode) {
        await saveCampaignAttribution(
          adminSupabase,
          result.userId,
          campaignCode,
        );
        await deleteCookie("campaign_code");
      }
    }

    // Supabase のセッションを張る。cookie は createClient のアダプタ経由で
    // このレスポンスに載る（Supabase 公式のルートハンドラ方式と同じ）
    const userSupabase = createClient();
    const { error: signInError } = await userSupabase.auth.signInWithPassword({
      email: result.email,
      password: result.tempPassword,
    });

    if (signInError) {
      console.error("Failed to sign in with temporary password:", signInError);
      await clearFlowCookies();
      return signInRedirect("ログイン処理に失敗しました");
    }

    // 友だちだと判明したら、公式LINE友だち追加ミッションを自動達成させる。
    // 自己申告ではなく LINE の friendFlag を根拠にできるのがこの導線の利点
    if (result.isOfficialAccountFriend === true) {
      await grantLineFriendMission(adminSupabase, userSupabase, result.userId);
    }

    const returnUrl = validateReturnUrl(
      decodeReturnUrl(await getCookie(LINE_LOGIN_COOKIE.returnUrl)),
    );
    await clearFlowCookies();

    const destination = result.isNewUser
      ? "/settings/profile?new=true"
      : returnUrl || "/?login=success";

    return NextResponse.redirect(new URL(destination, APP_ORIGIN));
  } catch (error) {
    console.error("LINE callback failed:", error);
    await clearFlowCookies();
    return signInRedirect("ログイン処理に失敗しました");
  }
}
