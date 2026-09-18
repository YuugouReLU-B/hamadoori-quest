"use client";

import Link from "next/link";
import { useState } from "react";
import { FormMessage, type Message } from "@/components/common/form-message";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLineLoginHref } from "@/features/auth/hooks/use-line-login-href";
import { cn } from "@/lib/utils/utils";

interface SignUpFormProps {
  searchParams: Message;
}

/**
 * 新規登録フォーム。
 *
 * 以前は「生年月日＋同意」→「ログイン方法選択」の2フェーズだった。
 * 生年月日（公職選挙法の18歳以上確認）を取得しなくなり、
 * 残るのが規約同意だけになったため1画面に統合した。
 */
export default function SignUpForm({ searchParams }: SignUpFormProps) {
  const [isTermsAgreed, setIsTermsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lineLoginHref = useLineLoginHref();

  return (
    <div className="flex flex-col min-w-72 max-w-72 mx-auto">
      <h1 className="text-2xl font-medium text-center mb-2">
        浜通りクエストに登録
      </h1>
      <p className="text-sm text-foreground text-center mb-4">
        すでに登録済みの方は{" "}
        <Link className="text-brand-ink font-medium underline" href="/sign-in">
          こちら
        </Link>
      </p>

      {/* searchParamsからのメッセージを表示 */}
      <FormMessage className="mt-8" message={searchParams} />

      <div className="flex flex-col gap-4 mt-8">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={isTermsAgreed}
            onCheckedChange={(checked) => setIsTermsAgreed(checked === true)}
          />
          <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
            <Link
              href="/terms"
              className="text-brand-ink underline hover:no-underline"
              target="_blank"
            >
              利用規約
            </Link>
            および
            <Link
              href="/privacy"
              className="text-brand-ink underline hover:no-underline"
              target="_blank"
            >
              プライバシーポリシー
            </Link>
            に同意する
          </Label>
        </div>

        <a
          href={lineLoginHref}
          aria-disabled={!isTermsAgreed || isLoading}
          onClick={(e) => {
            if (!isTermsAgreed) {
              e.preventDefault();
              return;
            }
            setIsLoading(true);
          }}
          className={cn(
            buttonVariants(),
            "w-full h-12 bg-[var(--app-vendor-line-green)] hover:bg-[var(--app-vendor-line-green-hover)] text-white",
            (!isTermsAgreed || isLoading) && "pointer-events-none opacity-50",
          )}
        >
          {isLoading ? "LINE連携中..." : "LINEでアカウント作成"}
        </a>
      </div>
    </div>
  );
}
