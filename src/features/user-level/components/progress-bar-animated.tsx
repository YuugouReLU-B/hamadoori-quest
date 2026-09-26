"use client";

import { useEffect, useState } from "react";
import { formatPoints } from "@/lib/utils/format-points";
import { cn } from "@/lib/utils/utils";

interface ProgressBarAnimatedProps {
  zeroValue: number;
  maxValue: number;
  startValue: number;
  endValue: number;
  className?: string;
  animationDuration?: number;
  showText?: boolean;
  onAnimationComplete?: () => void;
}

export function ProgressBarAnimated({
  zeroValue,
  maxValue,
  startValue,
  endValue,
  className,
  animationDuration = 3000,
  showText = true,
  onAnimationComplete,
}: ProgressBarAnimatedProps) {
  const [animatedValue, setAnimatedValue] = useState(startValue);
  const [isAnimating, setIsAnimating] = useState(false);

  const range = maxValue - zeroValue;
  const percentage = Math.min(((animatedValue - zeroValue) / range) * 100, 100);

  // biome-ignore lint/correctness/useExhaustiveDependencies: アニメーションが不用意に再起動しないようにするため
  useEffect(() => {
    setIsAnimating(true);
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // イージング関数（ease-out）
      const easeOut = 1 - (1 - progress) ** 3;
      const currentValue = startValue + (endValue - startValue) * easeOut;

      setAnimatedValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        onAnimationComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }, [endValue, startValue]);

  return (
    <div className={cn("w-full", className)}>
      {showText && (
        <div className="flex justify-end text-sm mb-2">
          <span className="font-bold">
            {Math.round(animatedValue)} / {formatPoints(maxValue)}
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
        <div
          className={cn(
            "bg-linear-to-r from-[var(--app-brand-primary)] to-[var(--app-brand-progress-end)] h-3 rounded-full transition-all duration-300 shadow-xs",
          )}
          style={{
            width: `${percentage}%`,
            transition: isAnimating ? "none" : "width 0.3s ease-out",
          }}
        />
      </div>
    </div>
  );
}
