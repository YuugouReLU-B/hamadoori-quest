import "server-only";

import { getCurrentSeason } from "@/lib/services/seasons";
import { createAdminClient } from "@/lib/supabase/adminClient";

export type AdminLotteryTokenItem = {
  token: string;
  issuedAt: string;
  /** 退会済みなら null */
  userId: string | null;
  name: string | null;
  /** 現在のアクティブシーズンのポイント。退会済み・未取得なら null */
  xp: number | null;
};

/** 応募フォームの回答は前後の空白や小文字が混ざりうるので、照合前にそろえる */
export function normalizeLotteryToken(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * 発行済みの抽選応募トークンの一覧。応募フォームの回答と照合するために使う。
 *
 * `token` を渡すとそのトークンだけに絞る。新しい発行順で、1000件まで。
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
  if (userIds.length === 0) {
    return rows.map((row) => ({
      token: row.token,
      issuedAt: row.issued_at,
      userId: row.user_id,
      name: null,
      xp: null,
    }));
  }

  const season = await getCurrentSeason();
  const [{ data: profiles }, { data: levels }] = await Promise.all([
    supabase.from("public_user_profiles").select("id, name").in("id", userIds),
    season
      ? supabase
          .from("user_levels")
          .select("user_id, xp")
          .eq("season_id", season.id)
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as { user_id: string; xp: number }[] }),
  ]);
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));
  const xpMap = new Map((levels ?? []).map((l) => [l.user_id, l.xp]));

  return rows.map((row) => ({
    token: row.token,
    issuedAt: row.issued_at,
    userId: row.user_id,
    name: row.user_id ? (nameMap.get(row.user_id) ?? null) : null,
    xp: row.user_id ? (xpMap.get(row.user_id) ?? null) : null,
  }));
}
