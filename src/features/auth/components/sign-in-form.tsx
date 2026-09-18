"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useLineLoginHref } from "@/features/auth/hooks/use-line-login-href";
import { cn } from "@/lib/utils/utils";

interface SignInFormProps {
  returnUrl?: string;
}

export default function SignInForm({ returnUrl }: SignInFormProps) {
  const [isLineLoading, setIsLineLoading] = useState(false);
  const lineLoginHref = useLineLoginHref(returnUrl);

  return (
    <div className="flex flex-col gap-4 mt-8 min-w-72 max-w-72 mx-auto">
      {/* LINEログインボタン。
          href は表示時に用意しておいたLINEの認可URLそのもの。
          タップから access.line.me への遷移を一回にしないと、iOSの
          ユニバーサルリンクが反応せずLINEアプリが起動しないため
          （詳細は use-line-login-href.ts）*/}
      <a
        href={lineLoginHref}
        onClick={() => setIsLineLoading(true)}
        className={cn(
          buttonVariants(),
          "w-full h-12 bg-[var(--app-vendor-line-green)] hover:bg-[var(--app-vendor-line-green-hover)] text-white",
          isLineLoading && "pointer-events-none opacity-50",
        )}
      >
        {isLineLoading ? "LINE連携中..." : "LINEでログイン"}
      </a>
    </div>
  );
}
