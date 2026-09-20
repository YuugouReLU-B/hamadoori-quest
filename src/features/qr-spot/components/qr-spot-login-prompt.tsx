"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useLineLoginHref } from "@/features/auth/hooks/use-line-login-href";
import { cn } from "@/lib/utils/utils";

type QrSpotLoginPromptProps = {
  /** ログイン後に戻ってくるパス（`/q/<code>`） */
  returnUrl: string;
};

/**
 * 未ログインでQRを読んだときの案内。
 *
 * 自動でLINEに飛ばさないのは、本人の意図しないアカウント作成になるため。
 * 何が起きるかを見せてからボタンを押してもらう。
 */
export function QrSpotLoginPrompt({ returnUrl }: QrSpotLoginPromptProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const lineLoginHref = useLineLoginHref(returnUrl);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        ポイントを受け取るには浜通りクエストへの登録が必要です。
        LINEでログインすると、このスポットのポイントがそのまま入ります。
      </p>

      <a
        href={lineLoginHref}
        onClick={() => setIsRedirecting(true)}
        className={cn(
          buttonVariants({ size: "lg" }),
          "w-full",
          isRedirecting && "pointer-events-none opacity-50",
        )}
      >
        {isRedirecting ? "LINEへ移動しています..." : "LINEではじめる"}
      </a>
    </div>
  );
}
