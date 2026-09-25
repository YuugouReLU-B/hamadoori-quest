"use client";

import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { useState } from "react";
import { CopyReferralButton } from "@/features/mission-detail/components/copy-referral-button";
import { GeoCheckinButton } from "@/features/mission-detail/components/geo-checkin-button";
import { MissionAchievedPanel } from "@/features/mission-detail/components/mission-achieved-panel";
import { MissionFormWrapper } from "@/features/mission-detail/components/mission-form-wrapper";
import QRCodeDisplay from "@/features/mission-detail/components/qr-code-display";
import { QrSpotGuide } from "@/features/mission-detail/components/qr-spot-guide";
import { LineFriendForm } from "@/features/missions/components/line-friend-form";
import { MissionGuidanceArrow } from "@/features/missions/components/mission-guidance-arrow";
import { useMissionSubmission } from "@/features/missions/hooks/use-mission-submission";
import { ARTIFACT_TYPES } from "@/lib/types/artifact-types";
import type { Tables } from "@/lib/types/supabase";
import { MainLinkButton } from "./main-link-button";

type Props = {
  mission: Tables<"missions">;
  authUser: User;
  referralCode: string | null;
  initialUserAchievementCount: number;
  /** 達成演出パネルの「今のポイント」に使う、このミッション達成前の合計ポイント */
  currentTotalPoints: number;
  /** サーバーコンポーネントの<LotteryProgressBar />をそのまま渡す */
  lotteryProgress: ReactNode;
  missionId: string;
  preloadedQuizQuestions?:
    | {
        id: string;
        question: string;
        options: string[];
        category?: string;
      }[]
    | null;
  mainLink: Tables<"mission_main_links"> | null;
};

export function MissionWithSubmissionHistory({
  mission,
  authUser,
  referralCode,
  initialUserAchievementCount,
  currentTotalPoints,
  lotteryProgress,
  preloadedQuizQuestions,
  mainLink,
}: Props) {
  const [userAchievementCount, setUserAchievementCount] = useState(
    initialUserAchievementCount,
  );

  // useMissionSubmissionフックを使用して統一
  const { hasReachedUserMaxAchievements } = useMissionSubmission(
    mission,
    userAchievementCount,
  );

  const refreshSubmissions = () => {
    setUserAchievementCount((prev) => prev + 1);
  };

  // クライアントサイドでのみwindow.location.originを使用
  const origin =
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const signupUrl = `${origin}/?ref=${referralCode}`;

  // LINK,QUIZ,リファラル,被紹介は視覚的導線を表示しない
  const isNoGuidanceArrow =
    mission.required_artifact_type === ARTIFACT_TYPES.LINK_ACCESS.key ||
    mission.required_artifact_type === ARTIFACT_TYPES.QUIZ.key ||
    mission.required_artifact_type === ARTIFACT_TYPES.LINE_FRIEND.key ||
    mission.required_artifact_type === ARTIFACT_TYPES.QR.key ||
    mission.required_artifact_type === ARTIFACT_TYPES.GEO_CHECKIN.key ||
    mission.required_artifact_type === ARTIFACT_TYPES.REFERRAL.key ||
    mission.required_artifact_type === ARTIFACT_TYPES.REFERRED.key;

  // フォームが表示される条件と同じ
  const shouldShowGuidanceArrow =
    (!hasReachedUserMaxAchievements ||
      mission.required_artifact_type === ARTIFACT_TYPES.LINK_ACCESS.key) &&
    !isNoGuidanceArrow;

  return (
    <>
      {/* リンクアクセスのボタンは別で表示しているので、ここでは除外 */}
      {mission.required_artifact_type !== ARTIFACT_TYPES.LINK_ACCESS.key &&
        mission.required_artifact_type !== ARTIFACT_TYPES.LINE_FRIEND.key &&
        mainLink != null && (
          <MainLinkButton
            mission={mission}
            mainLink={mainLink}
            isDisabled={false}
          />
        )}
      {/* フォームと同じ条件で視覚的導線を表示 */}
      {shouldShowGuidanceArrow && <MissionGuidanceArrow />}
      {mission.required_artifact_type === "REFERRAL" &&
        authUser &&
        referralCode && (
          <div className="bg-white rounded-xl border-2 p-6 flex flex-col items-center">
            <p className="mb-2 font-semibold text-center text-lg">
              あなた専用紹介URL
            </p>
            <p className="text-sm text-muted-foreground">
              あなた専用の紹介URLを周りの人に共有して、紹介URLから登録が完了すると、自動でクエストクリア回数がカウントされます。
            </p>
            <p className="text-sm mt-4 font-bold">QRコードをスキャン</p>
            <QRCodeDisplay value={signupUrl} />
            <p className="text-sm">または</p>
            <CopyReferralButton referralUrl={signupUrl} />
          </div>
        )}

      {mission.required_artifact_type === ARTIFACT_TYPES.LINE_FRIEND.key &&
        (hasReachedUserMaxAchievements ? (
          // 達成済みなのに「友だち追加する」を出し続けると、
          // 下の達成履歴と矛盾して何をすればいいのか分からなくなる
          <MissionAchievedPanel
            missionSlug={mission.slug}
            points={mission.points}
            totalPoints={currentTotalPoints}
            lotteryProgress={lotteryProgress}
          />
        ) : (
          <div className="bg-white rounded-xl border-2 p-6">
            <LineFriendForm
              addFriendUrl={mainLink?.link}
              onSuccess={refreshSubmissions}
            />
          </div>
        ))}

      {mission.required_artifact_type === ARTIFACT_TYPES.QR.key &&
        (hasReachedUserMaxAchievements ? (
          <MissionAchievedPanel
            missionSlug={mission.slug}
            points={mission.points}
            totalPoints={currentTotalPoints}
            lotteryProgress={lotteryProgress}
          />
        ) : (
          <QrSpotGuide
            latitude={mission.latitude}
            longitude={mission.longitude}
          />
        ))}

      {mission.required_artifact_type === ARTIFACT_TYPES.GEO_CHECKIN.key &&
        (hasReachedUserMaxAchievements ? (
          <MissionAchievedPanel
            missionSlug={mission.slug}
            points={mission.points}
            totalPoints={currentTotalPoints}
            lotteryProgress={lotteryProgress}
          />
        ) : (
          <GeoCheckinButton
            missionId={mission.id}
            latitude={mission.latitude}
            longitude={mission.longitude}
            eventDate={mission.event_date}
            currentTotalPoints={currentTotalPoints}
            lotteryProgress={lotteryProgress}
            onSuccess={refreshSubmissions}
          />
        ))}

      {mission.required_artifact_type !== "REFERRAL" &&
        mission.required_artifact_type !== ARTIFACT_TYPES.LINE_FRIEND.key &&
        mission.required_artifact_type !== ARTIFACT_TYPES.QR.key &&
        mission.required_artifact_type !== ARTIFACT_TYPES.GEO_CHECKIN.key && (
          <MissionFormWrapper
            mission={mission}
            authUser={authUser}
            userAchievementCount={userAchievementCount}
            onSubmissionSuccess={refreshSubmissions}
            preloadedQuizQuestions={preloadedQuizQuestions}
            mainLink={mainLink}
          />
        )}
    </>
  );
}
