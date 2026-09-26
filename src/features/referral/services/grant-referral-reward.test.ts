import { getCurrentSeasonId } from "@/lib/services/seasons";
import { createAdminClient } from "@/lib/supabase/adminClient";
import {
  isEmailAlreadyUsedInReferral,
  isValidReferralCode,
} from "@/lib/validation/referral";
import { grantReferralReward } from "./grant-referral-reward";

// isValidReferralCode はブラウザ向けの anon クライアントを使う
// （src/lib/validation/referral.ts:5）ので、戻り値を直接制御する。
jest.mock("@/lib/validation/referral", () => ({
  isValidReferralCode: jest.fn(),
  isEmailAlreadyUsedInReferral: jest.fn(),
}));

// getCurrentSeason は cache() でメモ化されるため、
// getCurrentSeasonId 自体をモックして戻り値を固定する。
jest.mock("@/lib/services/seasons", () => ({
  getCurrentSeasonId: jest.fn(),
}));

jest.mock("@/lib/supabase/adminClient", () => ({
  createAdminClient: jest.fn(),
}));

type QueryResult = { data: unknown; error: unknown };

const REFERRER_USER_ID = "11111111-1111-4111-8111-111111111111";
const REFERRED_USER_ID = "22222222-2222-4222-8222-222222222222";
const SEASON_ID = "33333333-3333-4333-8333-333333333333";
const REFERRAL_MISSION_ID = "44444444-4444-4444-8444-444444444444";
const REFERRED_MISSION_ID = "55555555-5555-4555-8555-555555555555";

/**
 * from().select().eq().order().order() と maybeSingle() をチェーンできる
 * 最小のビルダー。既存に手本が無いのでここで用意する。
 * 返す結果はテーブル名と、missions は required_artifact_type で切り替える。
 */
function makeSupabaseMock(options: {
  userReferral?: QueryResult;
  missionsByType?: Partial<Record<string, QueryResult>>;
  rpcResult?: QueryResult;
}) {
  const rpc = jest.fn().mockResolvedValue(
    options.rpcResult ?? {
      data: [
        {
          referrer_achievement_id: "aaaaaaa1-0000-4000-8000-000000000001",
          referred_achievement_id: "aaaaaaa2-0000-4000-8000-000000000002",
        },
      ],
      error: null,
    },
  );

  const from = jest.fn((table: string) => {
    let artifactType: string | undefined;

    const resolve = (): QueryResult => {
      if (table === "user_referral") {
        return (
          options.userReferral ?? {
            data: { user_id: REFERRER_USER_ID },
            error: null,
          }
        );
      }
      if (table === "missions") {
        const fallback: Record<string, QueryResult> = {
          REFERRAL: { data: [{ id: REFERRAL_MISSION_ID }], error: null },
          REFERRED: { data: [{ id: REFERRED_MISSION_ID }], error: null },
        };
        return (
          options.missionsByType?.[artifactType ?? ""] ??
          fallback[artifactType ?? ""] ?? { data: [], error: null }
        );
      }
      return { data: null, error: null };
    };

    const chain = {
      select: () => chain,
      eq: (column: string, value: string) => {
        if (column === "required_artifact_type") {
          artifactType = value;
        }
        return chain;
      },
      order: () => chain,
      maybeSingle: async () => resolve(),
      // await されたときにクエリ結果を返す
      then: <T>(onFulfilled: (value: QueryResult) => T) =>
        Promise.resolve(resolve()).then(onFulfilled),
    };

    return chain;
  });

  return { from, rpc };
}

const mockedCreateAdminClient = jest.mocked(createAdminClient);
const mockedIsValidReferralCode = jest.mocked(isValidReferralCode);
const mockedIsEmailAlreadyUsed = jest.mocked(isEmailAlreadyUsedInReferral);
const mockedGetCurrentSeasonId = jest.mocked(getCurrentSeasonId);

function setup(options: Parameters<typeof makeSupabaseMock>[0] = {}) {
  const client = makeSupabaseMock(options);
  // テスト用の最小ビルダーを差し込む
  mockedCreateAdminClient.mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createAdminClient>>,
  );
  return client;
}

