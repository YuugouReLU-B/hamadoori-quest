import { AdminDeleteUserButton } from "@/features/admin/components/admin-delete-user-button";
import { AdminRoleToggleButton } from "@/features/admin/components/admin-role-toggle-button";
import { listUsersForAdmin } from "@/features/admin/services/admin-users";
import { requireAdmin } from "@/features/admin/services/authorize-admin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [currentUser, users] = await Promise.all([
    requireAdmin(),
    listUsersForAdmin(),
  ]);
  const admins = users.filter((u) => u.isAdmin);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-lg font-bold">ユーザー</h2>
        <p className="text-sm text-gray-600">
          全 {users.length} 件（管理者 {admins.length}）
        </p>
      </div>

      <p className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        管理者にすると、クエストの作成・削除やポイント調整など管理画面のすべての操作ができるようになります。
        権限の変更は次回ログイン時から反映されます。
        <br />
        お問い合わせフォームから退会の申し出があった場合は「退会させる」から削除してください。
        Supabaseのダッシュボードで認証ユーザーだけを消すと、プロフィールなどが残ってしまいます。
      </p>

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
                    <AdminDeleteUserButton
                      userId={user.id}
                      userLabel={user.name ?? user.email ?? user.id}
                      isSelf={user.id === currentUser.id}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
