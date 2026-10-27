import { Button } from "@/components/ui/button";
import { CopyTokenButton } from "@/features/lottery/components/copy-token-button";
import {
  isLotteryPreview,
  LOTTERY_PREVIEW_TOKEN,
  previewLotteryInputs,
} from "@/features/lottery/services/lottery-preview";
import { getLotterySettings } from "@/features/lottery/services/lottery-settings";
import { getOrIssueLotteryToken } from "@/features/lottery/services/lottery-token-store";
import {
  getLotteryState,
  isBeforeOpenDate,
} from "@/features/lottery/utils/eligibility";
import { getMyUserLevel } from "@/features/user-level/services/level";
import { getUser } from "@/features/user-profile/services/profile";
import { formatPoints } from "@/lib/utils/format-points";

/**
 * 抽選応募パネル。
 *
 * 開始日以降、累計ポイントがしきい値に達したユーザーに応募トークンを表示する。
 * 応募期間の終了後は、ポイントの達成・未達成に関係なく終了メッセージのみを出す。
 * しきい値・文言・応募先URLは /admin/lottery から編集する（lottery_settings）。
 * 応募の受付・当選確認・景品発送は外部フォーム（プレゼント事務局側の運用）
 * に委ねるため、ここではトークンの発行と案内だけを行う。
 * 管理者がプレビュー中（/admin/lottery で切り替え）なら、受付中の表示を見本の
 * トークンで出す。本物のトークンは発行しない。
 */
export async function LotteryEntryPanel() {
  const user = await getUser();
  if (!user) return null;

  const settings = await getLotterySettings();
  if (!settings) return null;

  const preview = await isLotteryPreview(user);
  const previewInputs = preview ? previewLotteryInputs(settings) : null;
  const userLevel = await getMyUserLevel();
  const points = previewInputs?.points ?? userLevel?.xp ?? 0;
  const hasEnoughPoints = points >= settings.threshold_points;
  const state = getLotteryState({
    points,
    thresholdPoints: settings.threshold_points,
    eligibleDisplayFrom: settings.eligible_display_from,
    eligibleDisplayUntil: settings.eligible_display_until,
    now: previewInputs?.now,
  });
  const isClosed = state === "closed";
  // 状態は closed を優先するため、日付側の条件は述語を併用して判定する
  const isBeforeOpen = isBeforeOpenDate(
    settings.eligible_display_from,
    previewInputs?.now,
  );
  const isEligible = state === "open";
  const startDateLabel = settings.eligible_display_from
    ? new Date(
        `${settings.eligible_display_from}T00:00:00+09:00`,
      ).toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  // シークレット未設定などで発行・記録できないときは、パネルごと出さない
  const token = !isEligible
    ? null
    : preview
      ? LOTTERY_PREVIEW_TOKEN
      : await getOrIssueLotteryToken(user.id);
  if (isEligible && !token) return null;

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-card p-4">
      {preview && (
        <p className="mb-2 rounded-md bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800">
          管理者プレビュー中（応募開始後の表示）。他の人の画面は変わっていません。トークンは見本で、応募には使えません。
        </p>
      )}
      <p className="text-lg font-bold">{settings.title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
        {settings.description}
        （現在{formatPoints(points)}）
      </p>

      {token ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-bold">あなたの応募トークン</p>
          <p className="rounded-md bg-gray-100 px-3 py-2 font-mono text-lg tracking-wider">
            {token}
          </p>
          <CopyTokenButton token={token} />
          {settings.form_url && (
            <Button asChild className="mt-2 w-full">
              <a
                href={settings.form_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {settings.button_label}
              </a>
            </Button>
          )}
          <p className="text-xs font-bold text-gray-500">
            応募フォームの回答欄にこのトークンを貼り付けてください。
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          {isClosed ? (
            <p>応募期間は終了しました</p>
          ) : (
            <>
              {isBeforeOpen && (
                <p>まだ応募できません（応募開始: {startDateLabel}〜）</p>
              )}
              {!hasEnoughPoints && (
                <p>
                  あと{formatPoints(settings.threshold_points - points)}
                  {isBeforeOpen
                    ? "でポイント条件を満たします。"
                    : "で応募できます。"}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
