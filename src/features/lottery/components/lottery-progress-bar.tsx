import Link from "next/link";
import { getLotterySettings } from "@/features/lottery/services/lottery-settings";
import { getLotteryState } from "@/features/lottery/utils/eligibility";
import {
  formatLotteryEntryPeriod,
  formatLotteryOpenDate,
} from "@/features/lottery/utils/format-lottery-date";
import { getMyUserLevel } from "@/features/user-level/services/level";
import { getUser } from "@/features/user-profile/services/profile";

/**
 * 景品応募の状態表示。
 *
 * しきい値・日程は /admin/lottery の設定（lottery_settings）に従い、
 * 未達成／未オープン／受付中／終了の4状態を出し分ける。応募トークンの発行は
 * LotteryEntryPanel（マイページ）が担当するため、ここでは進捗と導線だけを
 * 表示する。
 */
export async function LotteryProgressBar() {
  const user = await getUser();
  if (!user) return null;

  const settings = await getLotterySettings();
  if (!settings) return null;

  const userLevel = await getMyUserLevel();
  const points = userLevel?.xp ?? 0;
  const threshold = settings.threshold_points;
  const state = getLotteryState({
    points,
    thresholdPoints: threshold,
    eligibleDisplayFrom: settings.eligible_display_from,
    eligibleDisplayUntil: settings.eligible_display_until,
  });

  if (state === "closed") {
    return (
      <div className="w-full rounded-xl border-2 bg-white p-4 text-left">
        <h2 className="text-sm font-bold text-gray-900">
          応募期間は終了しました
        </h2>
      </div>
    );
  }

  if (state === "not_eligible") {
    const remaining = Math.max(0, threshold - points);
    const progressValue = Math.min(points, threshold);
    return (
      <div className="w-full rounded-xl border-2 bg-white p-4 text-left">
        <h2 className="text-sm font-bold text-gray-900">
          期間中に{threshold.toLocaleString()}
          pt集めると、浜通りの産品が当たる抽選に応募可能！
        </h2>
        <div className="mt-2 flex items-baseline justify-between text-sm">
          <span className="font-bold text-gray-900">
            {progressValue.toLocaleString()}{" "}
            <span className="text-xs font-normal text-gray-500">
              / {threshold.toLocaleString()} pt
            </span>
          </span>
          <span className="text-xs text-gray-500">
            あと <b className="text-gray-900">{remaining.toLocaleString()}</b>{" "}
            ポイント
          </span>
        </div>
        <progress
          value={progressValue}
          max={threshold}
          aria-label="景品応募までのポイント"
          className="mt-2 h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:bg-yellow-400 [&::-moz-progress-bar]:bg-yellow-400"
        />
      </div>
    );
  }

  // before_open は eligible_display_from が非nullのときだけ返るが、型の上では
  // null になりうるため、日付がある場合のみ未オープンの案内を出す。
  if (state === "before_open" && settings.eligible_display_from) {
    return (
      <div className="w-full rounded-xl border-2 bg-white p-4 text-left">
        <h2 className="text-sm font-bold text-gray-900">
          プレゼント応募条件達成！
        </h2>
        <p className="mt-2 text-xs text-gray-500">
          応募フォームは{formatLotteryOpenDate(settings.eligible_display_from)}
          にオープンします。しばらくお待ちください。
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border-2 bg-white p-4 text-left">
      <h2 className="text-sm font-bold text-gray-900">
        プレゼント応募条件達成！
      </h2>
      <Link
        href={`/users/${user.id}`}
        className="mt-2 inline-block text-sm font-bold text-gray-900 underline"
      >
        プレゼント応募はこちらから
      </Link>
      {settings.eligible_display_from && settings.eligible_display_until && (
        <p className="mt-2 text-xs text-gray-500">
          応募期間：
          {formatLotteryEntryPeriod(
            settings.eligible_display_from,
            settings.eligible_display_until,
          )}
        </p>
      )}
    </div>
  );
}
