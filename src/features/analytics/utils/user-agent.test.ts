import { isBotUserAgent, parseUserAgent } from "./user-agent";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const LINE_APP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/13.0.0";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

describe("parseUserAgent", () => {
  it("iPhone Safari を判定する", () => {
    expect(parseUserAgent(IPHONE_SAFARI)).toEqual({
      browser: "Safari",
      os: "iOS",
      deviceType: "mobile",
      isBot: false,
    });
  });

  it("Android Chrome を判定する", () => {
    expect(parseUserAgent(ANDROID_CHROME)).toEqual({
      browser: "Chrome",
      os: "Android",
      deviceType: "mobile",
      isBot: false,
    });
  });

  it("LINEアプリ内ブラウザを Safari ではなく LINE と判定する", () => {
    expect(parseUserAgent(LINE_APP).browser).toBe("LINE");
  });

  it("デスクトップを判定する", () => {
    expect(parseUserAgent(MAC_CHROME)).toEqual({
      browser: "Chrome",
      os: "macOS",
      deviceType: "desktop",
      isBot: false,
    });
  });

  it("iPad はタブレットとして扱う", () => {
    expect(parseUserAgent(IPAD).deviceType).toBe("tablet");
  });

  it("UAが無い場合は unknown かつボット扱い", () => {
    expect(parseUserAgent(null)).toEqual({
      browser: null,
      os: null,
      deviceType: "unknown",
      isBot: true,
    });
  });
});

describe("isBotUserAgent", () => {
  it("クローラを検出する", () => {
    expect(
      isBotUserAgent("Googlebot/2.1 (+http://www.google.com/bot.html)"),
    ).toBe(true);
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 ... HeadlessChrome/120.0.0.0 ...")).toBe(
      true,
    );
  });

  it("通常のブラウザはボットにしない", () => {
    expect(isBotUserAgent(IPHONE_SAFARI)).toBe(false);
    expect(isBotUserAgent(MAC_CHROME)).toBe(false);
  });

  it("LINEアプリ内ブラウザをボットにしない", () => {
    // このサービスの主要な流入経路なので、誤ってボット扱いすると
    // ダッシュボードから実トラフィックの大半が消える
    expect(isBotUserAgent(LINE_APP)).toBe(false);
  });
});
