import { formatTitleWithLineBreaks } from "./og-helpers";

describe("formatTitleWithLineBreaks", () => {
  it("returns title unchanged when no brackets present", () => {
    expect(formatTitleWithLineBreaks("テスト")).toBe("テスト");
  });

  it("inserts line break before full-width brackets", () => {
    expect(formatTitleWithLineBreaks("ミッション（初級）")).toBe(
      "ミッション\n（初級）",
    );
  });

  it("inserts line break before half-width brackets", () => {
    expect(formatTitleWithLineBreaks("Mission(beginner)")).toBe(
      "Mission\n(beginner)",
    );
  });

  it("handles multiple full-width brackets", () => {
    expect(formatTitleWithLineBreaks("タイトル（A）と（B）")).toBe(
      "タイトル\n（A）と\n（B）",
    );
  });

  it("handles multiple half-width brackets", () => {
    expect(formatTitleWithLineBreaks("Title(A)and(B)")).toBe(
      "Title\n(A)and\n(B)",
    );
  });

  it("handles mixed bracket types", () => {
    expect(formatTitleWithLineBreaks("タイトル（A）and(B)")).toBe(
      "タイトル\n（A）and\n(B)",
    );
  });

  it("returns empty string for empty input", () => {
    expect(formatTitleWithLineBreaks("")).toBe("");
  });
});
