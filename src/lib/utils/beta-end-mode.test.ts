import {
  BETA_END_AT,
  isBetaEndActive,
  isBetaEndPreview,
  shouldShowBetaEnd,
} from "./beta-end-mode";

const SAMPLE_END_AT = new Date("2026-11-30T15:00:00.000Z");

describe("beta-end-mode", () => {
  it("終了時刻前ではベータ終了していない", () => {
    const now = new Date("2026-11-30T14:59:59.000Z");
    expect(isBetaEndActive(now, SAMPLE_END_AT)).toBe(false);
  });

  it("終了時刻ちょうどでベータ終了", () => {
    const now = new Date("2026-11-30T15:00:00.000Z");
    expect(isBetaEndActive(now, SAMPLE_END_AT)).toBe(true);
  });

  it("終了時刻がnullならベータ終了は無効", () => {
    const now = new Date("2026-11-30T15:00:00.000Z");
    expect(isBetaEndActive(now, null)).toBe(false);
  });

  it("デフォルトのBETA_END_ATは2026-12-01 JST", () => {
    expect(BETA_END_AT?.toISOString()).toBe("2026-11-30T15:00:00.000Z");
  });

  it("終了前でも preview=beta-end なら表示する", () => {
    const url = new URL("https://example.com/?preview=beta-end");
    const now = new Date("2026-11-30T14:59:59.000Z");

    expect(isBetaEndPreview(url)).toBe(true);
    expect(shouldShowBetaEnd(url, now, SAMPLE_END_AT)).toBe(true);
  });

  it("previewがbeta-end以外なら終了前は表示しない", () => {
    const url = new URL("https://example.com/?preview=1");
    const now = new Date("2026-11-30T14:59:59.000Z");

    expect(isBetaEndPreview(url)).toBe(false);
    expect(shouldShowBetaEnd(url, now, SAMPLE_END_AT)).toBe(false);
  });

  it("終了時刻がnullでも preview=beta-end なら表示する", () => {
    const url = new URL("https://example.com/?preview=beta-end");
    const now = new Date("2026-11-30T15:00:00.000Z");

    expect(shouldShowBetaEnd(url, now, null)).toBe(true);
  });
});
