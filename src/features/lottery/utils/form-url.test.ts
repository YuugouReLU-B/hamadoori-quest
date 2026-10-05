import { buildLotteryFormUrl } from "./form-url";

describe("buildLotteryFormUrl", () => {
  it("事前入力URLの {token} をトークンに差し替える", () => {
    expect(
      buildLotteryFormUrl(
        "https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.123={token}",
        "F76A62B783",
      ),
    ).toBe(
      "https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.123=F76A62B783",
    );
  });

  it("{token} が無いURLはそのまま返す", () => {
    expect(buildLotteryFormUrl("https://forms.gle/xyz", "F76A62B783")).toBe(
      "https://forms.gle/xyz",
    );
  });

  it("URLに使えない文字はエンコードする", () => {
    expect(buildLotteryFormUrl("https://x.test/?t={token}", "A&B C")).toBe(
      "https://x.test/?t=A%26B%20C",
    );
  });
});
