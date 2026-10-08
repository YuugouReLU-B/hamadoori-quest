import Link from "next/link";
import { UserDataDeletionForm } from "@/features/admin/components/user-data-deletion-form";
import {
  type DeletionCandidate,
  findLeftovers,
  getDeletionCandidate,
  getDeletionLog,
  getUserDataCounts,
  NOT_DELETABLE_BY_APP,
  searchUsersForDeletion,
  TABLE_LABELS,
} from "@/features/admin/services/admin-user-deletion";
import { requireAdmin } from "@/features/admin/services/authorize-admin";

export const dynamic = "force-dynamic";

const SEARCH_KIND_LABELS = {
  user_id: "ユーザーID",
  line_id: "LINEユーザーID",
  lottery_token: "抽選の応募トークン",
  nickname: "ニックネーム（部分一致）",
} as const;

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

function CandidateSummary({ candidate }: { candidate: DeletionCandidate }) {
  return (
    <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
      <dt className="text-gray-500">ニックネーム</dt>
      <dd>
        {candidate.name ?? <span className="text-gray-400">（未設定）</span>}
      </dd>
      <dt className="text-gray-500">ユーザーID</dt>
      <dd className="font-mono text-xs break-all">{candidate.id}</dd>
      <dt className="text-gray-500">LINE ID 末尾</dt>
      <dd className="font-mono">{candidate.lineIdTail ?? "—"}</dd>
      <dt className="text-gray-500">登録日時</dt>
      <dd>
        {candidate.createdAt ? (
          formatDate(candidate.createdAt)
        ) : (
          <span className="text-amber-700">
            ログイン情報なし（プロフィール等だけが残っている）
          </span>
        )}
      </dd>
      <dt className="text-gray-500">最終ログイン</dt>
      <dd>{formatDate(candidate.lastSignInAt)}</dd>
    </dl>
  );
}

/** 削除の結果。削除記録から、削除前後の件数と消し残しを表示する */
async function DeletionResult({ logId }: { logId: string }) {
  const log = await getDeletionLog(logId);
  if (!log) {
    return <p className="text-sm text-red-600">削除の記録が見つかりません。</p>;
  }
  const leftovers = findLeftovers(log.countsAfter);
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">ユーザーデータの削除結果</h2>
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
              .map((table) => TABLE_LABELS[table] ?? table)
              .join("、")}`}
      </p>
      <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
        <dt className="text-gray-500">ユーザーID</dt>
        <dd className="font-mono text-xs break-all">{log.deletedUserId}</dd>
        <dt className="text-gray-500">削除日時</dt>
        <dd>{formatDate(log.deletedAt)}</dd>
        <dt className="text-gray-500">記録ID</dt>
        <dd className="font-mono text-xs break-all">{log.id}</dd>
      </dl>
      <table className="w-full text-sm">
        <thead className="text-left text-gray-500">
          <tr>
            <th className="py-1 font-normal">データ</th>
            <th className="py-1 text-right font-normal">削除前</th>
            <th className="py-1 text-right font-normal">削除後</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(log.countsBefore)
            .filter(([, count]) => count > 0)
            .map(([table, count]) => (
              <tr key={table} className="border-t">
                <td className="py-1">{TABLE_LABELS[table] ?? table}</td>
                <td className="py-1 text-right tabular-nums">{count}</td>
                <td className="py-1 text-right tabular-nums">
                  {log.countsAfter[table] ?? 0}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <p className="text-sm text-gray-700">
        アプリでは消せないもの（LINE公式アカウントの配信対象、外部の応募フォームの回答）は、別途対応してください。
      </p>
      <Link href="/admin/users/delete" className="text-sm underline">
        削除画面に戻る
      </Link>
    </section>
  );
}

/**
 * お問い合わせフォームからの削除依頼に対応する画面。
 *
 * 1. 検索して対象を特定する（ニックネーム・ユーザーID・LINEユーザーID・応募トークン）
 * 2. 対象に紐づくデータの件数と、アプリでは消せないものを確認する
 * 3. 確認入力・チェック・最終確認を経て削除し、削除後の件数を確かめる
 */
export default async function AdminUserDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; user?: string; done?: string }>;
}) {
  const admin = await requireAdmin();
  const { q = "", user: selectedId, done } = await searchParams;

  if (done) {
    return <DeletionResult logId={done} />;
  }

  const search = q.trim() ? await searchUsersForDeletion(q) : null;
  const selected = selectedId ? await getDeletionCandidate(selectedId) : null;
  const counts = selected ? await getUserDataCounts(selected.id) : null;
  const isSelf = selected?.id === admin.id;

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-lg font-bold">ユーザーデータの削除</h2>
        <p className="text-sm text-gray-600">
          お問い合わせフォームから削除の申し出があったときに使う。本人からの申し出であることを確認してから操作すること。
          削除は取り消せない（日次バックアップからの復元は全体の巻き戻しになる）。
        </p>
      </div>

      {/* 1. 検索 */}
      <div>
        <h3 className="mb-2 font-bold">1. 対象を探す</h3>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="ニックネーム / ユーザーID / LINEユーザーID / 応募トークン"
            aria-label="検索"
            className="w-96 max-w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-bold text-white"
          >
            検索
          </button>
        </form>

        {search && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-gray-500">
              検索の種類: {SEARCH_KIND_LABELS[search.kind]}／
              {search.candidates.length}件
            </p>
            {search.candidates.length === 0 ? (
              <p className="text-sm text-gray-600">見つかりませんでした。</p>
            ) : (
              <ul className="divide-y rounded-lg border border-gray-200">
                {search.candidates.map((candidate) => (
                  <li
                    key={candidate.id}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">
                        {candidate.name ?? (
                          <span className="text-gray-400">（未設定）</span>
                        )}
                      </p>
                      <p className="font-mono text-xs text-gray-500 break-all">
                        {candidate.id}
                      </p>
                    </div>
                    <Link
                      href={`/admin/users/delete?q=${encodeURIComponent(q)}&user=${candidate.id}`}
                      className="shrink-0 text-sm underline"
                    >
                      このユーザーを確認する
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 2. 確認 */}
      {selectedId && !selected && (
        <p className="text-sm text-red-600">選んだユーザーが見つかりません。</p>
      )}
      {selected && counts && (
        <div className="space-y-4 rounded-lg border-2 border-red-200 p-4">
          <h3 className="font-bold">
            2. 削除するユーザーと、紐づくデータを確認する
          </h3>
          <CandidateSummary candidate={selected} />

          <div>
            <p className="mb-1 text-sm font-bold">削除されるデータ（件数）</p>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(counts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([table, count]) => (
                    <tr
                      key={table}
                      className={`border-t ${count === 0 ? "text-gray-400" : ""}`}
                    >
                      <td className="py-1">{TABLE_LABELS[table] ?? table}</td>
                      <td className="py-1 text-right tabular-nums">{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="mb-1 text-sm font-bold">
              アプリでは消せないもの（別途対応する）
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-700">
              {NOT_DELETABLE_BY_APP.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-bold">3. 削除する</h3>
            {isSelf ? (
              <p className="text-sm text-red-600">
                自分自身はここから削除できません。本人の退会は設定画面から行ってください。
              </p>
            ) : (
              <UserDataDeletionForm
                userId={selected.id}
                nickname={selected.name}
                tableLabels={TABLE_LABELS}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
