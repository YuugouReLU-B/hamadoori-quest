import {
  formatChannel,
  formatCount,
  formatDuration,
  formatPercent,
  orDash,
} from "./format";

describe("formatDuration", () => {
  it("1分未満は秒で出す", () => {
    expect(formatDuration(0)).toBe("0秒");
    expect(formatDuration(45.4)).toBe("45秒");
  });

  it("1分以上は分と秒で出す", () => {
    expect(formatDuration(60)).toBe("1分");
    expect(formatDuration(83)).toBe("1分23秒");
  });

  it("1時間以上は時間と分で出す", () => {
    expect(formatDuration(3720)).toBe("1時間2分");
  });

  it("値が無ければハイフン", () => {
    expect(formatDuration(null)).toBe("-");
    expect(formatDuration(undefined)).toBe("-");
  });
});

describe("formatCount", () => {
  it("3桁区切りにする", () => {
    expect(formatCount(12345)).toBe("12,345");
  });

  it("0は0として出す（ハイフンにしない）", () => {
    expect(formatCount(0)).toBe("0");
  });

  it("値が無ければハイフン", () => {
    expect(formatCount(null)).toBe("-");
  });
});

describe("formatPercent", () => {
  it("%を付ける", () => {
    expect(formatPercent(72.5)).toBe("72.5%");
  });

  it("値が無ければハイフン", () => {
    expect(formatPercent(null)).toBe("-");
  });
});

describe("formatChannel", () => {
  it("既知のチャネルを日本語にする", () => {
    expect(formatChannel("organic_search")).toBe("検索");
    expect(formatChannel("campaign")).toBe("キャンペーン");
  });

  it("未知の値はそのまま返す", () => {
    expect(formatChannel("something_new")).toBe("something_new");
  });

  it("未設定は直接流入として扱う", () => {
    expect(formatChannel(null)).toBe("直接流入");
  });
});

describe("orDash", () => {
  it("空文字や空白だけならハイフン", () => {
    expect(orDash("")).toBe("-");
    expect(orDash("   ")).toBe("-");
    expect(orDash(null)).toBe("-");
  });

  it("値があればそのまま", () => {
    expect(orDash("www.google.com")).toBe("www.google.com");
  });
});
