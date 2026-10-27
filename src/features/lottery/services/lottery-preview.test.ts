import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isLotteryPreview, previewLotteryInputs } from "./lottery-preview";

jest.mock("next/headers", () => ({ cookies: jest.fn() }));

function mockCookie(value: string | undefined) {
  jest.mocked(cookies).mockResolvedValue({
    get: () => (value === undefined ? undefined : { name: "x", value }),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

const admin = {
  id: "a",
  app_metadata: { roles: ["admin"] },
} as unknown as User;
const member = { id: "m", app_metadata: {} } as unknown as User;

describe("isLotteryPreview", () => {
  it("管理者が cookie を持っているときだけ true", async () => {
    mockCookie("open");
    expect(await isLotteryPreview(admin)).toBe(true);
  });

  it("管理者でなければ cookie があっても false", async () => {
    mockCookie("open");
    expect(await isLotteryPreview(member)).toBe(false);
    expect(await isLotteryPreview(null)).toBe(false);
  });

  it("cookie が無ければ管理者でも false", async () => {
    mockCookie(undefined);
    expect(await isLotteryPreview(admin)).toBe(false);
  });
});

describe("previewLotteryInputs", () => {
  it("応募開始日の日本時間0時と、しきい値のポイントを返す", () => {
    const { now, points } = previewLotteryInputs({
      threshold_points: 1000,
      eligible_display_from: "2026-11-02",
    });
    expect(now.toISOString()).toBe("2026-11-01T15:00:00.000Z");
    expect(points).toBe(1000);
  });
});
