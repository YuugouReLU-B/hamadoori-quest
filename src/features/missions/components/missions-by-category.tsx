import {
  QUEST_CATEGORIES,
  QUEST_CATEGORY_LABELS,
} from "@/features/missions/constants/quest-categories";
import { getMissionCategoryView } from "@/features/missions/loaders/missions-loaders";
import { groupMissionsByCategory } from "@/features/missions/utils/group-missions-by-category";
import { getUserMissionAchievements } from "@/features/user-achievements/loaders/achievements-loaders";
import { HorizontalScrollContainer } from "./horizontal-scroll-container";
import Mission from "./mission-card";
import { toTaggedMission } from "./missions-tags";
import { MissionsViewToggle } from "./missions-view-toggle";

type MissionsByCategoryProps = {
  userId?: string;
};

export default async function MissionsByCategory({
  userId,
}: MissionsByCategoryProps) {
  // ユーザーの各ミッションに対する達成回数のマップ
  const userAchievementCountMap = userId
    ? await getUserMissionAchievements(userId)
    : new Map<string, number>();

  // ユーザーが達成したミッションIDのリスト
  const achievedMissionIds = Array.from(userAchievementCountMap.keys());

  // View からミッションデータ取得
  const data = await getMissionCategoryView();

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">クエストが見つかりませんでした</p>
      </div>
    );
  }

  // カテゴリごとにグループ化・ソート・フィルタリング・変換（達成済みは常に含める。
  // 一覧モードでは末尾に回り、地図モードでは達成状況の色分けに使う）
  const categories = groupMissionsByCategory(data, userAchievementCountMap, {
    showAchievedMissions: true,
    achievedMissionIds,
  });

  // 旧カテゴリに複数所属していても、各ミッションは1回だけ表示する。
  const missions = Array.from(
    new Map(
      categories
        .flatMap((category) => category.missions)
        .map((mission) => [mission.id, mission]),
    ).values(),
  );
  const taggedMissions = missions.map((mission) =>
    toTaggedMission(mission, userAchievementCountMap.get(mission.id) ?? 0),
  );
  const questGroups = QUEST_CATEGORIES.map((questCategory) => ({
    questCategory,
    missions: taggedMissions
      .filter(({ mission }) => mission.quest_category === questCategory)
      .sort((a, b) => Number(a.achieved) - Number(b.achieved)),
  })).filter((group) => group.missions.length > 0);

  const listView = (
    <div className="flex flex-col gap-11">
      {questGroups.map((group) => (
        <section
          key={group.questCategory}
          className="relative w-full min-w-0 md:pl-10"
        >
          <h3 className="text-lg font-bold pl-4 md:pl-0">
            {QUEST_CATEGORY_LABELS[group.questCategory]}
          </h3>
          <HorizontalScrollContainer>
            <div className="flex w-fit gap-4 pl-4 md:pl-0 pr-4 pb-2 pt-4">
              {group.missions.map(({ mission, userAchievementCount }) => (
                <div key={mission.id} className="shrink-0 w-[300px]">
                  <Mission
                    mission={mission}
                    userAchievementCount={userAchievementCount}
                  />
                </div>
              ))}
            </div>
          </HorizontalScrollContainer>
        </section>
      ))}
    </div>
  );

  // 地図モード用に、座標を持つミッションだけ抽出する
  const mapMissions = taggedMissions.filter(
    (m) => m.mission.latitude !== null && m.mission.longitude !== null,
  );

  // カレンダーモード用に、特設クエストのうち開催日を持つミッションを抽出する
  const calendarMissions = taggedMissions.filter(
    (m) => m.questType === "特設クエスト" && m.mission.event_date,
  );

  return (
    <div className="flex flex-col gap-11">
      <MissionsViewToggle
        mapMissions={mapMissions}
        calendarMissions={calendarMissions}
      >
        {listView}
      </MissionsViewToggle>
    </div>
  );
}
