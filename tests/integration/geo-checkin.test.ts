import { redeemGeoCheckin } from "@/features/geo-checkin/use-cases/redeem-geo-checkin";
import { ARTIFACT_TYPES } from "@/lib/types/artifact-types";
import { adminClient, cleanupTestUser, createTestUser } from "./utils";

/**
 * 位置情報チェックインの獲得フロー。
 *
 * 一番守りたいのは「半径の外からは達成できないこと」と
 * 「同じミッションを何度読んでも二重に加算されないこと」の2点。
 */
describe("位置情報チェックイン", () => {
  // 道の駅なみえ付近を基準点として使う
  const BASE_LAT = 37.4917;
  const BASE_LNG = 141.0;

  const missionIds: string[] = [];
  const userIds: string[] = [];

  async function createGeoMission(overrides: {
    slug: string;
    points?: number;
    isHidden?: boolean;
    maxAchievementCount?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    radiusMeters?: number | null;
  }) {
    const id = crypto.randomUUID();
    const { error } = await adminClient.from("missions").insert({
      id,
      slug: overrides.slug,
      title: `テストスポット ${overrides.slug}`,
      content: "テスト用",
      difficulty: 1,
      points: overrides.points ?? 200,
      required_artifact_type: ARTIFACT_TYPES.GEO_CHECKIN.key,
      max_achievement_count:
        overrides.maxAchievementCount === undefined
          ? 1
          : overrides.maxAchievementCount,
      is_featured: false,
      is_hidden: overrides.isHidden ?? false,
      latitude:
        overrides.latitude === undefined ? BASE_LAT : overrides.latitude,
      longitude:
        overrides.longitude === undefined ? BASE_LNG : overrides.longitude,
      radius_meters:
        overrides.radiusMeters === undefined ? 300 : overrides.radiusMeters,
    });
    if (error) throw new Error(`ミッション作成に失敗: ${error.message}`);
    missionIds.push(id);
    return id;
  }

  afterAll(async () => {
    for (const userId of userIds) {
      await cleanupTestUser(userId);
    }
    for (const missionId of missionIds) {
      await adminClient
        .from("achievements")
        .delete()
        .eq("mission_id", missionId);
      await adminClient.from("missions").delete().eq("id", missionId);
    }
  });

  test("半径内から押すとポイントが入り、2回目は加算されない", async () => {
    const missionId = await createGeoMission({
      slug: `geo-redeem-${Date.now()}`,
      points: 200,
    });
    const { user, client } = await createTestUser();
    userIds.push(user.userId);

    const first = await redeemGeoCheckin(
      adminClient,
      client,
      user.userId,
      missionId,
      BASE_LAT,
      BASE_LNG,
    );
    expect(first.status).toBe("granted");
    if (first.status === "granted") {
      expect(first.xpGranted).toBe(200);
    }

    const second = await redeemGeoCheckin(
      adminClient,
      client,
      user.userId,
      missionId,
      BASE_LAT,
      BASE_LNG,
    );
    expect(second.status).toBe("already");

    const { count } = await adminClient
      .from("achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.userId)
      .eq("mission_id", missionId);
    expect(count).toBe(1);
  });

  test("半径の外からは達成できない", async () => {
    const missionId = await createGeoMission({
      slug: `geo-too-far-${Date.now()}`,
      radiusMeters: 300,
    });
    const { user, client } = await createTestUser();
    userIds.push(user.userId);

    // 緯度を約1km分ずらす
    const result = await redeemGeoCheckin(
      adminClient,
      client,
      user.userId,
      missionId,
      BASE_LAT + 0.01,
      BASE_LNG,
    );
    expect(result.status).toBe("too_far");

    const { count } = await adminClient
      .from("achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.userId)
      .eq("mission_id", missionId);
    expect(count).toBe(0);
  });

  async function fetchCheckinLocations(userId: string, missionId: string) {
    const { data, error } = await adminClient
      .from("geo_checkin_locations")
      .select("*")
      .eq("user_id", userId)
      .eq("mission_id", missionId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`位置記録の取得に失敗: ${error.message}`);
    return data;
  }

  test("半径内で達成したときは、送られた座標と判定結果を1行保存する", async () => {
    const missionId = await createGeoMission({
      slug: `geo-location-granted-${Date.now()}`,
    });
    const { user, client } = await createTestUser();
    userIds.push(user.userId);

    const result = await redeemGeoCheckin(
      adminClient,
      client,
      user.userId,
      missionId,
      BASE_LAT,
      BASE_LNG,
      12.5,
    );
    expect(result.status).toBe("granted");

    const rows = await fetchCheckinLocations(user.userId, missionId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      latitude: BASE_LAT,
      longitude: BASE_LNG,
      accuracy_meters: 12.5,
      result: "granted",
    });
    expect(rows[0].distance_meters).toBeCloseTo(0, 3);

    // 獲得済みで押し直したときも already として残る
    const again = await redeemGeoCheckin(
      adminClient,
      client,
      user.userId,
      missionId,
      BASE_LAT,
      BASE_LNG,
    );
    expect(again.status).toBe("already");
    const after = await fetchCheckinLocations(user.userId, missionId);
    expect(after.map((row) => row.result)).toEqual(["granted", "already"]);

    // 本人のクライアントからも読めない（service_role だけに開けている）
    const { data: own } = await client
      .from("geo_checkin_locations")
      .select("id")
      .eq("user_id", user.userId);
    expect(own ?? []).toHaveLength(0);
  });

  test("半径の外から押したときも、不正防止の検証用に too_far として保存する", async () => {
    const missionId = await createGeoMission({
      slug: `geo-location-too-far-${Date.now()}`,
      radiusMeters: 300,
    });
    const { user, client } = await createTestUser();
    userIds.push(user.userId);

    const result = await redeemGeoCheckin(
      adminClient,
      client,
      user.userId,
      missionId,
      BASE_LAT + 0.01,
      BASE_LNG,
    );
    expect(result.status).toBe("too_far");

    const rows = await fetchCheckinLocations(user.userId, missionId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      latitude: BASE_LAT + 0.01,
      longitude: BASE_LNG,
      accuracy_meters: null,
      result: "too_far",
    });
    expect(rows[0].distance_meters).toBeGreaterThan(300);
  });

  test("判定前に弾かれるケース（非表示）は位置を保存しない", async () => {
    const missionId = await createGeoMission({
      slug: `geo-location-hidden-${Date.now()}`,
      isHidden: true,
    });
    const { user, client } = await createTestUser();
    userIds.push(user.userId);

    const result = await redeemGeoCheckin(
      adminClient,
      client,
      user.userId,
      missionId,
      BASE_LAT,
      BASE_LNG,
    );
    expect(result.status).toBe("unavailable");
    expect(await fetchCheckinLocations(user.userId, missionId)).toHaveLength(0);
  });

  test("退会（ユーザー削除）すると保存した位置も消える", async () => {
    const missionId = await createGeoMission({
      slug: `geo-location-delete-${Date.now()}`,
    });
    const { user, client } = await createTestUser();

    await redeemGeoCheckin(
      adminClient,
      client,
      user.userId,
      missionId,
      BASE_LAT,
      BASE_LNG,
    );
    expect(await fetchCheckinLocations(user.userId, missionId)).toHaveLength(1);

    await cleanupTestUser(user.userId);

    expect(await fetchCheckinLocations(user.userId, missionId)).toHaveLength(0);
  });

  test("座標・半径が未設定のミッションは not_configured になる", async () => {
    const missionId = await createGeoMission({
      slug: `geo-not-configured-${Date.now()}`,
      latitude: null,
      longitude: null,
      radiusMeters: null,
    });
    const { user, client } = await createTestUser();
    userIds.push(user.userId);

    const result = await redeemGeoCheckin(
      adminClient,
      client,
      user.userId,
      missionId,
      BASE_LAT,
      BASE_LNG,
    );
    expect(result.status).toBe("not_configured");
  });

  test("非表示のミッションは獲得できない", async () => {
    const missionId = await createGeoMission({
      slug: `geo-hidden-${Date.now()}`,
      isHidden: true,
    });
    const { user, client } = await createTestUser();
    userIds.push(user.userId);

    const result = await redeemGeoCheckin(
      adminClient,
      client,
      user.userId,
      missionId,
      BASE_LAT,
      BASE_LNG,
    );
    expect(result.status).toBe("unavailable");
  });

  test("存在しないミッションIDは invalid になる", async () => {
    const { user, client } = await createTestUser();
    userIds.push(user.userId);

    const result = await redeemGeoCheckin(
      adminClient,
      client,
      user.userId,
      crypto.randomUUID(),
      BASE_LAT,
      BASE_LNG,
    );
    expect(result.status).toBe("invalid");
  });

  test("achieveMission を直接呼んでも、専用アクションを介さずに達成できてはいけない経路を塞いでいる", async () => {
    const actions = await import("@/features/mission-detail/actions/actions");
    const form = new FormData();
    form.set("missionId", crypto.randomUUID());
    form.set("requiredArtifactType", ARTIFACT_TYPES.GEO_CHECKIN.key);

    const result = await actions.achieveMissionAction(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("イベントに来た");
    }
  });
});
