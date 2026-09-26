import { adminClient, cleanupTestUser, createTestUser } from "./utils";

/**
 * 開発ツールのユーザー削除が、本番の退会処理と同じ RPC で
 * 関連データごと消せることを確認する。
 *
 * delete_user_account は本来「自分のアカウントのみ削除可」だが、
 * 削除順序を開発ツール側に複製しないため、service_role からの呼び出しを
 * 許可している（20260809140000 のマイグレーション）。
 */
describe("開発用ユーザー削除", () => {
  test("service_role から delete_user_account を呼んで関連データごと消せる", async () => {
    const { user } = await createTestUser();
    const userId = user.userId;

    const { data: season } = await adminClient
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .single();
    if (!season) throw new Error("アクティブなシーズンが見つかりません");

    await adminClient
      .from("public_user_profiles")
      .insert({ id: userId, name: "削除されるユーザー" });
    await adminClient.from("private_users").insert({ id: userId });
    await adminClient.from("user_levels").insert({
      user_id: userId,
      xp: 100,
      season_id: season.id,
    });

    const { error } = await adminClient.rpc("delete_user_account", {
      target_user_id: userId,
    });
    expect(error).toBeNull();

    const { data: profile } = await adminClient
      .from("public_user_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    expect(profile).toBeNull();

    const { data: privateUser } = await adminClient
      .from("private_users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    expect(privateUser).toBeNull();

    const { data: level } = await adminClient
      .from("user_levels")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    expect(level).toBeNull();

    const { error: authError } =
      await adminClient.auth.admin.deleteUser(userId);
    expect(authError).toBeNull();
  });

  test("認証ユーザーは他人のアカウントを削除できないままである", async () => {
    // service_role を許可しても、通常ユーザーの制限が緩んでいないことを確認する
    const victim = await createTestUser();
    const attacker = await createTestUser();

    const { error } = await attacker.client.rpc("delete_user_account", {
      target_user_id: victim.user.userId,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain("Unauthorized");

    // 被害者のデータが残っていることを確認
    const { data } = await adminClient.auth.admin.getUserById(
      victim.user.userId,
    );
    expect(data.user).not.toBeNull();

    await cleanupTestUser(victim.user.userId);
    await cleanupTestUser(attacker.user.userId);
  });
});
