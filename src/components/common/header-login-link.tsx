"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/**
 * ヘッダーのログイン導線。
 *
 * ログインの本体はトップのヒーローにある LineLoginButton で、ここはそこへ
 * 送るためのリンクでしかない。だからトップにいるときは出さない。出すと
 * 「ログイン」と書いてあるのに同じページへ戻るだけになり、押しても何も
 * 起きなかったように見える。
 *
 * ヘッダーにログインボタンそのものを置けないのは、LineLoginButton が
 * ボタンの直下にみなし同意の文言を必ず出す作りだから（定型約款の組入要件）。
 */
function useLoginHref(): string | null {
  const pathname = usePathname();
  if (pathname === "/") return null;
  // 戻り先を渡しておくと、ログイン後に見ていたページへ帰れる
  return `/?returnUrl=${encodeURIComponent(pathname)}`;
}

export function HeaderLoginLink() {
  const href = useLoginHref();
  if (!href) return null;

  return (
    <Button
      asChild
      size="sm"
      className="bg-[var(--app-vendor-line-green)] hover:bg-[var(--app-vendor-line-green-hover)] text-white"
    >
      <Link href={href} data-analytics-id="nav-line-login">
        LINEで登録/ログイン
      </Link>
    </Button>
  );
}

/** モバイルのハンバーガーメニュー用。区切り線ごと消す */
export function HeaderLoginMenuItem() {
  const href = useLoginHref();
  if (!href) return null;

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href={href} data-analytics-id="nav-line-login">
          LINEで登録/ログイン
        </Link>
      </DropdownMenuItem>
    </>
  );
}
