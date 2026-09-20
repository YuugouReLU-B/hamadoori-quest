"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { signInActionWithState } from "@/app/actions";
import { FormMessage } from "@/components/common/form-message";
import { SubmitButton } from "@/components/common/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * 開発用のメールアドレス+パスワードログインフォーム。
 *
 * 一般ユーザー向けの導線はトップの LINE ログインのみになったため、
 * seed で作成される開発用アカウント（admin@example.com 等）で入るための口を
 * /dev 配下に分離している。/dev レイアウトが本番ビルドで 404 を返す。
 */
export function DevLoginForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(signInActionWithState, null);

  // 成功時のリダイレクト処理
  useEffect(() => {
    if (state?.success && state?.redirectUrl) {
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      className="flex max-w-sm flex-col gap-2 [&>input]:mb-3"
    >
      {state?.error && (
        <FormMessage
          message={
            state.error === "login-error"
              ? { type: "login-error" }
              : { error: state.error }
          }
          className="mb-4"
        />
      )}

      <Label htmlFor="email">メールアドレス</Label>
      <Input
        name="email"
        placeholder="you@example.com"
        required
        autoComplete="username"
        defaultValue={state?.formData?.email || ""}
      />

      <div className="flex items-center justify-between">
        <Label htmlFor="password">パスワード</Label>
        <Link
          className="text-xs text-foreground underline"
          href="/forgot-password"
        >
          パスワードを忘れた方
        </Link>
      </div>
      <Input
        type="password"
        name="password"
        placeholder="パスワード"
        required
        autoComplete="current-password"
      />

      <SubmitButton pendingText="ログイン中...">ログイン</SubmitButton>
    </form>
  );
}
