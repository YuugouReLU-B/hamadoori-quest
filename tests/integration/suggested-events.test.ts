import { getSuggestedEvent } from "@/features/mission-detail/services/suggested-events";
import {
  cleanupTestMission,
  createTestMission,
  type TestMission,
} from "./mission-test-helpers";
import { adminClient, cleanupTestUser, createTestUser } from "./utils";

/**
 * missions.yaml起因の既存QR/GEO_CHECKINミッション（event-a等）と競合しないよう、
 * テスト実行時点で存在する未達成の候補をすべて達成済みにしてからテストする。
 */
async function achieveAllExistingCandidates(userId: string) {
  const { data: season } = await adminClient
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .single();

  const { data: missions } = await adminClient
    .from("missions")
    .select("id")
    .in("required_artifact_type", ["QR", "GEO_CHECKIN"])
    .eq("is_hidden", false);

  if (!missions || missions.length === 0) return;

  await adminClient.from("achievements").insert(
    missions.map((m) => ({
      user_id: userId,
      mission_id: m.id,
      season_id: season?.id,
    })),
  );
}

describe("getSuggestedEvent", () => {
  const userIds: string[] = [];
  const missionIds: string[] = [];

  afterAll(async () => {
    for (const missionId of missionIds) {
      await cleanupTestMission(missionId);
    }
    for (const userId of userIds) {
      await cleanupTestUser(userId);
    }
  });

  async function makeUser() {
    const { user } = await createTestUser();
    userIds.push(user.userId);
    return user.userId;
  }

  async function makeMission(params: {
    requiredArtifactType: string;
    slug: string;
  }) {
    const mission = await createTestMission(params);
    missionIds.push(mission.id);
    return mission;
  }

  async function markAchieved(userId: string, mission: TestMission) {
    const { data: season } = await adminClient
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .single();
    await adminClient.from("achievements").insert({
      user_id: userId,
      mission_id: mission.id,
      season_id: season?.id,
    });
  }

  test("未達成のQR/GEO_CHECKINミッションを候補として返す", async () => {
    const userId = await makeUser();
    await achieveAllExistingCandidates(userId);
    const excluded = await makeMission({
      requiredArtifactType: "QR",
      slug: `suggested-excluded-${Date.now()}`,
    });
    // 他テストが並行して作るミッション（デフォルトは日本語タイトル）より
    // 必ずtitle順で先頭に来るよう、ASCIIから始まるタイトルにする
    const candidate = await createTestMission({
      requiredArtifactType: "GEO_CHECKIN",
      slug: `suggested-candidate-${Date.now()}`,
      title: `0-suggested-candidate-${Date.now()}`,
    });
    missionIds.push(candidate.id);

    const result = await getSuggestedEvent(adminClient, userId, excluded.id);

    expect(result?.id).toBe(candidate.id);
  });

  test("達成済みのミッションは候補にならない", async () => {
    const userId = await makeUser();
    const excluded = await makeMission({
      requiredArtifactType: "QR",
      slug: `suggested-excluded2-${Date.now()}`,
    });
    const achieved = await makeMission({
      requiredArtifactType: "QR",
      slug: `suggested-achieved-${Date.now()}`,
    });
    await markAchieved(userId, achieved);

    const result = await getSuggestedEvent(adminClient, userId, excluded.id);

    // 他の並行テストが作る未達成ミッションが返ることはあり得るため、
    // 「達成済みミッション自体は返らない」ことだけを検証する
    expect(result?.id).not.toBe(achieved.id);
  });

  test("QR/GEO_CHECKIN以外のミッションは候補にならない", async () => {
    const userId = await makeUser();
    const excluded = await makeMission({
      requiredArtifactType: "QR",
      slug: `suggested-excluded3-${Date.now()}`,
    });
    const linkMission = await makeMission({
      requiredArtifactType: "LINK",
      slug: `suggested-link-${Date.now()}`,
    });

    const result = await getSuggestedEvent(adminClient, userId, excluded.id);

    expect(result?.id).not.toBe(linkMission.id);
  });

  test("終わったイベントは候補にならない", async () => {
    const userId = await makeUser();
    await achieveAllExistingCandidates(userId);
    const excluded = await makeMission({
      requiredArtifactType: "QR",
      slug: `suggested-excluded4-${Date.now()}`,
    });
    const ended = await makeMission({
      requiredArtifactType: "GEO_CHECKIN",
      slug: `suggested-ended-${Date.now()}`,
    });
    await adminClient
      .from("missions")
      .update({ event_date: "2000-01-01", event_end_date: "2000-01-02" })
      .eq("id", ended.id);

    const result = await getSuggestedEvent(adminClient, userId, excluded.id);

    expect(result?.id).not.toBe(ended.id);
  });
});
