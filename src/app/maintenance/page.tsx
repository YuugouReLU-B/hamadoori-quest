import type { Metadata } from "next";
import { EXTERNAL_LINKS } from "@/lib/constants/external-links";

export const metadata: Metadata = {
  title: "メンテナンス中",
  robots: { index: false, follow: false },
};

/**
 * メンテナンス中に出す画面。
 *
 * 派生元では「サービス終了」の演出（雪・龍・ロゴの集合・貢献者エンドロール）
 * が置かれていたが、他団体のロゴを掲げる画面だったので作り直した。
 * ここは復旧を待つ人に状況を伝える場所なので、演出は要らない。
 */
export default function MaintenancePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      {/* ヘッダーがすでにサービス名を出しているので、ここでは繰り返さない */}
      <h1 className="text-2xl font-bold">ただいまメンテナンス中です</h1>

      <p className="mt-4 text-sm leading-relaxed text-gray-600">
        システムの点検のため、一時的にご利用いただけません。
        <br />
        しばらく経ってから、もう一度お試しください。
      </p>

      <p className="mt-6 text-sm text-gray-600">
        獲得したポイントや達成の記録がなくなることはありません。
      </p>

      <a
        href={EXTERNAL_LINKS.feedback_action_board}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 text-sm underline underline-offset-2"
      >
        お問い合わせ
      </a>
    </div>
  );
}
