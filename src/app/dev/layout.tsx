import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DevTabs } from "@/features/dev-tools/components/dev-tabs";

export const metadata: Metadata = {
  title: "開発ツール",
  robots: { index: false, follow: false },
};

// このレイアウトを静的にプリレンダーさせない。
// force-dynamic が無いと本番ビルド時に notFound() の判定が固定化され、
// 起動時に ALLOW_DEV_ROUTES_FOR_E2E を立てても反映されなくなる。
export const dynamic = "force-dynamic";

/**
 * 開発専用ページ。
 *
 * 本番ビルドでは常に 404 を返す。ページ一覧はファイルシステムを読み、
 * ミッション一覧は service_role でDBを読むため、外部に出してはいけない。
 *
 * **例外**: CIのE2Eテストは `pnpm run start`（本番ビルド）に対して実行するため、
 * このままだと LINE ログイン以外の唯一のログイン手段である /dev/login まで
 * 404 になり、ログインが要る E2E がすべて動かなくなる。
 * `ALLOW_DEV_ROUTES_FOR_E2E` はCIワークフロー内でのみ設定する値であり、
 * Vercelの本番環境変数には**絶対に設定してはいけない**。
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  const isProduction = process.env.NODE_ENV === "production";
  const allowedForE2E = process.env.ALLOW_DEV_ROUTES_FOR_E2E === "true";

  if (isProduction && !allowedForE2E) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">開発ツール</h1>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              開発環境のみ
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            このページは本番ビルドでは 404 になります。
          </p>
        </header>

        <DevTabs />

        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
