import { lotterySettingsSchema } from "./lottery-settings-schema";

const input = {
  threshold_points: "1000",
  title: "抽選応募",
  description: "抽選のご案内",
  button_label: "応募する",
  form_url: "",
};

it("空欄をNULLに変換して日付条件を解除できる", () => {
  expect(
    lotterySettingsSchema.parse({ ...input, eligible_display_from: "" }),
  ).toHaveProperty("eligible_display_from", null);
});

it.each(["2026-09-14", "2028-02-29"])("有効な日付を保存できる: %s", (date) => {
  expect(
    lotterySettingsSchema.parse({ ...input, eligible_display_from: date }),
  ).toHaveProperty("eligible_display_from", date);
});

it.each([
  "2026-02-29",
  "2026-04-31",
  "2026-13-01",
  "2026-9-14",
  "invalid",
  "2026-09-14T00:00:00Z",
])("不正な日付を拒否する: %s", (date) => {
  expect(
    lotterySettingsSchema.safeParse({ ...input, eligible_display_from: date })
      .success,
  ).toBe(false);
});

it("Googleフォームの事前入力URL（{token} 入り）を保存できる", () => {
  const url =
    "https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.123456789={token}";
  expect(
    lotterySettingsSchema.parse({
      ...input,
      eligible_display_from: "",
      eligible_display_until: "",
      form_url: url,
    }),
  ).toHaveProperty("form_url", url);
});
