"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LineApiClientImpl } from "@/features/auth/services/line-api-client";
import { lineLogin } from "@/features/auth/use-cases/line-login";
import { saveCampaignAttribution } from "@/features/campaign-attribution/services/campaign-attribution";
import {
  getOrInitializeUserLevel,
  grantMissionCompletionXp,
} from "@/features/user-level/services/level";
import { getCurrentSeasonId } from "@/lib/services/seasons";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/client";
import { validateAge } from "@/lib/utils/age-validation";
import { isSupabaseAuthCookie } from "@/lib/utils/auth-cookies";
import { deleteCookie, getCookie } from "@/lib/utils/server-cookies";
import { calculateAge, encodedRedirect } from "@/lib/utils/utils";
import {
  forgotPasswordFormSchema,
  signInAndLoginFormSchema,
  signUpAndLoginFormSchema,
} from "@/lib/validation/auth";
import {
  isEmailAlreadyUsedInReferral,
  isValidReferralCode,
} from "@/lib/validation/referral";
import { validateReturnUrl } from "@/lib/validation/url";

// useActionState用のサインインアクション
export const signInActionWithState = async (
  _prevState: {
    error?: string;
    success?: string;
    message?: string;
    formData?: {
      email: string;
    };
  } | null,
  formData: FormData,
) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const returnUrl = formData.get("returnUrl")?.toString();

  // フォームデータを保存（エラー時の状態復元用、メールアドレスのみ）
  const currentFormData = {
    email: email || "",
  };

  const validatedFields = signInAndLoginFormSchema.safeParse({
    email,
    password,
  });
  if (!validatedFields.success) {
    return {
      error: "login-error",
      formData: currentFormData,
    };
  }

  if (!email || !password) {
    return {
      error: "login-error",
      formData: currentFormData,
    };
  }

  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "login-error",
      formData: currentFormData,
    };
  }

  // Validate returnUrl before redirecting
  const validatedReturnUrl = validateReturnUrl(returnUrl);

  return {
    success: "ログインに成功しました",
    redirectUrl: validatedReturnUrl || "/",
  };
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect(
      "error",
      "/forgot-password",
      "メールアドレスが必要です",
    );
  }

  const validatedFields = forgotPasswordFormSchema.safeParse({ email });
  if (!validatedFields.success) {
    return encodedRedirect(
      "error",
      "/forgot-password",
      validatedFields.error.errors.map((error) => error.message).join("\n"),
    );
  }

  // LINEユーザーかどうかを確認
  const serviceSupabase = await createAdminClient();

  // 効率的なPostgreSQL関数を使用してメールアドレスでユーザーを検索 (O(1))
  // listUsers()の全件取得 (O(n)) から大幅な性能改善
  const { data: userResults, error: userFetchError } =
    await serviceSupabase.rpc("get_user_by_email", { user_email: email });

  if (userFetchError) {
    console.error("get_user_by_email function failed:", userFetchError);
    throw new Error("Failed to check user existence");
  }

  const userWithEmail = userResults?.[0] || null;

  // LINEユーザーの場合、パスワードリセットは出来ない
  if (
    userWithEmail &&
    (userWithEmail.user_metadata as { provider: string })?.provider === "line"
  ) {
    return encodedRedirect(
      "error",
      "/forgot-password",
      "LINEで登録されたユーザーのパスワードリセットはできません",
    );
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/api/auth/callback?redirect_to=/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "パスワードリセットに失敗しました",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "password-reset-success",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/reset-password",
      "パスワードとパスワード確認が必要です",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect("error", "/reset-password", "パスワードが一致しません");
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/reset-password",
      error.code === "same_password"
        ? "新しいパスワードは現在のパスワードと異なるものを設定してください"
        : "パスワードの更新に失敗しました",
    );
  }

  encodedRedirect("success", "/", "パスワードを更新しました");
};

/**
 * ログアウトする。
 *
 * `signOut()` はリフレッシュトークンの失効をAuth APIに投げるので、通信に
 * 失敗したりトークンが既に切れていると失敗しうる。**それでもこの端末からは
 * ログアウトさせなければならない。** 失敗を握って何も起きないと、利用者から
 * 見ればログアウトボタンが壊れているのと同じなので、cookieは必ず消す。
 */
export const signOutAction = async () => {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("セッションの失効に失敗しました:", error);
  }

  // signOut() が cookie を消せていなかった場合の取りこぼしを拾う
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (isSupabaseAuthCookie(cookie.name)) {
      cookieStore.delete({ name: cookie.name, path: "/" });
    }
  }

  redirect("/");
};
