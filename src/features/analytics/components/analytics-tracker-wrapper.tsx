"use client";

import { Suspense } from "react";
import { AnalyticsTracker } from "./analytics-tracker";

/**
 * AnalyticsTracker は useSearchParams を使うため Suspense 境界が必要。
 * 計測を丸ごと止めたい環境（E2E実行時やプレビュー）のために環境変数の逃げ道も用意する。
 */
export function AnalyticsTrackerWrapper() {
  if (process.env.NEXT_PUBLIC_ANALYTICS_DISABLED === "true") {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  );
}
