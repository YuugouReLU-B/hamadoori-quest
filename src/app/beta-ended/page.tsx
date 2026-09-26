import type { Metadata } from "next";
import LineLoginButton from "@/features/auth/components/line-login-button";

export const metadata: Metadata = {
  title: "ベータ期間は終了しました",
  robots: { index: false, follow: false },
};

/**
 * ベータ終了後に、除外パス以外のすべてのアクセスが集まる終了ページ。
 *
 * 終了後も管理者は管理画面に入る必要があるので、LINEログインだけ残す。
 * 全アクセスが集まる先なので、動的APIもリクエスト値も使わず静的なままにする。
 */
export default function BetaEndedPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold">ベータ期間は終了しました</h1>

      <p className="mt-4 text-sm leading-relaxed text-gray-600">
        浜通りクエストのベータ公開は終了しました。次のシーズンをお待ちください。
      </p>

      <div className="mt-10">
        <LineLoginButton />
      </div>
    </div>
  );
}
