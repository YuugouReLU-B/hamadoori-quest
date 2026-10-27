import "server-only";

import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAdmin } from "@/lib/utils/admin";

/** 管理者が応募開始後の表示を先に確かめるための cookie */
export const LOTTERY_PREVIEW_COOKIE = "lottery_preview";
export const LOTTERY_PREVIEW_VALUE = "open";

/** プレビュー中に出す見本のトークン。lottery_tokens には記録しない */
export const LOTTERY_PREVIEW_TOKEN = "PREVIEW000";

/**
 * 応募受付中の表示をプレビューしているか。
 *
 * cookie を持っていても、管理者でなければ効かない（他の人の画面は変わらない）。
 */
export async function isLotteryPreview(user: User | null): Promise<boolean> {
  if (!isAdmin(user)) return false;
  const cookieStore = await cookies();
  return (
    cookieStore.get(LOTTERY_PREVIEW_COOKIE)?.value === LOTTERY_PREVIEW_VALUE
  );
}

/**
 * プレビュー中の判定に使う「いま」とポイント。
 *
 * 応募開始日（日本時間0時）に立ち、ポイントはしきい値に達したものとして扱う。
 * 受付中の画面を、日付やポイントに関係なく確かめられるようにするため。
 */
export function previewLotteryInputs(settings: {
  threshold_points: number;
  eligible_display_from: string | null;
}): { now: Date; points: number } {
  return {
    now: settings.eligible_display_from
      ? new Date(`${settings.eligible_display_from}T00:00:00+09:00`)
      : new Date(),
    points: settings.threshold_points,
  };
}
