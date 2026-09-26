"use client";

import { useEffect, useState } from "react";
import { ProgressBarAnimated } from "@/features/user-level/components/progress-bar-animated";
import { formatPoints } from "@/lib/utils/format-points";

interface XpProgressToastContentProps {
  initialXp: number;
  xpGained: number;
  /** 抽選応募のしきい値。未設定なら null */
  thresholdPoints: number | null;
  onAnimationComplete: () => void;
}

/**
 * クエスト達成時に出るトースト。
 *
 * 以前はレベルアップ演出だったが、レベルの概念を廃止したので
 * 「獲得ポイント」と「抽選応募のしきい値までの進捗」を出すものに作り替えた。
 *
 * バーを出すのは、しきい値が設定されていて、かつ達成前の時点で未到達のときだけ。
 * 抽選の開始日（lottery_settings.eligible_display_from）はここでは見ない。
 * 応募できるかどうかを示す文言も出さないので、開始前にバーが出ても
 * 応募可能だと誤解されることはない。
 */
export function XpProgressToastContent({
  initialXp,
  xpGained,
  thresholdPoints,
  onAnimationComplete,
}: XpProgressToastContentProps) {
  const hasThreshold = thresholdPoints !== null && thresholdPoints > 0;
  // 達成前にすでにしきい値へ届いているなら、最初からバーを出さない
  const showsBarInitially = hasThreshold && initialXp < thresholdPoints;

  const [showBar, setShowBar] = useState(showsBarInitially);
  // バーを出さないケースは、トースト表示直後を3秒の起点にする
  const [countdownStarted, setCountdownStarted] = useState(!showsBarInitially);

  useEffect(() => {
    if (!countdownStarted) return;
    const timer = setTimeout(onAnimationComplete, 3000);
    return () => clearTimeout(timer);
  }, [countdownStarted, onAnimationComplete]);

  const totalPoints = initialXp + xpGained;
  const endValue =
    thresholdPoints !== null
      ? Math.min(totalPoints, thresholdPoints)
      : totalPoints;

  return (
    <div className="p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          {formatPoints(xpGained)}獲得しました！
        </h3>
      </div>

      {showBar && thresholdPoints !== null && (
        <ProgressBarAnimated
          zeroValue={0}
          maxValue={thresholdPoints}
          startValue={initialXp}
          endValue={endValue}
          className="mb-4"
          showText={false}
          animationDuration={1000}
          onAnimationComplete={() => {
            // ちょうど一致も達成扱い。到達したらバーを引っ込めてから3秒を数える
            if (endValue >= thresholdPoints) {
              setShowBar(false);
            }
            setCountdownStarted(true);
          }}
        />
      )}

      <div className="text-center">
        <div className="text-xs text-gray-500">
          合計 {formatPoints(totalPoints)}
        </div>
      </div>
    </div>
  );
}
