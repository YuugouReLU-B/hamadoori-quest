"use client";

import QRCode from "react-qr-code";

type QrSheetProps = {
  title: string;
  /** 獲得できるポイント（注目ミッションの2倍を反映した値） */
  points: number;
  qrUrl: string;
  /** 運営が現物を照合するための識別子。利用者向けの情報ではない */
  slug: string;
};

/**
 * 店やイベント会場に置く印刷用のQRシート。1枚で1スポット。
 *
 * 読み取りURLの文字列は載せない。QRを撮影されるのと違い、
 * 文字列は書き写して人に伝えられてしまうため。
 */
export function QrSheet({ title, points, qrUrl, slug }: QrSheetProps) {
  return (
    <section className="mx-auto flex w-full max-w-[600px] break-after-page last:break-after-auto flex-col items-center justify-center gap-6 border border-gray-200 px-8 py-12 text-center print:min-h-[95vh] print:border-0">
      <p className="text-lg font-bold tracking-widest text-gray-500">
        浜通りクエスト
      </p>

      <h2 className="text-3xl font-bold leading-snug">{title}</h2>

      <div className="rounded-2xl bg-white p-4">
        {/* 印刷後の紙面で読み取れるだけの大きさが要る */}
        <QRCode value={qrUrl} size={320} />
      </div>

      <p className="text-xl font-bold">
        スマホのカメラで読み取ると
        <br />
        <span className="text-3xl">{points}ポイント</span>
      </p>

      <p className="text-sm text-gray-600">
        はじめての方は、読み取ったあとLINEで登録するとポイントが貯まります。
      </p>

      <p className="mt-2 font-mono text-[10px] text-gray-400">{slug}</p>
    </section>
  );
}
