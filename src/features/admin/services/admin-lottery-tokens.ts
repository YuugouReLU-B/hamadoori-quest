import "server-only";

import { getLotterySettings } from "@/features/lottery/services/lottery-settings";
import { getCurrentSeason } from "@/lib/services/seasons";
import { createAdminClient } from "@/lib/supabase/adminClient";

/**
 * 照合結果の状態。
 * プライバシーポリシーで「応募フォームの情報を利用履歴と突き合わせない」としているので、
 * 誰のトークンか・何ポイントかは返さず、応募条件を満たすかどうかだけを返す。
 */
export type LotteryTokenStatus = "eligible" | "not_eligible" | "withdrawn";

export type AdminLotteryTokenItem = {
  token: string;
  issuedAt: string;
  status: LotteryTokenStatus;
};

/** 応募フォームの回答は前後の空白や小文字が混ざりうるので、照合前にそろえる */
export function normalizeLotteryToken(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * 発行済みの抽選応募トークンの一覧。応募フォームの回答と照合するために使う。
 *
 * `token` を渡すとそのトークンだけに絞る。新しい発行順で、1000件まで。
 * 返すのはトークン・発行日時・応募条件を満たすかどうかだけで、持ち主は返さない。
 */
export async function listLotteryTokensForAdmin(
  token?: string,
): Promise<AdminLotteryTokenItem[]> {
  const supabase = await createAdminClient();

  const query = supabase
    .from("lottery_tokens")
    .select("token, issued_at, user_id")
    .order("issued_at", { ascending: false })
    .limit(1000);
  const normalized = token ? normalizeLotteryToken(token) : "";

  const { data: rows, error } = normalized
    ? await query.eq("token", normalized)
    : await query;
  if (error) {
    console.error("抽選応募トークン一覧の取得に失敗:", error);
    return [];
  }

  const userIds = rows
    .map((row) => row.user_id)
    .filter((id): id is string => id !== null);

  const [season, settings] = await Promise.all([
    getCurrentSeason(),
    getLotterySettings(),
  ]);
  const threshold = settings?.threshold_points ?? null;
  const { data: levels } =
    season && userIds.length > 0
      ? await supabase
          .from("user_levels")
          .select("user_id, xp")
          .eq("season_id", season.id)
          .in("user_id", userIds)
      : { data: [] as { user_id: string; xp: number }[] };
  const xpMap = new Map((levels ?? []).map((l) => [l.user_id, l.xp]));

  return rows.map((row) => ({
    token: row.token,
    issuedAt: row.issued_at,
    status: !row.user_id
      ? "withdrawn"
      : threshold !== null && (xpMap.get(row.user_id) ?? 0) >= threshold
        ? "eligible"
        : "not_eligible",
  }));
}
