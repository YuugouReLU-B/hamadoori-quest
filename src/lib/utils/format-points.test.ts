import { formatPoints, POINT_UNIT } from "./format-points";

describe("formatPoints", () => {
  it("単位 pt を空白なしで付ける", () => {
    expect(formatPoints(100)).toBe("100pt");
  });

  it("桁区切りを入れない", () => {
    expect(formatPoints(1000)).toBe("1000pt");
    expect(formatPoints(123456)).toBe("123456pt");
  });

  it("null / undefined は 0pt にする", () => {
    expect(formatPoints(null)).toBe("0pt");
    expect(formatPoints(undefined)).toBe("0pt");
  });

  it("単位の定数は pt", () => {
    expect(POINT_UNIT).toBe("pt");
  });
});
