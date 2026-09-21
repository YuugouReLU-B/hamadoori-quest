/**
 * @jest-environment jsdom
 */
import { flushAnalytics, trackEvent } from "./tracker";

/**
 * 計測は画面の付帯機能なので、何が起きても呼び出し元へ例外を伝播させない。
 * 実際に、fetch の無い環境で同期的な ReferenceError が投げられ、
 * カレンダーのクリックハンドラごと壊れる不具合を踏んだ。
 */
describe("trackEvent の耐障害性", () => {
  const originalFetch = global.fetch;
  const originalSendBeacon = navigator.sendBeacon;

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(navigator, "sendBeacon", {
      value: originalSendBeacon,
      configurable: true,
    });
    jest.useRealTimers();
  });

  it("fetch も sendBeacon も無い環境で投げない", () => {
    // @ts-expect-error 実行環境に fetch が無い状況を再現する
    global.fetch = undefined;
    Object.defineProperty(navigator, "sendBeacon", {
      value: undefined,
      configurable: true,
    });

    expect(() => {
      trackEvent("calendar_month_change", {
        props: { month: "2026-10" },
        immediate: true,
      });
    }).not.toThrow();
  });

  it("fetch が同期的に投げても伝播させない", () => {
    global.fetch = (() => {
      throw new Error("network is down");
    }) as unknown as typeof fetch;
    Object.defineProperty(navigator, "sendBeacon", {
      value: undefined,
      configurable: true,
    });

    expect(() => {
      trackEvent("click", { props: { label: "テスト" }, immediate: true });
    }).not.toThrow();
  });

  it("fetch が reject しても未処理の拒否にしない", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    Object.defineProperty(navigator, "sendBeacon", {
      value: undefined,
      configurable: true,
    });

    trackEvent("click", { props: { label: "テスト" }, immediate: true });
    // マイクロタスクを回して、未処理の拒否が起きないことを確かめる
    await Promise.resolve();
    expect(global.fetch).toHaveBeenCalled();
  });

  it("sendBeacon が失敗したら fetch に切り替える", () => {
    const fetchMock = jest.fn().mockResolvedValue(undefined);
    global.fetch = fetchMock as unknown as typeof fetch;
    Object.defineProperty(navigator, "sendBeacon", {
      value: jest.fn().mockReturnValue(false),
      configurable: true,
    });

    trackEvent("click", { props: { label: "テスト" }, immediate: true });

    expect(navigator.sendBeacon).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analytics/collect",
      expect.objectContaining({ method: "POST", keepalive: true }),
    );
  });

  it("flushAnalytics も投げない", () => {
    global.fetch = (() => {
      throw new Error("network is down");
    }) as unknown as typeof fetch;
    Object.defineProperty(navigator, "sendBeacon", {
      value: undefined,
      configurable: true,
    });

    trackEvent("click", { props: { label: "テスト" } });
    expect(() => flushAnalytics(true)).not.toThrow();
  });
});
