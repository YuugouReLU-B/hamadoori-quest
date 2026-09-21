import {
  CHANNEL_LABELS,
  classifyChannel,
  extractHost,
  parseUtmParams,
} from "./attribution";

describe("extractHost", () => {
  it("URLからホスト名を小文字で取り出す", () => {
    expect(extractHost("https://WWW.Google.com/search?q=x")).toBe(
      "www.google.com",
    );
  });

  it("URLとして壊れている値や空はnullを返す", () => {
    expect(extractHost("not a url")).toBeNull();
    expect(extractHost("")).toBeNull();
    expect(extractHost(null)).toBeNull();
    expect(extractHost(undefined)).toBeNull();
  });
});

describe("classifyChannel", () => {
  it("参照元が無ければ直接流入", () => {
    expect(classifyChannel({})).toBe("direct");
    expect(classifyChannel({ referrer: null })).toBe("direct");
  });

  it("検索エンジンからの流入を organic_search にする", () => {
    expect(classifyChannel({ referrer: "https://www.google.com/" })).toBe(
      "organic_search",
    );
    expect(classifyChannel({ referrer: "https://search.yahoo.co.jp/" })).toBe(
      "organic_search",
    );
  });

  it("SNSからの流入を social にする", () => {
    expect(classifyChannel({ referrer: "https://t.co/abc" })).toBe("social");
    expect(classifyChannel({ referrer: "https://liff.line.me/x" })).toBe(
      "social",
    );
  });

  it("検索エンジン名を含むだけの別ドメインは referral 扱いにする", () => {
    // google.evil.com を検索エンジンと誤判定しないこと
    expect(classifyChannel({ referrer: "https://google.evil.com/" })).toBe(
      "referral",
    );
  });

  it("自サイトからの遷移は internal にする", () => {
    expect(
      classifyChannel({
        referrer: "https://quest.example.jp/missions/a",
        currentHost: "quest.example.jp",
      }),
    ).toBe("internal");
  });

  it("キャンペーンコードや紹介コードがあれば参照元より優先する", () => {
    expect(
      classifyChannel({
        referrer: "https://www.google.com/",
        campaignCode: "caravan01",
      }),
    ).toBe("campaign");
    expect(classifyChannel({ referralCode: "abc123" })).toBe("campaign");
  });

  it("utm_medium からチャネルを決める", () => {
    expect(classifyChannel({ utmMedium: "cpc" })).toBe("campaign");
    expect(classifyChannel({ utmMedium: "Organic" })).toBe("organic_search");
    expect(classifyChannel({ utmMedium: "social" })).toBe("social");
  });

  it("未知の utm_medium でも意図的な流入として campaign にする", () => {
    expect(classifyChannel({ utmMedium: "flyer" })).toBe("campaign");
  });

  it("判定できない外部サイトは referral にする", () => {
    expect(classifyChannel({ referrer: "https://example.com/blog" })).toBe(
      "referral",
    );
  });
});

describe("parseUtmParams", () => {
  it("utm_* を取り出す", () => {
    const result = parseUtmParams(
      "utm_source=line&utm_medium=social&utm_campaign=spring&utm_term=quest&utm_content=banner",
    );
    expect(result).toEqual({
      utmSource: "line",
      utmMedium: "social",
      utmCampaign: "spring",
      utmTerm: "quest",
      utmContent: "banner",
    });
  });

  it("空文字や未指定は null にする", () => {
    expect(parseUtmParams("utm_source=&foo=bar")).toEqual({
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
    });
  });

  it("長すぎる値は255文字に丸める", () => {
    const long = "a".repeat(300);
    expect(parseUtmParams(`utm_source=${long}`).utmSource).toHaveLength(255);
  });
});

describe("CHANNEL_LABELS", () => {
  it("すべてのチャネルに日本語表示名がある", () => {
    expect(Object.keys(CHANNEL_LABELS).sort()).toEqual([
      "campaign",
      "direct",
      "internal",
      "organic_search",
      "referral",
      "social",
    ]);
  });
});
