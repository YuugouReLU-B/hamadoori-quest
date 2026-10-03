import type { SupabaseClient } from "@supabase/supabase-js";
import { redeemGeoCheckin } from "@/features/geo-checkin/use-cases/redeem-geo-checkin";
import {
  ACHIEVEMENT_LIMIT_REACHED_MESSAGE,
  achieveMission,
} from "@/features/mission-detail/use-cases/achieve-mission";
import { ARTIFACT_TYPES } from "@/lib/types/artifact-types";
import type { Database } from "@/lib/types/supabase";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
} from "../supabase/utils";
import {
  cleanupTestMission,
  cleanupTestUserLevel,
  cleanupTestXpTransactions,
  createTestMission,
  getTestUserXp,
  initializeTestUserLevel,
} from "./mission-test-helpers";

// 連打・複数タブを模して、同じ達成リクエストを同時に送る
const CONCURRENCY = 6;

describe("ポイントの二重付与を防ぐ", () => {
  let userId: string;
  let userClient: SupabaseClient<Database>;
  const missionIds: string[] = [];

  beforeEach(async () => {
    const { user, client } = await createTestUser();
    userId = user.userId;
    userClient = client;
    await initializeTestUserLevel(userId);
  });

  afterEach(async () => {
    for (const id of missionIds.splice(0)) {
      await adminClient.from("achievements").delete().eq("mission_id", id);
      await cleanupTestMission(id);
    }
    await cleanupTestXpTransactions(userId);
    await cleanupTestUserLevel(userId);
    await cleanupTestUser(userId);
  });

  async function countAchievements(missionId: string) {
    const { count } = await adminClient
      .from("achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("mission_id", missionId);
    return count;
  }

  test("1回限りのクエストに同時に達成が届いても、記録もポイントも1回分だけ", async () => {
    const mission = await createTestMission({
      requiredArtifactType: "NONE",
      points: 100,
      maxAchievementCount: 1,
    });
    missionIds.push(mission.id);

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        achieveMission(adminClient, userClient, {
          userId,
          missionId: mission.id,
          artifactType: "NONE",
          artifactData: {
            missionId: mission.id,
            requiredArtifactType: "NONE",
          } as never,
        }),
      ),
    );

    expect(results.filter((r) => r.success)).toHaveLength(1);
    for (const r of results.filter((r) => !r.success)) {
      expect(r.success === false && r.error).toBe(
        ACHIEVEMENT_LIMIT_REACHED_MESSAGE,
      );
    }
    expect(await countAchievements(mission.id)).toBe(1);
    expect((await getTestUserXp(userId))?.xp).toBe(100);
  });

  test("上限2回のクエストに同時に届いても、2回までしか記録しない", async () => {
    const mission = await createTestMission({
      requiredArtifactType: "NONE",
      points: 50,
      maxAchievementCount: 2,
    });
    missionIds.push(mission.id);

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        achieveMission(adminClient, userClient, {
          userId,
          missionId: mission.id,
          artifactType: "NONE",
          artifactData: {
            missionId: mission.id,
            requiredArtifactType: "NONE",
          } as never,
        }),
      ),
    );

    expect(results.filter((r) => r.success)).toHaveLength(2);
    expect(await countAchievements(mission.id)).toBe(2);
    expect((await getTestUserXp(userId))?.xp).toBe(100);
  });

  test("別々のクエストを同時に達成しても、累計ポイントが取りこぼされない", async () => {
    const missions = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) =>
        createTestMission({
          slug: `double-award-multi-${Date.now()}-${i}`,
          requiredArtifactType: "NONE",
          points: 10,
          maxAchievementCount: 1,
        }),
      ),
    );
    missionIds.push(...missions.map((m) => m.id));

    const results = await Promise.all(
      missions.map((mission) =>
        achieveMission(adminClient, userClient, {
          userId,
          missionId: mission.id,
          artifactType: "NONE",
          artifactData: {
            missionId: mission.id,
            requiredArtifactType: "NONE",
          } as never,
        }),
      ),
    );

    expect(results.every((r) => r.success)).toBe(true);
    // 履歴の合計と累計が一致すること（読み書きの競合で上書きされていない）
    const { data: txs } = await adminClient
      .from("xp_transactions")
      .select("xp_amount")
      .eq("user_id", userId);
    const ledger = (txs ?? []).reduce((sum, tx) => sum + tx.xp_amount, 0);
    expect(ledger).toBe(10 * CONCURRENCY);
    expect((await getTestUserXp(userId))?.xp).toBe(ledger);
  });

  test("位置チェックインを同時に押しても1回だけ付与し、残りは達成済みになる", async () => {
    const id = crypto.randomUUID();
    const { error } = await adminClient.from("missions").insert({
      id,
      slug: `double-award-geo-${Date.now()}`,
      title: "同時押しテスト",
      content: "テスト用",
      difficulty: 1,
      points: 200,
      required_artifact_type: ARTIFACT_TYPES.GEO_CHECKIN.key,
      max_achievement_count: 1,
      is_featured: false,
      is_hidden: false,
      latitude: 37.4917,
      longitude: 141.0,
      radius_meters: 300,
    });
    if (error) throw error;
    missionIds.push(id);

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        redeemGeoCheckin(adminClient, userClient, userId, id, 37.4917, 141.0),
      ),
    );

    expect(results.filter((r) => r.status === "granted")).toHaveLength(1);
    expect(
      results.filter((r) => r.status !== "granted").map((r) => r.status),
    ).toEqual(Array(CONCURRENCY - 1).fill("already"));
    expect(await countAchievements(id)).toBe(1);
    expect((await getTestUserXp(userId))?.xp).toBe(200);
  });
});
