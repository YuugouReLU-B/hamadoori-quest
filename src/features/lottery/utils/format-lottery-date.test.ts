import {
  formatLotteryEntryPeriod,
  formatLotteryOpenDate,
} from "./format-lottery-date";

describe("formatLotteryOpenDate", () => {
  test("月日をゼロ埋めせず M/D(曜) にする", () => {
    expect(formatLotteryOpenDate("2026-11-02")).toBe("11/2(月)");
  });

  test("1桁の月もゼロ埋めしない", () => {
    expect(formatLotteryOpenDate("2027-01-10")).toBe("1/10(日)");
  });

  test("月日とも1桁の場合もゼロ埋めしない", () => {
    expect(formatLotteryOpenDate("2026-09-01")).toBe("9/1(火)");
  });

  test.each([
    ["2026-11-01", "11/1(日)"],
    ["2026-11-02", "11/2(月)"],
    ["2026-11-03", "11/3(火)"],
    ["2026-11-04", "11/4(水)"],
    ["2026-11-05", "11/5(木)"],
    ["2026-11-06", "11/6(金)"],
    ["2026-11-07", "11/7(土)"],
  ])("%s の曜日はJST基準の1文字になる", (input, expected) => {
    expect(formatLotteryOpenDate(input)).toBe(expected);
  });

  test("うるう日も正しく整形する", () => {
    expect(formatLotteryOpenDate("2028-02-29")).toBe("2/29(火)");
  });
});

describe("formatLotteryEntryPeriod", () => {
  test("同年なら終了側に年を付けず、月日はゼロ埋めする", () => {
    expect(formatLotteryEntryPeriod("2026-11-02", "2026-11-29")).toBe(
      "2026/11/02~11/29",
    );
  });

  test("年を跨ぐ場合のみ終了側にも年を付ける", () => {
    expect(formatLotteryEntryPeriod("2026-12-28", "2027-01-10")).toBe(
      "2026/12/28~2027/01/10",
    );
  });

  test("同一月内でも特例を設けない", () => {
    expect(formatLotteryEntryPeriod("2026-11-02", "2026-11-05")).toBe(
      "2026/11/02~11/05",
    );
  });

  test("開始日と終了日が同一日でも特例を設けない", () => {
    expect(formatLotteryEntryPeriod("2026-11-29", "2026-11-29")).toBe(
      "2026/11/29~11/29",
    );
  });

  test("開始日が終了日より後でも例外を投げずそのまま整形する", () => {
    expect(formatLotteryEntryPeriod("2026-11-29", "2026-11-02")).toBe(
      "2026/11/29~11/02",
    );
  });
});
