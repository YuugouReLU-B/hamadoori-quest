"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteDevUser } from "@/features/dev-tools/actions/delete-dev-user";
import type { DevUser } from "@/features/dev-tools/services/dev-users";

type DevUserRowProps = {
  user: DevUser;
  /** ログイン中の自分自身か */
  isCurrentUser: boolean;
};

export function DevUserRow({ user, isCurrentUser }: DevUserRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteDevUser(user.id);
      if (!result.success) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      // 自分を消した場合はセッションが宙に浮くのでサインアウトさせる
      router.push(isCurrentUser ? "/" : "/dev/users");
      router.refresh();
    });
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2.5">
        <div className="font-medium">
          {user.name ?? "（プロフィール未登録）"}
        </div>
        <div className="font-mono text-xs text-gray-500">{user.email}</div>
        {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
      </td>
      <td className="px-4 py-2.5">
        <span
          className={
            user.provider === "line"
              ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800"
              : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
          }
        >
          {user.provider === "line" ? "LINE" : "メール"}
        </span>
        {isCurrentUser && (
          <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
            ログイン中
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-center">
        {user.isOfficialAccountFriend === null
          ? "—"
          : user.isOfficialAccountFriend
            ? "友だち"
            : "未追加"}
      </td>
      <td className="px-4 py-2.5 text-center">{user.hasProfile ? "✓" : "—"}</td>
      <td className="px-4 py-2.5 text-xs text-gray-600">
        {user.createdAt.slice(0, 16).replace("T", " ")}
      </td>
      <td className="px-4 py-2.5 text-right">
        {confirming ? (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "削除中..." : "本当に削除"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={isPending}
            >
              やめる
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirming(true)}
          >
            削除
          </Button>
        )}
      </td>
    </tr>
  );
}
