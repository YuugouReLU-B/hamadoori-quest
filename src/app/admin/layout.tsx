import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserIsAdmin } from "@/features/admin/services/authorize-admin";
import { getUser } from "@/features/user-profile/services/profile";
import { PATHNAME_HEADER } from "@/lib/supabase/middleware";
import { validateReturnUrl } from "@/lib/validation/url";

export const metadata: Metadata = {
  title: "管理画面",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * 運営用の管理画面。
 *
 * 未ログインならログイン画面へ誘導する（戻り先つき）。ログイン済みで管理者でなければ
 * 404 を返す。存在自体を伏せたいので 403 ではなく 404。
 * **ただしこれは表示の制御でしかない。** サーバーアクションはURLを知っていれば
 * 直接呼べるので、更新処理側でも requireAdmin() を通すこと。
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    // 404 を返すとログインすれば入れることに気づけない。戻り先を持たせてログインへ送る
    const pathname = (await headers()).get(PATHNAME_HEADER);
    const returnUrl = validateReturnUrl(pathname) ?? "/admin/missions";

    redirect(`/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  if (!(await currentUserIsAdmin())) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 print:max-w-none print:p-0">
        <header className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
          <h1 className="text-2xl font-extrabold">
            <Link href="/admin/missions">管理画面</Link>
          </h1>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            管理者のみ
          </span>
          <nav className="flex gap-3 text-sm underline underline-offset-2">
            <Link href="/admin/missions">クエスト</Link>
            <Link href="/admin/points">ポイント調整</Link>
            <Link href="/admin/lottery">抽選応募設定</Link>
            <Link href="/admin/analytics">アクセス解析</Link>
            <Link href="/admin/users">ユーザー</Link>
          </nav>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
