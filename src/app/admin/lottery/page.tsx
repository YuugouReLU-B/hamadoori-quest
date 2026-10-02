import Link from "next/link";
import { LotterySettingsForm } from "@/features/admin/components/lottery-settings-form";
import {
  listLotteryTokensForAdmin,
  normalizeLotteryToken,
} from "@/features/admin/services/admin-lottery-tokens";
import { requireAdmin } from "@/features/admin/services/authorize-admin";
import { getLotterySettings } from "@/features/lottery/services/lottery-settings";
import { formatPoints } from "@/lib/utils/format-points";

export const dynamic = "force-dynamic";

export default async function AdminLotteryPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await requireAdmin();

  const { token } = await searchParams;
  const searchedToken = token ? normalizeLotteryToken(token) : "";
  const [settings, tokens] = await Promise.all([
    getLotterySettings(),
    listLotteryTokensForAdmin(searchedToken),
  ]);

  if (!settings) {
    return (
      <p className="text-sm text-red-600">
        設定の取得に失敗しました。時間をおいて再度お試しください。
      </p>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-bold">抽選応募設定</h2>
        <p className="text-sm text-gray-600">
          マイページに表示する「プレゼント抽選応募」パネルの、表示条件と文言を編集する。
        </p>
      </div>

      <LotterySettingsForm settings={settings} />

      <div className="mt-10 mb-4">
        <h2 className="text-lg font-bold">応募トークンの照合</h2>
        <p className="text-sm text-gray-600">
          マイページでトークンを表示したユーザーの記録。応募フォームの回答にあるトークンが、
          実際に発行したものか・誰のものかを確認できる。
        </p>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
        <input
          type="text"
          name="token"
          defaultValue={searchedToken}
          placeholder="トークンを貼り付け"
          aria-label="照合するトークン"
          className="w-64 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-bold text-white"
        >
          照合する
        </button>
        {searchedToken && (
          <Link href="/admin/lottery" className="text-sm underline">
            一覧に戻る
          </Link>
        )}
      </form>

      {tokens.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          {searchedToken
            ? `「${searchedToken}」は発行した記録がありません。`
            : "まだ発行したトークンはありません。"}
        </p>
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-600">
            {searchedToken ? "照合結果" : `発行済み ${tokens.length} 件`}
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-bold">トークン</th>
                  <th className="px-4 py-2.5 font-bold">ユーザー</th>
                  <th className="px-4 py-2.5 font-bold">現在のポイント</th>
                  <th className="px-4 py-2.5 font-bold">発行日時</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tokens.map((item) => (
                  <tr key={item.token} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono">{item.token}</td>
                    <td className="px-4 py-2.5">
                      {item.userId ? (
                        <>
                          {item.name ?? (
                            <span className="text-gray-400">（未設定）</span>
                          )}
                          <div className="font-mono text-xs text-gray-500">
                            {item.userId}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">退会済み</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {item.xp === null ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        formatPoints(item.xp)
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {new Date(item.issuedAt).toLocaleString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
