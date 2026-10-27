"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAdmin } from "@/features/admin/services/authorize-admin";
import {
  LOTTERY_PREVIEW_COOKIE,
  LOTTERY_PREVIEW_VALUE,
} from "@/features/lottery/services/lottery-preview";

/**
 * 応募受付中の表示のプレビューを、押した管理者のブラウザだけで切り替える。
 *
 * 状態は cookie に持つので、他の人の画面や設定（lottery_settings）は変わらない。
 * 消し忘れても1日で切れる。
 */
export async function setLotteryPreview(formData: FormData): Promise<void> {
  await requireAdmin();

  const cookieStore = await cookies();
  if (formData.get("mode") === "on") {
    cookieStore.set(LOTTERY_PREVIEW_COOKIE, LOTTERY_PREVIEW_VALUE, {
      maxAge: 60 * 60 * 24,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  } else {
    cookieStore.delete(LOTTERY_PREVIEW_COOKIE);
  }

  revalidatePath("/", "layout");
}