describe("grantReferralReward", () => {
  let warnSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsValidReferralCode.mockResolvedValue(true);
    mockedIsEmailAlreadyUsed.mockResolvedValue(false);
    mockedGetCurrentSeasonId.mockResolvedValue(SEASON_ID);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("正常系ではRPCが期待した引数で1回だけ呼ばれる", async () => {
    const client = setup();

    await grantReferralReward(
      "CODE1234",
      "Referred@Example.com",
      REFERRED_USER_ID,
    );

    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith("grant_referral_reward", {
      p_referrer_user_id: REFERRER_USER_ID,
      p_referred_user_id: REFERRED_USER_ID,
      p_referrer_mission_id: REFERRAL_MISSION_ID,
      p_referred_mission_id: REFERRED_MISSION_ID,
      p_season_id: SEASON_ID,
      // 小文字化して渡す
      p_referred_email: "referred@example.com",
    });
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("紹介の付与が完了しました"),
    );
  });

  it("紹介コードが不正なら付与しない", async () => {
    mockedIsValidReferralCode.mockResolvedValue(false);
    const client = setup();

    await grantReferralReward("BADCODE1", "a@example.com", REFERRED_USER_ID);

    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("メールアドレスが既に紹介で使われていたら付与しない", async () => {
    mockedIsEmailAlreadyUsed.mockResolvedValue(true);
    const client = setup();

    await grantReferralReward("CODE1234", "a@example.com", REFERRED_USER_ID);

    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("メールアドレスが空なら警告して付与しない", async () => {
    const client = setup();

    await grantReferralReward("CODE1234", "", REFERRED_USER_ID);

    expect(client.rpc).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("メールアドレスが空です"),
    );
  });

  it("REFERRALクエストが無いと警告して付与しない", async () => {
    const client = setup({
      missionsByType: { REFERRAL: { data: [], error: null } },
    });

    await grantReferralReward("CODE1234", "a@example.com", REFERRED_USER_ID);

    expect(client.rpc).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "紹介した側のクエスト（REFERRAL）が見つかりません",
      ),
    );
  });

  it("REFERREDクエストが無いと警告して付与しない", async () => {
    const client = setup({
      missionsByType: { REFERRED: { data: [], error: null } },
    });

    await grantReferralReward("CODE1234", "a@example.com", REFERRED_USER_ID);

    expect(client.rpc).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "紹介された側のクエスト（REFERRED）が見つかりません",
      ),
    );
  });

  it("REFERRALクエストが2件以上あっても警告しつつ先頭1件で続行する", async () => {
    const client = setup({
      missionsByType: {
        REFERRAL: {
          data: [
            { id: REFERRAL_MISSION_ID },
            { id: "99999999-9999-4999-8999-999999999999" },
          ],
          error: null,
        },
      },
    });

    await grantReferralReward("CODE1234", "a@example.com", REFERRED_USER_ID);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "required_artifact_type=REFERRAL のクエストが 2 件見つかりました",
      ),
    );
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith(
      "grant_referral_reward",
      expect.objectContaining({ p_referrer_mission_id: REFERRAL_MISSION_ID }),
    );
  });

  it("シーズンが無いと警告して付与しない", async () => {
    mockedGetCurrentSeasonId.mockResolvedValue(null);
    const client = setup();

    await grantReferralReward("CODE1234", "a@example.com", REFERRED_USER_ID);

    expect(client.rpc).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("有効なシーズンが見つかりません"),
    );
  });

  it("RPCがエラーを返しても例外を投げず警告だけ出す", async () => {
    setup({ rpcResult: { data: null, error: { message: "boom" } } });

    await expect(
      grantReferralReward("CODE1234", "a@example.com", REFERRED_USER_ID),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      "紹介の付与に失敗しました:",
      expect.objectContaining({ message: "boom" }),
    );
  });

  it("RPCが0行を返すと「すでに付与済み」を警告する", async () => {
    setup({ rpcResult: { data: [], error: null } });

    await grantReferralReward("CODE1234", "a@example.com", REFERRED_USER_ID);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("すでに付与済みです"),
    );
    expect(infoSpy).not.toHaveBeenCalled();
  });
});
