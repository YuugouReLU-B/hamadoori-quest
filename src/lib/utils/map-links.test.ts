import { googleMapsSearchUrl, questMapHref } from "./map-links";

describe("questMapHref", () => {
  it("Googleマップの共有URLがあれば座標より優先する", () => {
    expect(
      questMapHref("https://maps.app.goo.gl/abc", 37.3337454, 141.0194946),
    ).toBe("https://maps.app.goo.gl/abc");
  });

  it("共有URLが無ければ座標から検索URLを組む", () => {
    expect(questMapHref(null, 37.3337454, 141.0194946)).toBe(
      googleMapsSearchUrl(37.3337454, 141.0194946),
    );
  });

  it("空文字は未設定として扱う", () => {
    expect(questMapHref("", 37.3337454, 141.0194946)).toBe(
      googleMapsSearchUrl(37.3337454, 141.0194946),
    );
  });

  it("共有URLも座標も無ければ null を返す", () => {
    expect(questMapHref(null, null, null)).toBeNull();
    // 片方だけでは地図を開けない
    expect(questMapHref(undefined, 37.3337454, null)).toBeNull();
  });
});
