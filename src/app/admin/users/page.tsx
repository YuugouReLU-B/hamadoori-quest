import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminRoleToggleButton } from "@/features/admin/components/admin-role-toggle-button";
import { listUsersForAdmin } from "@/features/admin/services/admin-users";
import { requireAdmin } from "@/features/admin/services/authorize-admin";
import {
  filterAdminUsers,
  paginate,
} from "@/features/admin/utils/admin-user-list";

export const dynamic = "force-dynamic";

function usersPageHref(query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/admin/users?${search}` : "/admin/users";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const [currentUser, allUsers] = await Promise.all([
    requireAdmin(),
    listUsersForAdmin(),
  ]);
  const adminCount = allUsers.filter((u) => u.isAdmin).length;
  const matched = filterAdminUsers(allUsers, query);
  const {
    items: users,
    page,
    totalPages,
  } = paginate(matched, Number(pageParam ?? 1));

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-lg font-bold">ユーザー</h2>
        <p className="text-sm text-gray-600">
          全 {allUsers.length} 件（管理者 {adminCount}）
        </p>
      </div>

      <p className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        管理者にすると、クエストの作成・削除やポイント調整など管理画面のすべての操作ができるようになります。
        権限の変更は次回ログイン時から反映されます。
        <br />
        お問い合わせフォームから削除の申し出があった場合は、
        <Link href="/admin/users/delete" className="underline">
          ユーザーデータの削除
        </Link>
        から行ってください。Supabaseのダッシュボードで認証ユーザーだけを消すと、プロフィールなどが残ってしまいます。
      </p>

      <form method="GET" className="mb-4 flex flex-wrap gap-2">
        <Input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ニックネーム・メールアドレス・ユーザーID"
          className="max-w-sm"
        />
        <Button type="submit" size="sm" variant="outline">
          検索
        </Button>
        {query && (
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/users">クリア</Link>
          </Button>
        )}
      </form>

      {query && (
        <p className="mb-2 text-sm text-gray-600">
          「{query}」に一致するユーザー {matched.length} 件
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2.5 font-bold">ニックネーム</th>
              <th className="px-4 py-2.5 font-bold">メールアドレス</th>
              <th className="px-4 py-2.5 font-bold">権限</th>
              <th className="px-4 py-2.5 font-bold">登録日</th>
              <th className="px-4 py-2.5 text-right font-bold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  {user.name ?? (
                    <span className="text-gray-400">（未設定）</span>
                  )}
                  <div className="font-mono text-xs text-gray-500">
                    {user.id}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-gray-700">
                  {user.email ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  {user.roles.length === 0 ? (
                    <span className="text-gray-400">一般</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            role === "admin"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {role}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-700">
                  {user.createdAt.slice(0, 10)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-start justify-end gap-2">
                    <AdminRoleToggleButton
                      userId={user.id}
                      userLabel={user.name ?? user.email ?? user.id}
                      isAdmin={user.isAdmin}
                      isSelf={user.id === currentUser.id}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-600">
            該当するユーザーがいません
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="ページ送り"
          className="mt-4 flex flex-wrap items-center justify-center gap-1 text-sm"
        >
          {page > 1 && (
            <Link
              href={usersPageHref(query, page - 1)}
              className="rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
            >
              前へ
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) =>
            n === page ? (
              <span
                key={n}
                aria-current="page"
                className="rounded-md bg-emerald-600 px-3 py-1.5 font-bold text-white"
              >
                {n}
              </span>
            ) : (
              <Link
                key={n}
                href={usersPageHref(query, n)}
                className="rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
              >
                {n}
              </Link>
            ),
          )}
          {page < totalPages && (
            <Link
              href={usersPageHref(query, page + 1)}
              className="rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
            >
              次へ
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
