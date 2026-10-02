import { generateLotteryToken } from "@/features/lottery/services/lottery-token";
import { getOrIssueLotteryToken } from "@/features/lottery/services/lottery-token-store";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
} from "../supabase/utils";

// jest.setup.js が @/lib/supabase/adminClient をグローバルにモックしている。
// getOrIssueLotteryToken は内部で createAdminClient() を呼ぶので、ここでは本物を使う。
jest.unmock("@/lib/supabase/adminClient");

async function findRows(userId: string) {
  const { data, error } = await adminClient
    .from("lottery_tokens")
    .select("token, user_id")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

describe("抽選応募トークンの発行記録", () => {
  const originalSecret = process.env.LOTTERY_TOKEN_SECRET;
  const userIds: string[] = [];
  const orphanTokens: string[] = [];

  async function createUser(): Promise<string> {
    const { user } = await createTestUser();
    userIds.push(user.userId);
    return user.userId;
  }

  beforeEach(() => {
    process.env.LOTTERY_TOKEN_SECRET = "integration-test-secret";
  });

  afterEach(async () => {
    process.env.LOTTERY_TOKEN_SECRET = originalSecret;
    for (const userId of userIds.splice(0)) {
      await adminClient.from("lottery_tokens").delete().eq("user_id", userId);
      await cleanupTestUser(userId);
    }
    for (const token of orphanTokens.splice(0)) {
      await adminClient.from("lottery_tokens").delete().eq("token", token);
    }
  });

  test("初回は導出したトークンを記録し、シークレットを変えても同じ値を返す", async () => {
    const userId = await createUser();

    const first = await getOrIssueLotteryToken(userId);
    expect(first).toBe(generateLotteryToken(userId));

    process.env.LOTTERY_TOKEN_SECRET = "rotated-secret";
    expect(generateLotteryToken(userId)).not.toBe(first);
    expect(await getOrIssueLotteryToken(userId)).toBe(first);

    expect(await findRows(userId)).toEqual([{ token: first, user_id: userId }]);
  });

  test("同時に呼ばれても1行しか作らず、同じトークンを返す", async () => {
    const userId = await createUser();

    const tokens = await Promise.all(
      Array.from({ length: 5 }, () => getOrIssueLotteryToken(userId)),
    );

    expect(new Set(tokens).size).toBe(1);
    expect(tokens[0]).not.toBeNull();
    expect(await findRows(userId)).toHaveLength(1);
  });

  test("導出したトークンが他のユーザーと衝突したら別の値を発行する", async () => {
    const holderId = await createUser();
    const userId = await createUser();
    const derived = generateLotteryToken(userId);
    if (!derived) throw new Error("トークンを導出できませんでした");
    await adminClient
      .from("lottery_tokens")
      .insert({ user_id: holderId, token: derived });

    const issued = await getOrIssueLotteryToken(userId);

    expect(issued).toMatch(/^[0-9A-F]{10}$/);
    expect(issued).not.toBe(derived);
    expect(await findRows(userId)).toEqual([
      { token: issued, user_id: userId },
    ]);
  });

  test("ユーザーを削除しても発行記録は残る", async () => {
    const { user } = await createTestUser();
    const token = await getOrIssueLotteryToken(user.userId);
    if (!token) throw new Error("トークンを発行できませんでした");
    orphanTokens.push(token);

    await cleanupTestUser(user.userId);

    const { data } = await adminClient
      .from("lottery_tokens")
      .select("token, user_id")
      .eq("token", token);
    expect(data).toEqual([{ token, user_id: null }]);
  });

  test("シークレット未設定で未発行なら null を返し、記録も作らない", async () => {
    const userId = await createUser();
    process.env.LOTTERY_TOKEN_SECRET = "";
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(await getOrIssueLotteryToken(userId)).toBeNull();
    expect(await findRows(userId)).toEqual([]);

    consoleErrorSpy.mockRestore();
  });
});
