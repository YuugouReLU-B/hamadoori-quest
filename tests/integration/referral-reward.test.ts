import { grantReferralReward } from "@/features/referral/services/grant-referral-reward";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
} from "../supabase/utils";
import {
  cleanupTestUserLevel,
  cleanupTestXpTransactions,
  initializeTestUserLevel,
} from "./mission-test-helpers";

// jest.setup.js:132 が @/lib/supabase/adminClient をグローバルにモックしている。
// grantReferralReward は内部で createAdminClient() を呼ぶので、ここでは本物を使う。
jest.unmock("@/lib/supabase/adminClient");

// 呼び出し側のガードは素通りさせ、DB側のガード（RPC の g3a / g3b）が
// 効いていることを検証する。呼び出し側のガードはユニットテスト
// （grant-referral-reward.test.ts）が担当する。
jest.mock("@/lib/validation/referral", () => ({
  isValidReferralCode: jest.fn().mockResolvedValue(true),
  isEmailAlreadyUsedInReferral: jest.fn().mockResolvedValue(false),
}));

/**
 * 紹介クエストは createTestMission で作らない。
 *
 * grant-referral-reward.ts は required_artifact_type ごとに created_at 昇順の
 * 先頭1件を選ぶため、後から作ったテスト用クエストは絶対に選ばれない。
 * よって実際に使われる既存の実運用行（slug='referral' / 'referred-signup'）を
 * 対象にする。どちらも points=50。
 */
const REFERRAL_SLUG = "referral";
const REFERRED_SLUG = "referred-signup";

type Mission = { id: string; points: number };

async function getMission(slug: string): Promise<Mission> {
  const { data, error } = await adminClient
    .from("missions")
    .select("id, points")
    .eq("slug", slug)
    .single();
  if (error || !data) {
    throw new Error(`クエスト ${slug} が見つかりません: ${error?.message}`);
  }
  return data;
}

async function getActiveSeasonId(): Promise<string> {
  const { data, error } = await adminClient
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .single();
  if (error || !data) {
    throw new Error(`アクティブシーズンが見つかりません: ${error?.message}`);
  }
  return data.id;
}

