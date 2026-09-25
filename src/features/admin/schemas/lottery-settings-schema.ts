import { z } from "zod";
import { isValidUrl } from "@/lib/utils/url-validation";

export const lotterySettingsSchema = z
  .object({
    eligible_display_from: z
      .union([
        z.literal(""),
        z.string().date("有効な日付をYYYY-MM-DD形式で入力してください"),
      ])
      .transform((value) => (value === "" ? null : value)),
    // 終了日は未送信（undefined）も空欄と同じ「終了しない」として扱う。
    eligible_display_until: z
      .union([
        z.literal(""),
        z.undefined(),
        z.string().date("有効な日付をYYYY-MM-DD形式で入力してください"),
      ])
      .transform((value) =>
        value === "" || value === undefined ? null : value,
      ),
    threshold_points: z
      .string()
      .min(1, "しきい値は必須です")
      .pipe(z.coerce.number().int().min(0).max(1000000)),
    title: z.string().min(1, "見出しは必須です").max(100),
    description: z.string().min(1, "説明文は必須です").max(1000),
    button_label: z.string().min(1, "ボタンラベルは必須です").max(50),
    form_url: z
      .string()
      .max(1000)
      .refine((value) => value === "" || isValidUrl(value), {
        message: "リンク先URLは空欄か、http(s)の有効なURLで入力してください",
      }),
  })
  // 各フィールドの transform 後の値を比較するため、object の後段で検証する。
  .superRefine((values, ctx) => {
    const { eligible_display_from: from, eligible_display_until: until } =
      values;
    if (from === null || until === null) return;
    if (until < from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eligible_display_until"],
        message: "応募終了日は応募フォーム公開日以降の日付を入力してください",
      });
    }
  });

export type LotterySettingsInput = z.input<typeof lotterySettingsSchema>;
