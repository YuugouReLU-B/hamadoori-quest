import {
  adminClient,
  cleanupTestUser,
  createTestUser,
  getAnonClient,
} from "../utils";

// auth.users を引くユーザー検索関数は service_role 専用。
// anon / authenticated から実行できないこと、service_role からは従来どおり
// 実行できること（LINEログイン等が壊れないこと）を確かめる
describe("ユーザー検索関数の実行権限", () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;

  beforeEach(async () => {
    user = await createTestUser();
  });

  afterEach(async () => {
    await cleanupTestUser(user.user.userId);
  });

  describe("get_user_by_email", () => {
    test("匿名ユーザーは実行できない", async () => {
      const { data, error } = await getAnonClient().rpc("get_user_by_email", {
        user_email: user.user.email,
      });

      expect(error).toBeTruthy();
      expect(data).toBeNull();
    });

    test("認証済みユーザーも実行できない", async () => {
      const { data, error } = await user.client.rpc("get_user_by_email", {
        user_email: user.user.email,
      });

      expect(error).toBeTruthy();
      expect(data).toBeNull();
    });

    test("service_role は実行できる", async () => {
      const { data, error } = await adminClient.rpc("get_user_by_email", {
        user_email: user.user.email,
      });

      expect(error).toBeNull();
      expect(data?.[0]?.id).toBe(user.user.userId);
    });
  });

  describe("get_users_by_emails", () => {
    test("匿名ユーザーは実行できない", async () => {
      const { data, error } = await getAnonClient().rpc("get_users_by_emails", {
        email_list: [user.user.email],
      });

      expect(error).toBeTruthy();
      expect(data).toBeNull();
    });

    test("認証済みユーザーも実行できない", async () => {
      const { data, error } = await user.client.rpc("get_users_by_emails", {
        email_list: [user.user.email],
      });

      expect(error).toBeTruthy();
      expect(data).toBeNull();
    });

    test("service_role は実行できる", async () => {
      const { data, error } = await adminClient.rpc("get_users_by_emails", {
        email_list: [user.user.email],
      });

      expect(error).toBeNull();
      expect(data?.[0]?.id).toBe(user.user.userId);
    });
  });

  describe("get_user_by_line_id", () => {
    test("匿名ユーザーは実行できない", async () => {
      const { data, error } = await getAnonClient().rpc("get_user_by_line_id", {
        line_user_id: "U00000000000000000000000000000000",
      });

      expect(error).toBeTruthy();
      expect(data).toBeNull();
    });

    test("認証済みユーザーも実行できない", async () => {
      const { data, error } = await user.client.rpc("get_user_by_line_id", {
        line_user_id: "U00000000000000000000000000000000",
      });

      expect(error).toBeTruthy();
      expect(data).toBeNull();
    });

    test("service_role は実行できる", async () => {
      const { error } = await adminClient.rpc("get_user_by_line_id", {
        line_user_id: "U00000000000000000000000000000000",
      });

      expect(error).toBeNull();
    });
  });
});
