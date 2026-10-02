import "server-only";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { generateLotteryToken, LOTTERY_TOKEN_LENGTH } from "./lottery-token";

/** Postgres の一意制約違反 */
const UNIQUE_VIOLATION = "23505";

function generateRandomToken(): string {
  return randomBytes(LOTTERY_TOKEN_LENGTH)
    .toString("hex")
    .slice(0, LOTTERY_TOKEN_LENGTH)
    .toUpperCase();
}

/**
 * ユーザーの応募トークンを返す。未発行なら発行して lottery_tokens に記録する。
 *
 * 一度発行したトークンはDBの行が正で、シークレットを変えても変わらない。
 * 初回は従来どおり userId から導出した値を使う（保存を始める前に表示していた
 * トークンと同じ値になる）。別のユーザーと衝突した場合だけ乱数に切り替える。
 *
 * 発行も記録もできなかった場合は null を返す。呼び出し側でパネルを隠す
 * （記録のないトークンを見せると、後で照合できない応募が生まれる）。
 */
export async function getOrIssueLotteryToken(
  userId: string,
): Promise<string | null> {
  const supabase = await createAdminClient();

  const findIssued = async (): Promise<string | null | undefined> => {
    const { data, error } = await supabase
      .from("lottery_tokens")
      .select("token")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("抽選応募トークンの取得に失敗:", error);
      return undefined;
    }
    return data?.token ?? null;
  };

  const issued = await findIssued();
  if (issued === undefined) return null;
  if (issued) return issued;

  const derived = generateLotteryToken(userId);
  if (!derived) return null;

  for (const candidate of [
    derived,
    generateRandomToken(),
    generateRandomToken(),
  ]) {
    const { error } = await supabase
      .from("lottery_tokens")
      .insert({ user_id: userId, token: candidate });
    if (!error) return candidate;

    if (error.code !== UNIQUE_VIOLATION) {
      console.error("抽選応募トークンの記録に失敗:", error);
      return null;
    }

    // 同じユーザーの並行リクエストが先に発行していれば、そちらを返す。
    // そうでなければトークンが他人と衝突しているので、次の候補で試す
    const issuedMeanwhile = await findIssued();
    if (issuedMeanwhile) return issuedMeanwhile;
  }

  console.error("抽選応募トークンを発行できませんでした:", userId);
  return null;
}
