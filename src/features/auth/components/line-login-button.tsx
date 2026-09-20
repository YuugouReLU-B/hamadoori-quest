"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useLineLoginHref } from "@/features/auth/hooks/use-line-login-href";
import { cn } from "@/lib/utils/utils";

interface LineLoginButtonProps {
  /** ログイン後に戻したいパス。未認証リダイレクトから引き継ぐ */
  returnUrl?: string;
  /** 背景が写真のとき（ヒーロー）に同意文へ白い下敷きを敷く */
  onPhoto?: boolean;
  className?: string;
}

/**
 * LINEログインボタン。登録とログインの入り口を兼ねる。
 *
 * LINE側の認証結果から新規／既存は line-callback が `isNewUser` で判別するので、
 * 利用者に登録かログインかを選ばせる必要がない。かつて `/sign-up` にあった
 * 規約同意チェックボックスは、状態がクライアントに閉じていて同意記録を
 * どこにも残していなかったため、ボタン直下のみなし同意の表示に置き換えた。
 */
export default function LineLoginButton({
  returnUrl,
  onPhoto = false,
  className,
}: LineLoginButtonProps) {
  const [isLineLoading, setIsLineLoading] = useState(false);
  const lineLoginHref = useLineLoginHref(returnUrl);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* href は表示時に用意しておいたLINEの認可URLそのもの。
          タップから access.line.me への遷移を一回にしないと、iOSの
          ユニバーサルリンクが反応せずLINEアプリが起動しないため
          （詳細は use-line-login-href.ts）*/}
      <a
        href={lineLoginHref}
        onClick={() => setIsLineLoading(true)}
        data-testid="line-login-button"
        data-analytics-id="line-login"
        className={cn(
          buttonVariants({ size: "lg" }),
          "w-full max-w-sm h-14 rounded-full text-base font-bold shadow-lg",
          "bg-[var(--app-vendor-line-green)] hover:bg-[var(--app-vendor-line-green-hover)] text-white",
          "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl",
          isLineLoading && "pointer-events-none opacity-50",
        )}
      >
        {isLineLoading ? "LINE連携中..." : "LINEで登録/ログイン"}
      </a>

      {/*
        定型約款の組入要件として、同意の対象がボタンの直近に表示されていて
        リンクを辿れることが要る。写真の上に置くときは下敷きを敷かないと
        コントラストが足りない
      */}
      <p
        className={cn(
          "max-w-sm px-3 py-1.5 text-center text-xs leading-relaxed",
          onPhoto
            ? "rounded-lg bg-white/80 text-gray-700"
            : "text-muted-foreground",
        )}
      >
        ※登録・ログインすることで、
        <Link href="/terms" className="underline hover:no-underline">
          利用規約
        </Link>
        および
        <Link href="/privacy" className="underline hover:no-underline">
          プライバシーポリシー
        </Link>
        に同意したものとみなします。
      </p>
    </div>
  );
}
