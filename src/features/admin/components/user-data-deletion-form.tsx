"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  type AdminUserDeletionResult,
  deleteUserDataByAdmin,
} from "@/features/admin/actions/user-actions";

type Props = {
  userId: string;
  /** 確認欄に入力してもらう値の候補（ニックネーム。無ければユーザーIDのみ） */
  nickname: string | null;
  tableLabels: Record<string, string>;
};

/**
 * 削除の実行フォーム（多重チェックの2段目以降）。
 *
 * 1. 確認欄にユーザーIDかニックネームを手入力し、一致したときだけボタンが押せる
 * 2. 「確認した」のチェックが必要
 * 3. 押したあとに最終確認のダイアログ
 * サーバー側でも一致・管理者・自分自身でないことを確かめる。
 */
export function UserDataDeletionForm({ userId, nickname, tableLabels }: Props) {
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminUserDeletionResult | null>(null);
  const router = useRouter();

  const typed = confirmation.trim();
  const matches = typed === userId || (!!nickname && typed === nickname);
  const canSubmit = matches && acknowledged && !isPending;

  const handleDelete = () => {
    if (
      !window.confirm(
        "このユーザーのデータを削除します。元に戻せません。本当に削除しますか？",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const next = await deleteUserDataByAdmin(userId, typed);
      // 結果は削除記録の画面で表示する（この画面の対象はもう存在しないため）。
      // 記録に失敗したときだけ、ここで結果を表示する
      if (next.success && next.logId) {
        router.push(`/admin/users/delete?done=${next.logId}`);
        return;
      }
      setResult(next);
    });
  };

  if (result?.success) {
    const leftovers = result.leftovers;
    return (
      <div className="space-y-3">
        <p
          className={`rounded-lg border p-3 text-sm font-bold ${
            leftovers.length === 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {leftovers.length === 0
            ? "削除しました。削除後に数え直し、紐づくデータが0件になったことを確認しました。"
            : `削除しましたが、次のデータが残っています: ${leftovers
                .map((table) => tableLabels[table] ?? table)
                .join("、")}`}
        </p>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-1 font-normal">データ</th>
              <th className="py-1 text-right font-normal">削除前</th>
              <th className="py-1 text-right font-normal">削除後</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(result.countsBefore)
              .filter(([, count]) => count > 0)
              .map(([table, count]) => (
                <tr key={table} className="border-t">
                  <td className="py-1">{tableLabels[table] ?? table}</td>
                  <td className="py-1 text-right tabular-nums">{count}</td>
                  <td className="py-1 text-right tabular-nums">
                    {result.countsAfter[table] ?? 0}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="font-bold">
          確認のため、
          {nickname ? "ニックネーム「" : ""}
          {nickname ? <span className="font-mono">{nickname}</span> : null}
          {nickname ? "」またはユーザーID" : "ユーザーID"}
          を入力してください
        </span>
        <input
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
          aria-label="確認入力"
          autoComplete="off"
        />
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-1"
        />
        <span>
          削除の申し出が本人からのものであることを確認し、上の件数と「アプリでは消せないもの」を確認しました。
        </span>
      </label>

      <Button
        type="button"
        onClick={handleDelete}
        disabled={!canSubmit}
        className="bg-red-600 text-white hover:bg-red-700"
      >
        {isPending ? "削除中..." : "このユーザーのデータを削除する"}
      </Button>

      {result && !result.success && (
        <p className="text-sm text-red-600">{result.error}</p>
      )}
    </div>
  );
}
