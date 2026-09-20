import { DevLoginForm } from "@/features/dev-tools/components/dev-login-form";

export const dynamic = "force-dynamic";

export default function DevLoginPage() {
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold">開発用ログイン</h2>

      <p className="mb-6 text-sm text-gray-600">
        一般ユーザー向けのログイン導線はトップ（
        <code className="rounded bg-gray-100 px-1.5 py-0.5">/</code>）の LINE
        ログインのみになったため、メールアドレス+パスワードでのログインは
        このページに分離しています。本番ビルドでは 404 になります。
      </p>

      <DevLoginForm />

      <div className="mt-8">
        <h3 className="mb-2 text-sm font-bold">
          seed で作成される開発用アカウント
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2.5 font-bold">メールアドレス</th>
                <th className="px-4 py-2.5 font-bold">パスワード</th>
                <th className="px-4 py-2.5 font-bold">ロール</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2.5 font-mono">admin@example.com</td>
                <td className="px-4 py-2.5 font-mono">admin123456</td>
                <td className="px-4 py-2.5">admin</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono">
                  posting-admin@example.com
                </td>
                <td className="px-4 py-2.5 font-mono">postingadmin123456</td>
                <td className="px-4 py-2.5">posting-admin</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono">
                  tanaka.hanako@example.com ほか
                </td>
                <td className="px-4 py-2.5 font-mono">password123</td>
                <td className="px-4 py-2.5">一般</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          定義は{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5">
            supabase/seed.sql
          </code>{" "}
          にあります。
        </p>
      </div>
    </section>
  );
}
