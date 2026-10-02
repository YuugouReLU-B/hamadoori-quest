import "server-only";

import { createHmac } from "node:crypto";

/** 表示用に十分短く、かつ総当たりが非現実的な長さ */
export const LOTTERY_TOKEN_LENGTH = 10;

/**
 * userId から再現可能な応募トークンを導出する。
 *
 * 初回発行時の値として使う。発行済みのトークンは lottery_tokens の行が正なので、
 * 表示には getOrIssueLotteryToken（lottery-token-store.ts）を使うこと。
 * 「自分のトークンを他人に渡す動機がない」前提で流出耐性を確保している
 * （他人になりすましてもそのユーザーの応募にしかならない）。
 *
 * シークレット未設定の環境（env未設定のままデプロイされた場合）でも
 * ページ全体を落とさないよう null を返す。呼び出し側でパネルを隠す。
 */
export function generateLotteryToken(userId: string): string | null {
  const secret = process.env.LOTTERY_TOKEN_SECRET;
  if (!secret) {
    console.error("LOTTERY_TOKEN_SECRET が設定されていません");
    return null;
  }

  return createHmac("sha256", secret)
    .update(userId)
    .digest("hex")
    .slice(0, LOTTERY_TOKEN_LENGTH)
    .toUpperCase();
}
