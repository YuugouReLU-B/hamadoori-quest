"use client";

import { Loader2, MapPin, Navigation } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import {
  setAnalyticsGps,
  trackEvent,
} from "@/features/analytics/utils/tracker";
import { geoCheckinAction } from "@/features/geo-checkin/actions/geo-checkin-actions";
import { QuestClearPanel } from "@/features/mission-detail/components/quest-clear-panel";
import { googleMapsSearchUrl } from "@/lib/utils/map-links";

type GeoCheckinButtonProps = {
  missionId: string;
  latitude: number | null;
  longitude: number | null;
  /** nullでなければ日時指定のイベント。文言の出し分けに使う */
  eventDate: string | null;
  /** このミッション達成前の合計ポイント。達成演出の「今のポイント」に使う */
  currentTotalPoints: number;
  /** サーバーコンポーネントの<LotteryProgressBar />をそのまま渡す */
  lotteryProgress: ReactNode;
  onSuccess?: () => void;
};

type CheckinState = "ready" | "checking" | "success" | "error";

// 演出後に達成済み表示へ切り替わるまでの猶予（この間に紙吹雪・獲得演出を見せる）
const CELEBRATION_MS = 2400;

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("この端末では位置情報が使えません"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  });
}

/**
 * 「イベントに来た」「スポットに来た」ボタン。
 *
 * 押した瞬間の位置情報を取得してサーバーへ送り、ミッションの座標から
 * 半径N m以内かどうかをサーバー側で判定する。判定そのものはブラウザで
 * 行わない（改ざんできてしまうため）。
 *
 * 成功時は他の達成演出（quest-clear-panel.tsx）と同じ見た目に切り替える。
 */
export function GeoCheckinButton({
  missionId,
  latitude,
  longitude,
  eventDate,
  currentTotalPoints,
  lotteryProgress,
  onSuccess,
}: GeoCheckinButtonProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState<CheckinState>("ready");
  const [message, setMessage] = useState<string | null>(null);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const hasLocation = latitude !== null && longitude !== null;
  const isEvent = eventDate !== null;
  const actionLabel = isEvent ? "イベントに来た" : "スポットに来た";
  const isSuccess = state === "success";

  const handleClick = () => {
    setMessage(null);
    setState("checking");
    startTransition(async () => {
      let position: GeolocationPosition;
      try {
        position = await getCurrentPosition();
        // この操作自体が位置情報の利用に同意したうえでのものなので、
        // 以降の計測イベントにも座標を添えてよい
        setAnalyticsGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
      } catch {
        setState("error");
        setMessage(
          "位置情報を取得できませんでした。端末の位置情報設定を確認してください。",
        );
        return;
      }

      const result = await geoCheckinAction(
        missionId,
        position.coords.latitude,
        position.coords.longitude,
      );

      // 「どこで何を獲得したか」を経路のなかに残す。
      // 座標は setAnalyticsGps 済みなのでイベント側に自動で付く
      trackEvent("geo_checkin", {
        props: { missionId, status: result.status },
        immediate: true,
      });

      switch (result.status) {
        case "granted":
          setEarnedPoints(result.xpGranted);
          setState("success");
          // 演出を見せてから達成済み表示へ切り替える（即切り替えると演出が見えない）
          setTimeout(() => {
            onSuccess?.();
            router.refresh();
          }, CELEBRATION_MS);
          return;
        case "already":
          setState("error");
          setMessage("すでに獲得済みです。");
          return;
        case "too_far": {
          const distanceKm = (result.distanceMeters / 1000).toFixed(1);
          setState("error");
          setMessage(
            `スポットから離れているようです（約${distanceKm}km）。現地に着いてからもう一度押してください。`,
          );
          return;
        }
        case "unavailable":
          setState("error");
          setMessage("このクエストは現在受付を停止しています。");
          return;
        case "not_configured":
          setState("error");
          setMessage(
            "このクエストはまだ位置情報の設定が完了していません。運営にお問い合わせください。",
          );
          return;
        case "unauthenticated":
          setState("error");
          setMessage("ログインし直してからもう一度お試しください。");
          return;
        case "invalid":
          setState("error");
          setMessage("このクエストは達成できませんでした。");
          return;
        default:
          setState("error");
          setMessage(result.message);
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="space-y-4">
        <QuestClearPanel
          earnedPoints={earnedPoints}
          totalPoints={currentTotalPoints + earnedPoints}
          note="浜通りでの一歩が、ポイントになりました。"
          showConfetti
        />
        {lotteryProgress}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 bg-white px-6 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Navigation className="h-10 w-10 text-gray-700" aria-hidden="true" />
        <p className="text-lg font-bold">現地に着いたらボタンを押そう</p>
        <p className="text-sm text-gray-600">
          その場で「{actionLabel}
          」を押すと、位置情報を確認してクエスト達成になります。
        </p>

        <button
          type="button"
          onClick={handleClick}
          disabled={state === "checking"}
          className="mt-1 flex h-14 w-64 max-w-full items-center justify-center gap-2 rounded-full border border-yellow-500 bg-primary text-base font-extrabold text-primary-foreground shadow-[0_4px_0_#eab308] transition-all duration-300 disabled:opacity-70"
        >
          {state === "checking" ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            actionLabel
          )}
        </button>

        {message && <output className="text-sm text-red-600">{message}</output>}

        {hasLocation && (
          <a
            href={googleMapsSearchUrl(latitude, longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm underline underline-offset-2"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            地図で場所を見る
          </a>
        )}
      </div>
    </div>
  );
}
