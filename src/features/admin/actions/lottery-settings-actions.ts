"use server";

import { revalidatePath } from "next/cache";
import { lotterySettingsSchema } from "@/features/admin/schemas/lottery-settings-schema";
import { requireAdmin } from "@/features/admin/services/authorize-admin";
import { createAdminClient } from "@/lib/supabase/adminClient";

export type AdminActionResult =
  | { success: true }
  | { success: false; error: string };

const SETTINGS_ID = "default";

/**
 * 抽選応募パネル（マイページ表示）の設定を更新する。
 *
 * 設定行は固定ID `'default'` の1行だけなので、常にそれを更新する。
 */
export async function updateLotterySettings(
  formData: FormData,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = lotterySettingsSchema.safeParse({
    eligible_display_from: String(
      formData.get("eligible_display_from") ?? "",
    ).trim(),
    eligible_display_until: String(
      formData.get("eligible_display_until") ?? "",
    ).trim(),
    threshold_points: String(formData.get("threshold_points") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    button_label: String(formData.get("button_label") ?? "").trim(),
    form_url: String(formData.get("form_url") ?? "").trim(),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("lottery_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", SETTINGS_ID);

  if (error) {
    console.error("抽選応募設定の更新に失敗:", error);
    return { success: false, error: `更新に失敗しました: ${error.message}` };
  }

  revalidatePath("/admin/lottery");
  revalidatePath("/", "layout");
  return { success: true };
}
