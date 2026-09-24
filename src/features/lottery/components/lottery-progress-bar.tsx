import { getLotterySettings } from "@/features/lottery/services/lottery-settings";
import { isBeforeOpenDate } from "@/features/lottery/utils/eligibility";
import { getMyUserLevel } from "@/features/user-level/services/level";
import { getUser } from "@/features/user-profile/services/profile";

/**
 * 景品応募までのポイント進捗バー。
 *
 * しきい値・タイトルは /admin/lottery の設定（lottery_settings）に従う。
 * 応募トークンの発行・案内はLotteryEntryPanelが担当するため、ここでは
 * 「あと何ポイント」の進捗表示だけを行う（トップページ等、応募導線までは
 * 出したくない場所向け）。
 */
export async function LotteryProgressBar() {
  const user = await getUser();
  if (!user) return null;

  const settings = await getLotterySettings();
  if (!settings) return null;
  if (isBeforeOpenDate(settings.eligible_display_from)) return null;

  const userLevel = await getMyUserLevel();
  const points = userLevel?.xp ?? 0;
  const threshold = settings.threshold_points;
  const remaining = Math.max(0, threshold - points);
  const progressValue = Math.min(points, threshold);

  return (
    <div className="w-full rounded-xl border-2 bg-white p-4 text-left">
      <h2 className="text-sm font-bold text-gray-900">{settings.title}</h2>
      <div className="mt-2 flex items-baseline justify-between text-sm">
        <span className="font-bold text-gray-900">
          {progressValue.toLocaleString()}{" "}
          <span className="text-xs font-normal text-gray-500">
            / {threshold.toLocaleString()} pt
          </span>
        </span>
        {remaining > 0 ? (
          <span className="text-xs text-gray-500">
            あと <b className="text-gray-900">{remaining.toLocaleString()}</b>{" "}
            ポイント
          </span>
        ) : (
          <span className="text-xs font-bold text-emerald-600">
            応募条件を達成！
          </span>
        )}
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
