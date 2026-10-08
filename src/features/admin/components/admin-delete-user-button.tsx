"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteUserByAdmin } from "@/features/admin/actions/user-actions";

type AdminDeleteUserButtonProps = {
  userId: string;
  userLabel: string;
  /** 自分自身は退会させられないのでボタンを出さない */
  isSelf: boolean;
};

/**
 * お問い合わせフォームから削除依頼があったユーザーを退会させるボタン。
 * 本人の退会と同じ処理（関連データ削除 → 認証ユーザー削除）を行う。
 */
export function AdminDeleteUserButton({
  userId,
  userLabel,
  isSelf,
}: AdminDeleteUserButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isSelf) {
    return null;
  }

  const handleClick = () => {
    const message = `「${userLabel}」を退会させます。アカウント情報・プロフィール・ポイント・達成記録などが削除され、元に戻せません。よろしいですか？`;
    if (!window.confirm(message)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteUserByAdmin(userId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="border-red-300 text-red-700 hover:bg-red-50"
      >
        {isPending ? "削除中..." : "退会させる"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
