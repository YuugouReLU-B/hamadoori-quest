import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PointsAdjustForm } from "@/features/admin/components/points-adjust-form";
import { searchUsersForAdmin } from "@/features/admin/services/admin-users";

export const dynamic = "force-dynamic";

export default async function AdminPointsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const users = query ? await searchUsersForAdmin(query) : [];

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-bold">ポイント調整（デバッグ用）</h2>
        <p className="text-sm text-gray-600">
          ニックネームの一部、またはユーザーIDで検索して、現在のシーズンのXPを直接増減できます。
        </p>
      </div>

      <form method="GET" className="mb-6 flex gap-2">
        <Input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ニックネーム or ユーザーID"
          className="max-w-sm"
        />
        <Button type="submit" size="sm" variant="outline">
          検索
        </Button>
      </form>

      {query && users.length === 0 && (
        <p className="text-sm text-gray-600">
          「{query}」に一致するユーザーが見つかりませんでした
        </p>
      )}

      {users.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2.5 font-bold">ニックネーム</th>
                <th className="px-4 py-2.5 text-right font-bold">現在のXP</th>
                <th className="px-4 py-2.5 font-bold">ポイント調整</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    {user.name}
                    <div className="font-mono text-xs text-gray-500">
                      {user.id}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {user.xp}
                  </td>
                  <td className="px-4 py-2.5">
                    <PointsAdjustForm userId={user.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
