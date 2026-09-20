import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { z } from "zod";
import { PREFECTURES } from "@/lib/constants/prefectures";
import { formatZodErrors } from "@/lib/utils/validation-utils";
import type { MailClient } from "../types/mail-client";

function generateReferralCode(length = 8): string {
  return randomBytes(length).toString("base64url").slice(0, length);
}

/**
 * レスポンスを返したあとに実行したい付帯処理を登録する。
 *
 * `after()` はリクエストスコープの外（統合テストからユースケースを直接呼ぶ場合など）
 * では例外になる。その場合はその場で実行してしまう。
 */
async function runAfterResponse(task: () => Promise<void>): Promise<void> {
  try {
    after(task);
  } catch {
    await task();
  }
}

/** ユーザー別紹介コードを登録する。コードが衝突したときだけリトライする */
async function insertReferralCode(
  adminSupabase: SupabaseClient,
  userId: string,
): Promise<Error | null> {
  const MAX_RETRY = 5;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    const { error } = await adminSupabase.from("user_referral").insert({
      user_id: userId,
      referral_code: generateReferralCode(8),
    });

    if (!error) {
      return null;
    }

    // 23505 = unique_violation。コードの衝突なので引き直す
    if (error.code !== "23505") {
      return new Error(error.message);
    }

    lastError = new Error(error.message);
  }

  return lastError;
}

export type UpdateProfileInput = {
  userId: string;
  email: string | undefined;
  name: string;
  /** 任意。アンケート項目 */
  addressPrefecture?: string;
  /** 任意。アンケート項目 */
  dateOfBirth?: string;
  xUsername?: string;
  githubUsername?: string;
  /**
   * アバターのパス。`null` は「消す」、`undefined` は「触らない」。
   * ニックネームだけを更新するフォームからは undefined が来る。
   */
  avatarPath?: string | null;
};

export type UpdateProfileResult =
  | { success: true }
  | { success: false; error: string };

export type UpdateProfileDeps = {
  adminSupabase: SupabaseClient;
  mail: MailClient;
};

const updateProfileSchema = z.object({
  name: z
    .string()
    .nonempty({ message: "ニックネームを入力してください" })
    .max(100, { message: "ニックネームは100文字以内で入力してください" }),
  // 以下は任意のアンケート項目。未入力なら undefined に正規化し、
  // 入力された場合だけ形式を検証する
  addressPrefecture: z
    .string()
    .optional()
    .transform((val) => (val ? val : undefined))
    .refine((val) => val === undefined || PREFECTURES.includes(val), {
      message: "有効な都道府県を選択してください",
    }),
  dateOfBirth: z
    .string()
    .optional()
    .transform((val) => (val ? val : undefined))
    .refine((val) => val === undefined || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: "生年月日はYYYY-MM-DD形式で入力してください",
    }),
  xUsername: z
    .string()
    .max(50, { message: "Xユーザー名は50文字以内で入力してください" })
    .optional(),
  githubUsername: z
    .string()
    .max(39, { message: "GitHubユーザー名は39文字以内で入力してください" })
    .optional(),
});

export async function updateProfile(
  deps: UpdateProfileDeps,
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  const { adminSupabase, mail } = deps;

  // バリデーション
  const validatedFields = updateProfileSchema.safeParse({
    name: input.name,
    addressPrefecture: input.addressPrefecture,
    dateOfBirth: input.dateOfBirth,
    xUsername: input.xUsername,
    githubUsername: input.githubUsername,
  });

  if (!validatedFields.success) {
    return {
      success: false,
      error: formatZodErrors(validatedFields.error),
    };
  }

  const validatedData = validatedFields.data;
  const now = new Date().toISOString();

  // 読み取りは互いに独立なので並列にする。
  // 直列にすると、そのぶんDBとの往復がそのまま待ち時間になる
  const [{ data: privateUser }, { data: existingReferral }] = await Promise.all(
    [
      adminSupabase
        .from("private_users")
        .select("id")
        .eq("id", input.userId)
        .maybeSingle(),
      adminSupabase
        .from("user_referral")
        .select("user_id")
        .eq("user_id", input.userId)
        .maybeSingle(),
    ],
  );

  const isNewUser = !privateUser;
  const failureMessage = isNewUser
    ? "ユーザー情報の登録に失敗しました"
    : "ユーザー情報の更新に失敗しました";

  // avatarPath が undefined のときは avatar_url を送らない（既存の値を保つ）
  const publicProfileRow = {
    id: input.userId,
    name: validatedData.name,
    address_prefecture: validatedData.addressPrefecture ?? null,
    x_username: validatedData.xUsername || null,
    github_username: validatedData.githubUsername || null,
    updated_at: now,
    ...(input.avatarPath !== undefined ? { avatar_url: input.avatarPath } : {}),
  };

  // 書き込みも互いに独立。insert/update を upsert に寄せて分岐も消してある
  const [privateUserResult, publicUserResult, referralError] =
    await Promise.all([
      adminSupabase.from("private_users").upsert({
        id: input.userId,
        date_of_birth: validatedData.dateOfBirth ?? null,
        updated_at: now,
      }),
      adminSupabase.from("public_user_profiles").upsert(publicProfileRow),
      existingReferral
        ? Promise.resolve(null)
        : insertReferralCode(adminSupabase, input.userId),
    ]);

  if (privateUserResult.error) {
    console.error("Error upserting private_users:", privateUserResult.error);
    return { success: false, error: failureMessage };
  }

  if (publicUserResult.error) {
    console.error(
      "Error upserting public_user_profiles:",
      publicUserResult.error,
    );
    return { success: false, error: failureMessage };
  }

  if (referralError) {
    console.error("紹介コード登録に失敗:", referralError);
    return {
      success: false,
      error: "紹介コードの登録に失敗しました。（重複によるリトライ上限）",
    };
  }

  if (isNewUser) {
    // ウェルカムメール送信・サインアップアクティビティ記録は本人の登録完了を
    // 待たせる必要がない付帯処理。レスポンスを返したあとにバックグラウンドで行う
    // （メール送信が失敗/遅延すると登録ボタンの反応がそのぶん遅く見えていた）
    await runAfterResponse(async () => {
      try {
        if (input.email) {
          await mail.sendWelcomeMail(input.email);
        }
      } catch (e) {
        console.error("案内メール送信失敗:", e);
      }

      try {
        // 既存のサインアップアクティビティをチェック
        const { data: existingActivity } = await adminSupabase
          .from("user_activities")
          .select("id")
          .eq("user_id", input.userId)
          .eq("activity_type", "signup")
          .maybeSingle();

        if (!existingActivity) {
          await adminSupabase.from("user_activities").insert({
            user_id: input.userId,
            activity_type: "signup",
            activity_title: `${validatedData.name}さんが仲間入りしました！`,
          });
        }
      } catch (e) {
        console.error("サインアップアクティビティ記録失敗:", e);
      }
    });
  }

  return { success: true };
}
