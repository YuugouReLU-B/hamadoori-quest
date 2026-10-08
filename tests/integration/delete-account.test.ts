import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
  getAnonClient,
} from "../supabase/utils";
import {
  cleanupTestMission,
  createTestMission,
  initializeTestUserLevel,
  type TestMission,
} from "./mission-test-helpers";

describe("delete_user_account RPC（退会機能）", () => {
  let testUserId: string;
  let testUserEmail: string;
  let testUserClient: SupabaseClient<Database>;
  let testMission: TestMission | null = null;

  beforeEach(async () => {
    const { user, client } = await createTestUser();
    testUserId = user.userId;
    testUserEmail = user.email;
    testUserClient = client;
  });

  afterEach(async () => {
    if (testMission) {
      await cleanupTestMission(testMission.id);
      testMission = null;
    }
    // cleanupTestUserはauth.usersの削除も行う（RPC成功テストではすでに削除済みの場合がある）
    try {
      await cleanupTestUser(testUserId);
    } catch {
      // RPC + auth削除済みの場合は無視
    }
  });

  test("関連データが全て削除される（基本ケース）", async () => {
    // テストデータを各テーブルに投入
    await initializeTestUserLevel(testUserId);

    testMission = await createTestMission({
      requiredArtifactType: "NONE",
      difficulty: 1,
    });

    // achievements
    const { data: achievement } = await adminClient
      .from("achievements")
      .insert({
        user_id: testUserId,
        mission_id: testMission.id,
      })
      .select("id")
      .single();

    // mission_artifacts（TEXT型: text_contentが必須、link_url/image_storage_pathはNULL）
    const { error: artifactError } = await adminClient
      .from("mission_artifacts")
      .insert({
        user_id: testUserId,
        achievement_id: achievement!.id,
        artifact_type: "TEXT",
        text_content: "テスト成果物",
        link_url: null,
        image_storage_path: null,
      });
    if (artifactError)
      throw new Error(`artifact insert failed: ${artifactError.message}`);

    // xp_transactions
    await adminClient.from("xp_transactions").insert({
      user_id: testUserId,
      xp_amount: 100,
      source_type: "MISSION_COMPLETION",
      description: "テスト用XP",
    });

    // user_badges
    await adminClient.from("user_badges").insert({
      user_id: testUserId,
      badge_type: "DAILY",
      rank: 1,
    });

    // user_activities
    await adminClient.from("user_activities").insert({
      user_id: testUserId,
      activity_type: "test",
      activity_title: "テストアクティビティ",
    });

    // user_referral
    await adminClient.from("user_referral").insert({
      user_id: testUserId,
      referral_code: `TEST${Date.now().toString().slice(-4)}`,
    });

    // RPC呼び出し
    const { error } = await testUserClient.rpc("delete_user_account", {
      target_user_id: testUserId,
    });
    expect(error).toBeNull();

    // 全テーブルからデータが消えていることを確認
    const { data: privateUser } = await adminClient
      .from("private_users")
      .select("id")
      .eq("id", testUserId)
      .maybeSingle();
    expect(privateUser).toBeNull();

    const { data: publicProfile } = await adminClient
      .from("public_user_profiles")
      .select("id")
      .eq("id", testUserId)
      .maybeSingle();
    expect(publicProfile).toBeNull();

    const { data: achievements } = await adminClient
      .from("achievements")
      .select("id")
      .eq("user_id", testUserId);
    expect(achievements ?? []).toHaveLength(0);

    const { data: artifacts } = await adminClient
      .from("mission_artifacts")
      .select("id")
      .eq("user_id", testUserId);
    expect(artifacts ?? []).toHaveLength(0);

    const { data: xpTransactions } = await adminClient
      .from("xp_transactions")
      .select("id")
      .eq("user_id", testUserId);
    expect(xpTransactions ?? []).toHaveLength(0);

    const { data: userLevels } = await adminClient
      .from("user_levels")
      .select("id")
      .eq("user_id", testUserId);
    expect(userLevels ?? []).toHaveLength(0);

    const { data: userBadges } = await adminClient
      .from("user_badges")
      .select("id")
      .eq("user_id", testUserId);
    expect(userBadges ?? []).toHaveLength(0);

    const { data: userActivities } = await adminClient
      .from("user_activities")
      .select("id")
      .eq("user_id", testUserId);
    expect(userActivities ?? []).toHaveLength(0);

    const { data: userReferral } = await adminClient
      .from("user_referral")
      .select("id")
      .eq("user_id", testUserId);
    expect(userReferral ?? []).toHaveLength(0);
  });

  test("poster関連データも削除される", async () => {
    // poster_board_status_history の投入にはposter_boardsのレコードが必要
    const { data: board } = await adminClient
      .from("poster_boards")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (!board) {
      console.warn(
        "poster_boardsが存在しないため、status_historyの削除テストをスキップします",
      );
    } else {
      await adminClient.from("poster_board_status_history").insert({
        board_id: board.id,
        user_id: testUserId,
        new_status: "done",
      });
    }

    testMission = await createTestMission({
      requiredArtifactType: "POSTER",
      difficulty: 1,
    });

    const { data: achievement } = await adminClient
      .from("achievements")
      .insert({
        user_id: testUserId,
        mission_id: testMission.id,
      })
      .select("id")
      .single();

    const { data: artifact, error: artifactError } = await adminClient
      .from("mission_artifacts")
      .insert({
        user_id: testUserId,
        achievement_id: achievement!.id,
        artifact_type: "POSTER",
        text_content: "テスト掲示板ポスティング",
        link_url: null,
        image_storage_path: null,
      })
      .select("id")
      .single();
    if (artifactError)
      throw new Error(`artifact insert failed: ${artifactError.message}`);

    // poster_activities
    await adminClient.from("poster_activities").insert({
      user_id: testUserId,
      mission_artifact_id: artifact!.id,
      poster_count: 10,
      prefecture: "東京都",
      city: "テスト市",
      number: `TEST-${Date.now()}`,
      name: "テスト掲示板",
    });

    // RPC呼び出し
    const { error } = await testUserClient.rpc("delete_user_account", {
      target_user_id: testUserId,
    });
    expect(error).toBeNull();

    const { data: posterActivities } = await adminClient
      .from("poster_activities")
      .select("id")
      .eq("user_id", testUserId);
    expect(posterActivities ?? []).toHaveLength(0);

    if (board) {
      const { data: statusHistory } = await adminClient
        .from("poster_board_status_history")
        .select("id")
        .eq("user_id", testUserId);
      expect(statusHistory ?? []).toHaveLength(0);
    }
  });

  test("他人のアカウントは削除できない", async () => {
    // 別のテストユーザーを作成
    const { user: otherUser } = await createTestUser();

    // testUserClientで他人のアカウントを削除しようとする
    const { error } = await testUserClient.rpc("delete_user_account", {
      target_user_id: otherUser.userId,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Unauthorized");

    // 他人のデータが残っていることを確認
    const { data: otherPrivateUser } = await adminClient
      .from("private_users")
      .select("id")
      .eq("id", otherUser.userId)
      .maybeSingle();
    expect(otherPrivateUser).not.toBeNull();

    const { data: otherPublicProfile } = await adminClient
      .from("public_user_profiles")
      .select("id")
      .eq("id", otherUser.userId)
      .maybeSingle();
    expect(otherPublicProfile).not.toBeNull();

    // クリーンアップ
    await cleanupTestUser(otherUser.userId);
  });

  test("未認証ユーザーはRPCを呼び出せない", async () => {
    // 匿名クライアント（未認証）
    const anonClient = getAnonClient();

    const { error } = await anonClient.rpc("delete_user_account", {
      target_user_id: testUserId,
    });

    expect(error).not.toBeNull();

    // データが残っていることを確認
    const { data: privateUser } = await adminClient
      .from("private_users")
      .select("id")
      .eq("id", testUserId)
      .maybeSingle();
    expect(privateUser).not.toBeNull();
  });

  test("関連データがないユーザーでも正常に退会できる", async () => {
    // private_users と public_user_profiles のみ存在する状態で退会
    const { error } = await testUserClient.rpc("delete_user_account", {
      target_user_id: testUserId,
    });
    expect(error).toBeNull();

    const { data: privateUser } = await adminClient
      .from("private_users")
      .select("id")
      .eq("id", testUserId)
      .maybeSingle();
    expect(privateUser).toBeNull();

    const { data: publicProfile } = await adminClient
      .from("public_user_profiles")
      .select("id")
      .eq("id", testUserId)
      .maybeSingle();
    expect(publicProfile).toBeNull();
  });

  test("退会後にauth.admin.deleteUserでauthユーザーも削除できる", async () => {
    // RPC呼び出し（DBデータ削除）
    const { error: rpcError } = await testUserClient.rpc(
      "delete_user_account",
      { target_user_id: testUserId },
    );
    expect(rpcError).toBeNull();

    // auth.users削除（実際のdeleteAccount関数と同じ流れ）
    const { error: authError } =
      await adminClient.auth.admin.deleteUser(testUserId);
    expect(authError).toBeNull();

    // authユーザーも消えていることを確認
    const { error: getUserError } =
      await adminClient.auth.admin.getUserById(testUserId);

    // ユーザーが見つからないことを確認
    expect(getUserError).not.toBeNull();
  });

  test("自分以外のユーザーIDを指定すると認可エラーになる", async () => {
    const nonExistentId = "00000000-0000-0000-0000-000000000000";

    // 自分のID以外を指定すると認可エラーになる
    const { error } = await testUserClient.rpc("delete_user_account", {
      target_user_id: nonExistentId,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Unauthorized");
  });

  test("アクセス解析のセッションとイベントも削除される", async () => {
    const visitorId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const anonSessionId = crypto.randomUUID();

    const { error: sessionError } = await adminClient
      .from("analytics_sessions")
      .insert([
        {
          id: sessionId,
          visitor_id: visitorId,
          user_id: testUserId,
          ip_address: "192.0.2.1",
          ip_city: "テスト市",
          user_agent: "jest",
          landing_path: "/",
        },
        // 未ログインのセッション（user_id なし）。退会とは無関係なので残る
        {
          id: anonSessionId,
          visitor_id: crypto.randomUUID(),
          user_id: null,
          ip_address: "192.0.2.2",
        },
      ]);
    if (sessionError)
      throw new Error(`session insert failed: ${sessionError.message}`);

    const { error: eventError } = await adminClient
      .from("analytics_events")
      .insert({
        event_id: crypto.randomUUID(),
        session_id: sessionId,
        visitor_id: visitorId,
        user_id: testUserId,
        tab_id: crypto.randomUUID(),
        seq: 1,
        event_name: "page_view",
        occurred_at: new Date().toISOString(),
      });
    if (eventError)
      throw new Error(`event insert failed: ${eventError.message}`);

    try {
      const { error } = await testUserClient.rpc("delete_user_account", {
        target_user_id: testUserId,
      });
      expect(error).toBeNull();

      const { data: sessions } = await adminClient
        .from("analytics_sessions")
        .select("id")
        .or(`user_id.eq.${testUserId},id.eq.${sessionId}`);
      expect(sessions ?? []).toHaveLength(0);

      const { data: events } = await adminClient
        .from("analytics_events")
        .select("id")
        .or(`user_id.eq.${testUserId},session_id.eq.${sessionId}`);
      expect(events ?? []).toHaveLength(0);

      const { data: anonSession } = await adminClient
        .from("analytics_sessions")
        .select("id")
        .eq("id", anonSessionId)
        .maybeSingle();
      expect(anonSession).not.toBeNull();
    } finally {
      await adminClient
        .from("analytics_sessions")
        .delete()
        .in("id", [sessionId, anonSessionId]);
    }
  });

  test("紹介した側の成果物に残る退会者のメールが置き換わる", async () => {
    const { user: referrer } = await createTestUser();

    try {
      testMission = await createTestMission({
        requiredArtifactType: "REFERRAL",
        difficulty: 1,
        maxAchievementCount: null,
      });

      // 紹介者の達成2件: 退会するユーザーを紹介したものと、別の人を紹介したもの
      const { data: achievements, error: achievementError } = await adminClient
        .from("achievements")
        .insert([
          { user_id: referrer.userId, mission_id: testMission.id },
          { user_id: referrer.userId, mission_id: testMission.id },
        ])
        .select("id");
      if (achievementError || !achievements)
        throw new Error(
          `achievement insert failed: ${achievementError?.message}`,
        );

      const otherEmail = `other-${crypto.randomUUID()}@example.com`;
      const { data: artifacts, error: artifactError } = await adminClient
        .from("mission_artifacts")
        .insert([
          {
            user_id: referrer.userId,
            achievement_id: achievements[0].id,
            artifact_type: "REFERRAL",
            text_content: testUserEmail.toLowerCase(),
          },
          {
            user_id: referrer.userId,
            achievement_id: achievements[1].id,
            artifact_type: "REFERRAL",
            text_content: otherEmail,
          },
        ])
        .select("id, text_content");
      if (artifactError || !artifacts)
        throw new Error(`artifact insert failed: ${artifactError?.message}`);

      const { error } = await testUserClient.rpc("delete_user_account", {
        target_user_id: testUserId,
      });
      expect(error).toBeNull();

      const { data: after } = await adminClient
        .from("mission_artifacts")
        .select("id, text_content")
        .in(
          "id",
          artifacts.map((a) => a.id),
        );
      const byId = new Map((after ?? []).map((a) => [a.id, a.text_content]));

      // 紹介者の達成記録自体は残り、退会者のメールだけが消える
      expect(byId.get(artifacts[0].id)).toBe("退会済みユーザー");
      expect(byId.get(artifacts[1].id)).toBe(otherEmail);

      const { data: anyLeft } = await adminClient
        .from("mission_artifacts")
        .select("id")
        .eq("text_content", testUserEmail.toLowerCase());
      expect(anyLeft ?? []).toHaveLength(0);
    } finally {
      await cleanupTestUser(referrer.userId);
    }
  });

  test("service_role からは他のユーザーも削除できる（管理者の代理削除）", async () => {
    const { error } = await adminClient.rpc("delete_user_account", {
      target_user_id: testUserId,
    });
    expect(error).toBeNull();

    const { data: publicProfile } = await adminClient
      .from("public_user_profiles")
      .select("id")
      .eq("id", testUserId)
      .maybeSingle();
    expect(publicProfile).toBeNull();
  });
});