async function countAchievements(userId: string, missionId: string) {
  const { data } = await adminClient
    .from("achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("mission_id", missionId);
  return data ?? [];
}

async function getArtifacts(userId: string) {
  const { data } = await adminClient
    .from("mission_artifacts")
    .select("artifact_type, text_content")
    .eq("user_id", userId);
  return data ?? [];
}

async function getXpTransactions(userId: string) {
  const { data } = await adminClient
    .from("xp_transactions")
    .select("xp_amount, source_type, source_id")
    .eq("user_id", userId);
  return data ?? [];
}

async function getXp(userId: string): Promise<number> {
  const seasonId = await getActiveSeasonId();
  const { data } = await adminClient
    .from("user_levels")
    .select("xp")
    .eq("user_id", userId)
    .eq("season_id", seasonId)
    .maybeSingle();
  return data?.xp ?? 0;
}

/** 紹介コードを user_referral に直接入れる（既存のヘルパに作成関数が無い） */
async function createReferralCode(userId: string): Promise<string> {
  // char(8) なので8文字ちょうどにする
  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const { error } = await adminClient
    .from("user_referral")
    .insert({ user_id: userId, referral_code: code, del_flg: false });
  if (error) {
    throw new Error(`紹介コードの作成に失敗: ${error.message}`);
  }
  return code;
}

async function cleanupUser(userId: string) {
  await adminClient.from("user_referral").delete().eq("user_id", userId);
  await adminClient.from("mission_artifacts").delete().eq("user_id", userId);
  await adminClient.from("achievements").delete().eq("user_id", userId);
  await cleanupTestXpTransactions(userId);
  await cleanupTestUserLevel(userId);
  await cleanupTestUser(userId);
}

describe("紹介の双方付与", () => {
  let referralMission: Mission;
  let referredMission: Mission;
  let seasonId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    referralMission = await getMission(REFERRAL_SLUG);
    referredMission = await getMission(REFERRED_SLUG);
    seasonId = await getActiveSeasonId();
  });

  afterEach(async () => {
    // 自分で作ったデータだけ片付ける。共有DBに残骸を残さない
    while (createdUserIds.length > 0) {
      const id = createdUserIds.pop();
      if (id) await cleanupUser(id);
    }
  });

  async function makeUser(): Promise<{ id: string; email: string }> {
    // TestUser の識別子は userId（tests/supabase/utils.ts:26）
    const { user } = await createTestUser();
    createdUserIds.push(user.userId);
    await initializeTestUserLevel(user.userId);
    return { id: user.userId, email: user.email };
  }

  it("双方に達成・成果物・XP取引・XP加算が作られる", async () => {
    const referrer = await makeUser();
    const referred = await makeUser();
    const code = await createReferralCode(referrer.id);

    await grantReferralReward(code, referred.email, referred.id);

    // 達成が1件ずつ
    expect(
      await countAchievements(referrer.id, referralMission.id),
    ).toHaveLength(1);
    expect(
      await countAchievements(referred.id, referredMission.id),
    ).toHaveLength(1);

    // 成果物は REFERRAL / REFERRED が1件ずつ。どちらも被紹介者のメール
    const referrerArtifacts = await getArtifacts(referrer.id);
    expect(referrerArtifacts).toHaveLength(1);
    expect(referrerArtifacts[0].artifact_type).toBe("REFERRAL");
    expect(referrerArtifacts[0].text_content).toBe(
      referred.email.toLowerCase(),
    );

    const referredArtifacts = await getArtifacts(referred.id);
    expect(referredArtifacts).toHaveLength(1);
    expect(referredArtifacts[0].artifact_type).toBe("REFERRED");
    expect(referredArtifacts[0].text_content).toBe(
      referred.email.toLowerCase(),
    );

    // XP取引が1件ずつ、額は missions.points そのまま
    const referrerTx = await getXpTransactions(referrer.id);
    expect(referrerTx).toHaveLength(1);
    expect(referrerTx[0].xp_amount).toBe(referralMission.points);
    expect(referrerTx[0].source_type).toBe("MISSION_COMPLETION");

    const referredTx = await getXpTransactions(referred.id);
    expect(referredTx).toHaveLength(1);
    expect(referredTx[0].xp_amount).toBe(referredMission.points);

    // 累計XPが points 分増える
    expect(await getXp(referrer.id)).toBe(referralMission.points);
    expect(await getXp(referred.id)).toBe(referredMission.points);
  });

  it("同じ紹介者が別の人を紹介すると2件目も付与される（紹介は無制限）", async () => {
    const referrer = await makeUser();
    const referredA = await makeUser();
    const referredB = await makeUser();
    const code = await createReferralCode(referrer.id);

    await grantReferralReward(code, referredA.email, referredA.id);
    await grantReferralReward(code, referredB.email, referredB.id);

    // 紹介者側は2件。g3 が紹介者側を見ていないことの確認
    expect(
      await countAchievements(referrer.id, referralMission.id),
    ).toHaveLength(2);
    expect(await getXpTransactions(referrer.id)).toHaveLength(2);
    expect(await getXp(referrer.id)).toBe(referralMission.points * 2);
  });

  it("同じメールで2回目を呼んでも追加付与されない（RPCのg3b）", async () => {
    const referrer = await makeUser();
    const referred = await makeUser();
    const code = await createReferralCode(referrer.id);

    await grantReferralReward(code, referred.email, referred.id);
    await grantReferralReward(code, referred.email, referred.id);

    expect(
      await countAchievements(referrer.id, referralMission.id),
    ).toHaveLength(1);
    expect(
      await countAchievements(referred.id, referredMission.id),
    ).toHaveLength(1);
    expect(await getXp(referrer.id)).toBe(referralMission.points);
  });

  it("途中で失敗すると何も残らない（原子性）", async () => {
    const referrer = await makeUser();
    const referred = await makeUser();

    // 存在しないクエストIDを渡してRPCを直接呼ぶ
    const { error } = await adminClient.rpc("grant_referral_reward", {
      p_referrer_user_id: referrer.id,
      p_referred_user_id: referred.id,
      p_referrer_mission_id: referralMission.id,
      p_referred_mission_id: crypto.randomUUID(),
      p_season_id: seasonId,
      p_referred_email: referred.email.toLowerCase(),
    });

    expect(error).not.toBeNull();

    // 紹介者側にも何も残っていない
    expect(
      await countAchievements(referrer.id, referralMission.id),
    ).toHaveLength(0);
    expect(await getXpTransactions(referrer.id)).toHaveLength(0);
    expect(await getArtifacts(referrer.id)).toHaveLength(0);
  });

  it("ガードが効く（シーズンNULL / 自己紹介 / 既存のREFERRED成果物）", async () => {
    const referrer = await makeUser();
    const referred = await makeUser();

    // g1: シーズンが無い
    const nullSeason = await adminClient.rpc("grant_referral_reward", {
      p_referrer_user_id: referrer.id,
      p_referred_user_id: referred.id,
      p_referrer_mission_id: referralMission.id,
      p_referred_mission_id: referredMission.id,
      // NULL を渡してガードを検証する
      p_season_id: null as unknown as string,
      p_referred_email: referred.email.toLowerCase(),
    });
    expect(nullSeason.error?.message).toContain("p_season_id must not be null");

    // g2: 自己紹介
    const selfReferral = await adminClient.rpc("grant_referral_reward", {
      p_referrer_user_id: referrer.id,
      p_referred_user_id: referrer.id,
      p_referrer_mission_id: referralMission.id,
      p_referred_mission_id: referredMission.id,
      p_season_id: seasonId,
      p_referred_email: referred.email.toLowerCase(),
    });
    expect(selfReferral.error?.message).toContain(
      "referrer and referred must differ",
    );

    // g3b: 同じメールの REFERRED 成果物が既にある → 0行
    const first = await adminClient.rpc("grant_referral_reward", {
      p_referrer_user_id: referrer.id,
      p_referred_user_id: referred.id,
      p_referrer_mission_id: referralMission.id,
      p_referred_mission_id: referredMission.id,
      p_season_id: seasonId,
      p_referred_email: referred.email.toLowerCase(),
    });
    expect(first.error).toBeNull();
    expect(first.data).toHaveLength(1);

    const second = await adminClient.rpc("grant_referral_reward", {
      p_referrer_user_id: referrer.id,
      p_referred_user_id: referred.id,
      p_referrer_mission_id: referralMission.id,
      p_referred_mission_id: referredMission.id,
      p_season_id: seasonId,
      p_referred_email: referred.email.toLowerCase(),
    });
    expect(second.error).toBeNull();
    expect(second.data).toHaveLength(0);
  });
});
