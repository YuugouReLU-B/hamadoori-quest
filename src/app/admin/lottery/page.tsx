import Link from "next/link";
import { LotterySettingsForm } from "@/features/admin/components/lottery-settings-form";
import {
  type LotteryTokenStatus,
  listLotteryTokensForAdmin,
  normalizeLotteryToken,
} from "@/features/admin/services/admin-lottery-tokens";
import { requireAdmin } from "@/features/admin/services/authorize-admin";
import { getLotterySettings } from "@/features/lottery/services/lottery-settings";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<LotteryTokenStatus, string> = {
  eligible: "有効（応募条件を満たす）",
  not_eligible: "有効（応募条件を満たしていない）",
  withdrawn: "無効（退会済み）",
};

const STATUS_STYLES: Record<LotteryTokenStatus, string> = {
  eligible: "bg-emerald-100 text-emerald-800",
  not_eligible: "bg-amber-100 text-amber-800",
  withdrawn: "bg-gray-100 text-gray-600",
};

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
          応募フォームの回答にあるトークンが、当団体が発行したもので、応募条件を満たしているかだけを確認できる。
          プライバシーポリシーで「応募フォームの情報を利用履歴と突き合わせない」としているため、
          誰のトークンか・何ポイントかは表示しない。応募フォームの運営事業者からはトークンだけを受け取り、この結果だけを返すこと。
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
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-bold">トークン</th>
                  <th className="px-4 py-2.5 font-bold">照合結果</th>
                  <th className="px-4 py-2.5 font-bold">発行日時</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tokens.map((item) => (
                  <tr key={item.token} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono">{item.token}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[item.status]}`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
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
