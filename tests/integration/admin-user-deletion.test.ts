import {
  findLeftovers,
  getUserDataCounts,
  searchUsersForDeletion,
} from "@/features/admin/services/admin-user-deletion";
import { deleteAccountByAdmin } from "@/features/user-profile/services/profile";
import { adminClient } from "../supabase/utils";

// 検索・件数集計・削除は内部で createAdminClient() を呼ぶので、本物を使う
jest.unmock("@/lib/supabase/adminClient");
jest.unmock("@/features/user-profile/services/profile");

/**
 * 管理画面からのユーザーデータ削除。
 * 削除前に紐づくデータを数え、削除後に0件になることを実際のDBで確かめる。
 */
describe("管理画面からのユーザーデータ削除", () => {
  let userId: string;
  const lineUserId = `U${crypto.randomUUID().replaceAll("-", "")}`;
  const nickname = `削除テスト${Date.now()}`;
  const token = Math.random()
    .toString(16)
    .slice(2, 12)
    .toUpperCase()
    .padEnd(10, "A");
  const sessionId = crypto.randomUUID();

  beforeAll(async () => {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: `line-${lineUserId}@line.local`,
      email_confirm: true,
      user_metadata: { provider: "line", line_user_id: lineUserId },
    });
    if (error || !data.user) throw error;
    userId = data.user.id;

    const { data: season } = await adminClient
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .single();
    const { data: mission } = await adminClient
      .from("missions")
      .select("id")
      .limit(1)
      .single();
    if (!season || !mission)
      throw new Error("シーズンかミッションがありません");

    const results = await Promise.all([
      adminClient.from("private_users").insert({ id: userId }),
      adminClient
        .from("public_user_profiles")
        .insert({ id: userId, name: nickname }),
      adminClient
        .from("user_levels")
        .insert({ user_id: userId, season_id: season.id, xp: 100 }),
      adminClient.from("xp_transactions").insert({
        user_id: userId,
        season_id: season.id,
        xp_amount: 100,
        source_type: "BONUS",
      }),
      adminClient.from("achievements").insert({
        user_id: userId,
        mission_id: mission.id,
        season_id: season.id,
      }),
      adminClient.from("lottery_tokens").insert({ user_id: userId, token }),
      adminClient.from("geo_checkin_locations").insert({
        user_id: userId,
        mission_id: mission.id,
        latitude: 37.4,
        longitude: 141.0,
        result: "too_far",
      }),
      adminClient.from("analytics_sessions").insert({
        id: sessionId,
        visitor_id: crypto.randomUUID(),
        user_id: userId,
        ip_address: "192.0.2.10",
      }),
    ]);
    for (const r of results) if (r.error) throw r.error;
    const { error: eventError } = await adminClient
      .from("analytics_events")
      .insert({
        event_id: crypto.randomUUID(),
        session_id: sessionId,
        visitor_id: crypto.randomUUID(),
        user_id: userId,
        tab_id: crypto.randomUUID(),
        seq: 1,
        event_name: "page_view",
        occurred_at: new Date().toISOString(),
      });
    if (eventError) throw eventError;
  });

  afterAll(async () => {
    // テストが途中で落ちた場合の後片付け
    await adminClient.from("lottery_tokens").delete().eq("token", token);
    await adminClient.rpc("delete_user_account", { target_user_id: userId });
    await adminClient.auth.admin.deleteUser(userId).catch(() => {});
  });

  test.each([
    ["ニックネーム（部分一致）", () => nickname.slice(0, -2), "nickname"],
    ["ユーザーID", () => userId, "user_id"],
    ["LINEユーザーID", () => lineUserId, "line_id"],
    ["抽選の応募トークン", () => token.toLowerCase(), "lottery_token"],
  ])("%s で対象が見つかる", async (_label, query, kind) => {
    const result = await searchUsersForDeletion(query());
    expect(result.kind).toBe(kind);
    const found = result.candidates.find((c) => c.id === userId);
    expect(found).toBeDefined();
    expect(found?.name).toBe(nickname);
    expect(found?.lineIdTail).toBe(lineUserId.slice(-4));
  });

  test("紐づくデータを数え、削除後はすべて0件になる", async () => {
    const before = await getUserDataCounts(userId);
    for (const table of [
      "auth.users",
      "public_user_profiles",
      "private_users",
      "achievements",
      "xp_transactions",
      "user_levels",
      "lottery_tokens",
      "geo_checkin_locations",
      "analytics_sessions",
      "analytics_events",
    ]) {
      expect({ table, count: before[table] }).toEqual({
        table,
        count: expect.any(Number),
      });
      expect(before[table]).toBeGreaterThan(0);
    }

    await deleteAccountByAdmin(userId);

    const after = await getUserDataCounts(userId);
    expect(findLeftovers(after)).toEqual([]);

    // 応募トークンの行は持ち主を外して残る（照合で「退会済み」と出すため）
    const { data: tokenRow } = await adminClient
      .from("lottery_tokens")
      .select("user_id")
      .eq("token", token)
      .single();
    expect(tokenRow?.user_id).toBeNull();
  });
});
