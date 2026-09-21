import {
  isStorableIp,
  resolveClientIp,
  resolveRequestContext,
} from "./request-context";

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

describe("resolveClientIp", () => {
  it("x-forwarded-for の先頭を使う", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178",
    });
    expect(resolveClientIp(headers)).toBe("203.0.113.5");
  });

  it("x-forwarded-for が無ければ x-real-ip を使う", () => {
    expect(resolveClientIp(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe(
      "198.51.100.7",
    );
  });

  it("どちらも無ければ null", () => {
    expect(resolveClientIp(new Headers())).toBeNull();
  });

  it("INETに入らない値は採用しない", () => {
    // これを通すとINSERT全体がキャスト失敗で落ち、イベントがまとめて失われる
    expect(
      resolveClientIp(new Headers({ "x-forwarded-for": "unknown" })),
    ).toBeNull();
    expect(
      resolveClientIp(new Headers({ "x-forwarded-for": "203.0.113.5:443" })),
    ).toBeNull();
    expect(
      resolveClientIp(new Headers({ "x-forwarded-for": "999.1.1.1" })),
    ).toBeNull();
  });

  it("壊れた x-forwarded-for でも x-real-ip に退避する", () => {
    expect(
      resolveClientIp(
        new Headers({
          "x-forwarded-for": "unknown",
          "x-real-ip": "198.51.100.7",
        }),
      ),
    ).toBe("198.51.100.7");
  });
});

describe("isStorableIp", () => {
  it("IPv4を受け付ける", () => {
    expect(isStorableIp("203.0.113.5")).toBe(true);
    expect(isStorableIp("0.0.0.0")).toBe(true);
    expect(isStorableIp("255.255.255.255")).toBe(true);
  });

  it("IPv6を受け付ける", () => {
    expect(isStorableIp("2001:db8::1")).toBe(true);
    expect(isStorableIp("::1")).toBe(true);
    expect(isStorableIp("::ffff:203.0.113.5")).toBe(true);
  });

  it("IPv6のゾーンIDは受け付けない（INETが解釈できない）", () => {
    expect(isStorableIp("fe80::1%eth0")).toBe(false);
  });

  it("IPでない文字列を弾く", () => {
    expect(isStorableIp("unknown")).toBe(false);
    expect(isStorableIp("")).toBe(false);
    expect(isStorableIp("203.0.113")).toBe(false);
    expect(isStorableIp("256.0.0.1")).toBe(false);
  });
});

describe("resolveRequestContext", () => {
  it("Vercel の地域ヘッダを読む", () => {
    const context = resolveRequestContext(
      new Headers({
        "user-agent": CHROME_UA,
        "x-forwarded-for": "203.0.113.5",
        "x-vercel-ip-country": "JP",
        "x-vercel-ip-country-region": "07",
        "x-vercel-ip-city": "Iwaki",
        "x-vercel-ip-latitude": "37.0505",
        "x-vercel-ip-longitude": "140.8878",
      }),
    );

    expect(context).toMatchObject({
      ipAddress: "203.0.113.5",
      ipCountry: "JP",
      ipRegion: "07",
      ipCity: "Iwaki",
      ipLatitude: 37.0505,
      ipLongitude: 140.8878,
      browser: "Chrome",
      os: "macOS",
      deviceType: "desktop",
      isBot: false,
    });
  });

  it("Cloudflare の地域ヘッダにも対応する", () => {
    const context = resolveRequestContext(
      new Headers({
        "user-agent": CHROME_UA,
        "cf-ipcountry": "JP",
        "cf-ipcity": "Tokyo",
      }),
    );
    expect(context.ipCountry).toBe("JP");
    expect(context.ipCity).toBe("Tokyo");
  });

  it("URIエンコードされた市区町村名をデコードする", () => {
    const context = resolveRequestContext(
      new Headers({ "x-vercel-ip-city": encodeURIComponent("いわき市") }),
    );
    expect(context.ipCity).toBe("いわき市");
  });

  it("不正なエスケープが来ても落ちずに生の値を使う", () => {
    const context = resolveRequestContext(
      new Headers({ "x-vercel-ip-city": "%E0%A4%A" }),
    );
    expect(context.ipCity).toBe("%E0%A4%A");
  });

  it("数値でない緯度経度は無視する", () => {
    const context = resolveRequestContext(
      new Headers({ "x-vercel-ip-latitude": "unknown" }),
    );
    expect(context.ipLatitude).toBeNull();
  });

  it("ヘッダが無い場合はUAなしとしてボット扱いになる", () => {
    const context = resolveRequestContext(new Headers());
    expect(context.isBot).toBe(true);
    expect(context.ipAddress).toBeNull();
  });
});
