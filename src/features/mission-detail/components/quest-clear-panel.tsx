import { Check } from "lucide-react";

const CONFETTI_COLORS = [
  "bg-yellow-400",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-pink-400",
  "bg-orange-400",
];
const CONFETTI_PIECES = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${(i % 6) * 120}ms`,
  duration: `${2400 + (i % 4) * 400}ms`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

type QuestClearPanelProps = {
  /** 通常は「クエストクリア！」。初回クエストのみ「初回クエストクリア！」等に差し替える */
  heading?: string;
  /** 今回のクエストで獲得したポイント */
  earnedPoints: number;
  /** 現在の合計ポイント。導線ボタンの代わりにここへ表示する */
  totalPoints: number;
  /** 見出し下に出す短い説明文 */
  note: string;
  /** 達成した瞬間の演出（紙吹雪・リングアニメーション）を出すか。再訪時はfalse */
  showConfetti?: boolean;
};

/**
 * クエスト達成を表す共通パネル。
 *
 * チェックイン成功時（geo-checkin-button.tsx）・達成済み再訪時
 * （mission-achieved-panel.tsx）・初回クエストクリア画面
 * （first-mission-celebration.tsx）の3箇所で同じ見た目にするための
 * 共有コンポーネント。
 */
export function QuestClearPanel({
  heading = "クエストクリア！",
  earnedPoints,
  totalPoints,
  note,
  showConfetti = false,
}: QuestClearPanelProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border-2 bg-white px-6 py-8 text-center">
      {showConfetti && (
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          {CONFETTI_PIECES.map((piece, i) => (
            <i
              // biome-ignore lint/suspicious/noArrayIndexKey: 固定配列で並び替えが発生しないため
              key={i}
              className={`absolute top-[-10%] h-3 w-2 rounded-sm ${piece.color} animate-confetti-fall`}
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative flex flex-col items-center gap-2">
        <div className="relative flex h-16 w-16 items-center justify-center">
          {showConfetti && (
            <span
              className="absolute inset-0 rounded-full border-2 border-yellow-300 animate-success-ring"
              aria-hidden="true"
            />
          )}
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-yellow-100 bg-yellow-300 ${
              showConfetti ? "animate-in zoom-in duration-300" : ""
            }`}
          >
            <Check className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
        </div>
        <p className="text-xs font-bold tracking-wide text-yellow-700">
          達成済み
        </p>
        <h2 className="text-2xl font-bold text-gray-900">{heading}</h2>
        <p className="flex items-baseline justify-center gap-1 font-bold text-gray-900">
          <span className="text-xl">+</span>
          <span className="text-5xl tabular-nums">
            {earnedPoints.toLocaleString()}
          </span>
          <span className="text-base">ポイント獲得</span>
        </p>
        <p className="text-xs text-gray-500">{note}</p>

        <div className="mt-4 w-full border-t pt-4">
          <p className="text-xs text-gray-500">今のポイント</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalPoints.toLocaleString()}
            <span className="ml-1 text-sm font-bold">pt</span>
          </p>
        </div>
      </div>
    </div>
  );
}
