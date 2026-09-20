import { lineLogin } from "@/features/auth/use-cases/line-login";
import { FakeLineApiClient } from "./fake-line-api-client";
import {
  adminClient,
  cleanupTestUser,
  findUserByLineId,
  getUserById,
} from "./utils";

describe("lineLogin ユースケース", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    for (const id of createdUserIds) {
      await cleanupTestUser(id);
    }
    createdUserIds.length = 0;
  });

  test("新規LINEユーザーが登録される", async () => {
    const lineUserId = `U_test_${Date.now()}`;
    const email = `test-line-${Date.now()}@example.com`;
    const fakeClient = new FakeLineApiClient(lineUserId, "テスト太郎", email);

    const result = await lineLogin(adminClient, fakeClient, {
      code: "fake-code",
      redirectUri: "http://localhost:3000/api/auth/line-callback",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    createdUserIds.push(result.userId);

    expect(result.isNewUser).toBe(true);
    expect(result.email).toBe(email);

    // DBに正しく保存されているか検証
    const user = await getUserById(result.userId);
    expect(user.email).toBe(email);
    expect(user.user_metadata.provider).toBe("line");
    expect(user.user_metadata.line_user_id).toBe(lineUserId);
    expect(user.user_metadata.name).toBe("テスト太郎");
    expect(user.user_metadata.line_linked_at).toBeDefined();

    // get_user_by_line_id RPCでも検索できることを検証
    const found = await findUserByLineId(lineUserId);
    expect(found).not.toBeNull();
    expect(found.id).toBe(result.userId);
  });

  test("既存LINEユーザーがログインできる", async () => {
    const lineUserId = `U_test_${Date.now()}`;
    const fakeClient = new FakeLineApiClient(lineUserId, "テスト太郎");

    // 1回目: 新規登録
    const first = await lineLogin(adminClient, fakeClient, {
      code: "fake-code",
      redirectUri: "http://localhost:3000/api/auth/line-callback",
    });
    expect(first.success).toBe(true);
    if (!first.success) return;
    createdUserIds.push(first.userId);

    // line_linked_at を記録
    const userAfterFirst = await getUserById(first.userId);
    const firstLinkedAt = userAfterFirst.user_metadata.line_linked_at;

    // 少し待ってから2回目のログイン（line_linked_atの更新確認のため）
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 2回目: ログイン
    const second = await lineLogin(adminClient, fakeClient, {
      code: "fake-code-2",
      redirectUri: "http://localhost:3000/api/auth/line-callback",
    });
    expect(second.success).toBe(true);
    if (!second.success) return;

    expect(second.isNewUser).toBe(false);
    expect(second.userId).toBe(first.userId);

    // メタデータが更新されていることを検証
    const userAfterSecond = await getUserById(second.userId);
    expect(userAfterSecond.user_metadata.line_linked_at).not.toBe(
      firstLinkedAt,
    );
  });

  test("メールなしLINEユーザーは合成メールで登録される", async () => {
    const lineUserId = `U_noemail_${Date.now()}`;
    const fakeClient = new FakeLineApiClient(lineUserId, "メールなしユーザー");

    const result = await lineLogin(adminClient, fakeClient, {
      code: "fake-code",
      redirectUri: "http://localhost:3000/api/auth/line-callback",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    createdUserIds.push(result.userId);

    // ユースケースの戻り値はSupabase正規化前の値
    expect(result.email).toBe(`line-${lineUserId}@line.local`);

    // DBではSupabaseがメールアドレスを小文字に正規化する
    const user = await getUserById(result.userId);
    expect(user.email).toBe(`line-${lineUserId}@line.local`.toLowerCase());
  });

  test("生年月日なしでも新規ユーザーを作成できる", async () => {
    // 生年月日（公職選挙法の18歳以上確認）の取得をやめたため、
    // ログイン導線からの初回ログインでもそのまま登録できる
    const lineUserId = `U_nodob_${Date.now()}`;
    const fakeClient = new FakeLineApiClient(lineUserId);

    const result = await lineLogin(adminClient, fakeClient, {
      code: "fake-code",
      redirectUri: "http://localhost:3000/api/auth/line-callback",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    createdUserIds.push(result.userId);

    expect(result.isNewUser).toBe(true);

    const user = await getUserById(result.userId);
    expect(user.user_metadata.date_of_birth).toBeUndefined();

    const found = await findUserByLineId(lineUserId);
    expect(found).not.toBeNull();
  });

  test("email+passwordユーザーと同じメールのLINEログインはエラー", async () => {
    const email = `emailuser-${Date.now()}@example.com`;
    const { data } = await adminClient.auth.admin.createUser({
      email,
      password: "password123",
      email_confirm: true,
    });
    createdUserIds.push(data.user!.id);

    const lineUserId = `U_conflict_${Date.now()}`;
    const fakeClient = new FakeLineApiClient(lineUserId, "衝突ユーザー", email);

    const result = await lineLogin(adminClient, fakeClient, {
      code: "fake-code",
      redirectUri: "http://localhost:3000/api/auth/line-callback",
    });

    expect(result.success).toBe(false);

    // LINEユーザーが作成されていないことを検証
    const found = await findUserByLineId(lineUserId);
    expect(found).toBeNull();
  });
  test("公式アカウントと友だちならメタデータに記録される", async () => {
    const lineUserId = `U_test_${Date.now()}_friend`;
    const fakeClient = new FakeLineApiClient(
      lineUserId,
      "友だち太郎",
      undefined,
      undefined,
      true,
    );

    const result = await lineLogin(adminClient, fakeClient, {
      code: "fake-code",
      redirectUri: "http://localhost:3000/api/auth/line-callback",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    createdUserIds.push(result.userId);

    expect(result.isOfficialAccountFriend).toBe(true);

    const user = await getUserById(result.userId);
    expect(user.user_metadata.line_official_account_friend).toBe(true);
    expect(user.user_metadata.line_friendship_checked_at).toBeDefined();
  });

  test("友だちでない場合はfalseで記録される", async () => {
    const lineUserId = `U_test_${Date.now()}_notfriend`;
    const fakeClient = new FakeLineApiClient(
      lineUserId,
      "未追加太郎",
      undefined,
      undefined,
      false,
    );

    const result = await lineLogin(adminClient, fakeClient, {
      code: "fake-code",
      redirectUri: "http://localhost:3000/api/auth/line-callback",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    createdUserIds.push(result.userId);

    expect(result.isOfficialAccountFriend).toBe(false);

    const user = await getUserById(result.userId);
    expect(user.user_metadata.line_official_account_friend).toBe(false);
  });

  test("友だち状態が取得できない場合は既存の値を壊さない", async () => {
    // 公式アカウント未リンク時などは null が返る。
    // このとき true だった記録を false で上書きしてはいけない
    const lineUserId = `U_test_${Date.now()}_unknown`;

    const friendClient = new FakeLineApiClient(
      lineUserId,
      "太郎",
      undefined,
      undefined,
      true,
    );
    const first = await lineLogin(adminClient, friendClient, {
      code: "fake-code",
      redirectUri: "http://localhost:3000/api/auth/line-callback",
    });
    expect(first.success).toBe(true);
    if (!first.success) return;
    createdUserIds.push(first.userId);

    const unknownClient = new FakeLineApiClient(
      lineUserId,
      "太郎",
      undefined,
      undefined,
      null,
    );
    const second = await lineLogin(adminClient, unknownClient, {
      code: "fake-code",
      redirectUri: "http://localhost:3000/api/auth/line-callback",
    });
    expect(second.success).toBe(true);
    if (!second.success) return;
    expect(second.isOfficialAccountFriend).toBeNull();

    const user = await getUserById(first.userId);
    expect(user.user_metadata.line_official_account_friend).toBe(true);
  });
});
