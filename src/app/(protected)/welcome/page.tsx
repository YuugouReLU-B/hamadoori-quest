import { redirect } from "next/navigation";
import { FirstMissionCelebration } from "@/features/missions/components/first-mission-celebration";
import { FirstMissionPrompt } from "@/features/missions/components/first-mission-prompt";
import { FIRST_MISSION_SLUGS } from "@/features/missions/components/first-missions";
import { getFirstMissionRecommendations } from "@/features/missions/services/first-mission-recommendations";
import { getUserLevel } from "@/features/user-level/services/level";
import { getUser } from "@/features/user-profile/services/profile";
import { getCurrentSeason } from "@/lib/services/seasons";
import { createAdminClient } from "@/lib/supabase/adminClient";

/**
 * 新規登録直後（初回クエストクリア後）に表示する祝福画面。
 *
 * bot_prompt によりログインと同時に友だち追加が完了している想定だが、
 * 確認できなければ達成済みと偽らず、挑戦を促す案内（スキップ可）を出す。
 */
export default async function WelcomePage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createAdminClient();
  const firstMissionSlug = FIRST_MISSION_SLUGS[0];

  // 互いに独立な読み取りはまとめて投げる。
  // 達成判定は achievements を1回引けば済むので、ミッションごとに引き直さない
  const [{ data: mission }, { data: achievements }, season] = await Promise.all(
    [
      supabase
        .from("missions")
        .select("id, title, icon_url, points, slug")
        .eq("slug", firstMissionSlug)
        .eq("is_hidden", false)
        .maybeSingle(),
      supabase.from("achievements").select("mission_id").eq("user_id", user.id),
      getCurrentSeason(),
    ],
  );

  if (!mission) {
    redirect("/");
  }

  const achievedMissionIds = new Set(
    (achievements ?? []).flatMap((a) => (a.mission_id ? [a.mission_id] : [])),
  );

  if (!achievedMissionIds.has(mission.id)) {
    return <FirstMissionPrompt mission={mission} />;
  }

  const [recommendations, userLevel] = await Promise.all([
    getFirstMissionRecommendations(supabase, user.id, achievedMissionIds),
    season ? getUserLevel(user.id, season.id) : Promise.resolve(null),
  ]);

  return (
    <FirstMissionCelebration
      mission={mission}
      totalPoints={userLevel?.xp ?? mission.points}
      events={recommendations.events}
      spots={recommendations.spots}
    />
  );
}
