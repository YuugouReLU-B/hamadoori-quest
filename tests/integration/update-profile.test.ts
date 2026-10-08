import { updateProfile } from "@/features/user-settings/use-cases/update-profile";
import { adminClient, cleanupTestUser } from "./utils";

describe("updateProfile ユースケース", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    for (const id of createdUserIds) {
      // user_referral は FK cascade で削除されない場合があるため手動削除
      await adminClient.from("user_referral").delete().eq("user_id", id);
      await adminClient.from("user_activities").delete().eq("user_id", id);
      await cleanupTestUser(id);
    }
    createdUserIds.length = 0;
  });

  async function createAuthUser(
    email?: string,
  ): Promise<{ userId: string; email: string }> {
    const userEmail = email ?? `test-profile-${Date.now()}@example.com`;
    const { data, error } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: "password123",
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`テストユーザーの作成に失敗: ${error?.message}`);
    }
    createdUserIds.push(data.user.id);
    return { userId: data.user.id, email: userEmail };
  }

  const validInput = {
    name: "テスト太郎",
    addressPrefecture: "東京都",
    dateOfBirth: "1990-01-15",
    xUsername: "test_x",
    githubUsername: "test-gh",
    avatarPath: null,
  };

  test("新規ユーザーのプロフィール作成 → private_users + public_user_profiles + user_referral 作成確認", async () => {
    const { userId } = await createAuthUser();

    const result = await updateProfile(
      { adminSupabase: adminClient },
      { ...validInput, userId },
    );

    expect(result.success).toBe(true);

    // private_users が作成されていることを検証
    const { data: privateUser } = await adminClient
      .from("private_users")
      .select("*")
      .eq("id", userId)
      .single();
    expect(privateUser).not.toBeNull();
    expect(privateUser!.date_of_birth).toBe("1990-01-15");

    // public_user_profiles が作成されていることを検証
    const { data: publicProfile } = await adminClient
      .from("public_user_profiles")
      .select("*")
      .eq("id", userId)
      .single();
    expect(publicProfile).not.toBeNull();
    expect(publicProfile!.name).toBe("テスト太郎");
    expect(publicProfile!.address_prefecture).toBe("東京都");
    expect(publicProfile!.x_username).toBe("test_x");
    expect(publicProfile!.github_username).toBe("test-gh");

    // user_referral が作成されていることを検証
    const { data: referral } = await adminClient
      .from("user_referral")
      .select("*")
      .eq("user_id", userId)
      .single();
    expect(referral).not.toBeNull();
    expect(referral!.referral_code).toBeDefined();
    expect(referral!.referral_code.length).toBe(8);

    // user_activities にサインアップアクティビティが記録されていることを検証
    const { data: activities } = await adminClient
      .from("user_activities")
      .select("*")
      .eq("user_id", userId)
      .eq("activity_type", "signup");
    expect(activities).not.toBeNull();
    expect(activities!.length).toBe(1);
    expect(activities![0].activity_title).toContain("テスト太郎");
  });

  test("既存ユーザーのプロフィール更新 → 更新確認", async () => {
    const { userId } = await createAuthUser();

    // 1回目: 新規作成
    const first = await updateProfile(
      { adminSupabase: adminClient },
      { ...validInput, userId },
    );
    expect(first.success).toBe(true);

    // 2回目: 更新
    const second = await updateProfile(
      { adminSupabase: adminClient },
      {
        userId,
        name: "更新太郎",
        addressPrefecture: "大阪府",
        dateOfBirth: "1985-06-20",
        xUsername: "updated_x",
        githubUsername: "updated-gh",
        avatarPath: null,
      },
    );
    expect(second.success).toBe(true);

    // private_users が更新されていることを検証
    const { data: privateUser } = await adminClient
      .from("private_users")
      .select("*")
      .eq("id", userId)
      .single();
    expect(privateUser!.date_of_birth).toBe("1985-06-20");

    // public_user_profiles が更新されていることを検証
    const { data: publicProfile } = await adminClient
      .from("public_user_profiles")
      .select("*")
      .eq("id", userId)
      .single();
    expect(publicProfile!.name).toBe("更新太郎");
    expect(publicProfile!.address_prefecture).toBe("大阪府");
    expect(publicProfile!.x_username).toBe("updated_x");
    expect(publicProfile!.github_username).toBe("updated-gh");

    // user_referral は2回作成されていないことを検証（既存があるためスキップ）
    const { data: referrals } = await adminClient
      .from("user_referral")
      .select("*")
      .eq("user_id", userId);
    expect(referrals!.length).toBe(1);
  });

  test("バリデーションエラー（無効な都道府県）", async () => {
    const { userId } = await createAuthUser();

    const result = await updateProfile(
      { adminSupabase: adminClient },
      {
        ...validInput,
        userId,
        addressPrefecture: "無効な県",
      },
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("都道府県");

    // DBにデータが作成されていないことを検証
    const { data: privateUser } = await adminClient
      .from("private_users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    expect(privateUser).toBeNull();
  });

  test("バリデーションエラー（空のニックネーム）", async () => {
    const { userId } = await createAuthUser();

    const result = await updateProfile(
      { adminSupabase: adminClient },
      {
        ...validInput,
        userId,
        name: "",
      },
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("ニックネーム");

    // DBにデータが作成されていないことを検証
    const { data: privateUser } = await adminClient
      .from("private_users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    expect(privateUser).toBeNull();
  });

  test("バリデーションエラー（無効な生年月日形式）", async () => {
    const { userId } = await createAuthUser();

    const result = await updateProfile(
      { adminSupabase: adminClient },
      {
        ...validInput,
        userId,
        dateOfBirth: "1990/01/15", // YYYY-MM-DD形式ではない
      },
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("生年月日");
  });

  test("生年月日と都道府県は任意（未指定でも作成できる）", async () => {
    const { userId } = await createAuthUser();

    const result = await updateProfile(
      { adminSupabase: adminClient },
      { userId, name: "ニックネームだけの人", avatarPath: null },
    );

    expect(result.success).toBe(true);

    const { data: privateUser } = await adminClient
      .from("private_users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    expect(privateUser).not.toBeNull();
    expect(privateUser!.date_of_birth).toBeNull();
    expect(privateUser!.postcode).toBeNull();

    const { data: publicProfile } = await adminClient
      .from("public_user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    expect(publicProfile!.name).toBe("ニックネームだけの人");
    expect(publicProfile!.address_prefecture).toBeNull();
  });

  test("ニックネームは必須のまま", async () => {
    const { userId } = await createAuthUser();

    const result = await updateProfile(
      { adminSupabase: adminClient },
      { userId, name: "", avatarPath: null },
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("ニックネーム");
  });

  test("郵便番号は取得しない（渡しても保存されない）", async () => {
    const { userId } = await createAuthUser();

    const result = await updateProfile(
      { adminSupabase: adminClient },
      { ...validInput, userId },
    );

    expect(result.success).toBe(true);

    const { data: privateUser } = await adminClient
      .from("private_users")
      .select("postcode")
      .eq("id", userId)
      .maybeSingle();
    expect(privateUser!.postcode).toBeNull();
  });
});
