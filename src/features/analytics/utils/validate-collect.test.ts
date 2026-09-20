import { REGION_BAND_COUNT } from "../constants";
import {
  MAX_EVENTS_PER_REQUEST,
  normalizeCollectRequest,
} from "./validate-collect";

const NOW = Date.parse("2026-09-18T10:00:00.000Z");

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const TAB_ID = "22222222-2222-4222-8222-222222222222";
const PAGE_VIEW_ID = "33333333-3333-4333-8333-333333333333";

function event(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "44444444-4444-4444-8444-444444444444",
    tabId: TAB_ID,
    seq: 1,
    pageViewId: PAGE_VIEW_ID,
    eventName: "page_view",
    occurredAt: new Date(NOW).toISOString(),
    pagePath: "/missions/test",
    ...overrides,
  };
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    session: {
      sessionId: SESSION_ID,
      startedAt: new Date(NOW).toISOString(),
      landingPath: "/",
      ...((overrides.session as object) ?? {}),
    },
    events: overrides.events ?? [event()],
  };
}

describe("normalizeCollectRequest", () => {
  it("正常なペイロードを通す", () => {
    const result = normalizeCollectRequest(body(), NOW);
    expect(result?.session.sessionId).toBe(SESSION_ID);
    expect(result?.events).toHaveLength(1);
    expect(result?.events[0].pagePath).toBe("/missions/test");
  });

  it("sessionId がUUIDでなければ受け付けない", () => {
    expect(
      normalizeCollectRequest(body({ session: { sessionId: "abc" } }), NOW),
    ).toBeNull();
  });

  it("イベントが空なら受け付けない", () => {
    expect(normalizeCollectRequest(body({ events: [] }), NOW)).toBeNull();
  });

  it("オブジェクトでないボディは受け付けない", () => {
    expect(normalizeCollectRequest(null, NOW)).toBeNull();
    expect(normalizeCollectRequest("x", NOW)).toBeNull();
  });

  it("壊れたイベントだけを捨て、残りは通す", () => {
    const result = normalizeCollectRequest(
      body({
        events: [
          event({ eventId: "broken" }),
          event({ eventId: "55555555-5555-4555-8555-555555555555" }),
        ],
      }),
      NOW,
    );
    expect(result?.events).toHaveLength(1);
    expect(result?.events[0].eventId).toBe(
      "55555555-5555-4555-8555-555555555555",
    );
  });

  it("1リクエストのイベント件数に上限をかける", () => {
    const events = Array.from({ length: MAX_EVENTS_PER_REQUEST + 10 }, (_, i) =>
      event({
        eventId: `66666666-6666-4666-8666-${String(i).padStart(12, "0")}`,
      }),
    );
    const result = normalizeCollectRequest(body({ events }), NOW);
    expect(result?.events).toHaveLength(MAX_EVENTS_PER_REQUEST);
  });

  it("スクロール到達率を0-100に丸める", () => {
    const result = normalizeCollectRequest(
      body({ events: [event({ scrollPct: 180, maxScrollPct: -20 })] }),
      NOW,
    );
    expect(result?.events[0].scrollPct).toBe(100);
    expect(result?.events[0].maxScrollPct).toBe(0);
  });

  it("端末時計が大きくずれた時刻は受信時刻に寄せる", () => {
    const result = normalizeCollectRequest(
      body({ events: [event({ occurredAt: "1999-01-01T00:00:00.000Z" })] }),
      NOW,
    );
    expect(result?.events[0].occurredAt).toBe(new Date(NOW).toISOString());
  });

  it("領域滞在の帯を必ず10個に揃える", () => {
    // サーバー側で REGION_BAND_COUNT が読めていないと空配列になり、
    // 「ページのどこを見ていたか」が丸ごと失われる（実際に踏んだ不具合）
    const result = normalizeCollectRequest(
      body({
        events: [
          event({
            eventName: "page_engagement",
            regionDwell: { bands: [1000, 2000, 3000], sections: [] },
          }),
        ],
      }),
      NOW,
    );
    expect(REGION_BAND_COUNT).toBe(10);
    expect(result?.events[0].regionDwell?.bands).toHaveLength(
      REGION_BAND_COUNT,
    );
    expect(result?.events[0].regionDwell?.bands.slice(0, 3)).toEqual([
      1000, 2000, 3000,
    ]);
    // 足りない分は0埋め
    expect(result?.events[0].regionDwell?.bands[9]).toBe(0);
  });

  it("帯が多すぎても10個に切る", () => {
    const result = normalizeCollectRequest(
      body({
        events: [
          event({
            eventName: "page_engagement",
            regionDwell: {
              bands: Array.from({ length: 30 }, () => 500),
              sections: [],
            },
          }),
        ],
      }),
      NOW,
    );
    expect(result?.events[0].regionDwell?.bands).toHaveLength(
      REGION_BAND_COUNT,
    );
  });

  it("セクションの滞在を受け取る", () => {
    const result = normalizeCollectRequest(
      body({
        events: [
          event({
            eventName: "page_engagement",
            regionDwell: {
              bands: [],
              sections: [
                {
                  key: "3:ランキング",
                  label: "ランキング",
                  top: 1820,
                  ms: 10592,
                },
                { key: "bad", ms: "x" },
              ],
            },
          }),
        ],
      }),
      NOW,
    );
    expect(result?.events[0].regionDwell?.sections).toEqual([
      { key: "3:ランキング", label: "ランキング", top: 1820, ms: 10592 },
    ]);
  });

  it("滞在がまったく無ければ領域滞在は付けない", () => {
    const result = normalizeCollectRequest(
      body({
        events: [
          event({
            eventName: "page_engagement",
            regionDwell: { bands: [0, 0, 0], sections: [] },
          }),
        ],
      }),
      NOW,
    );
    expect(result?.events[0].regionDwell).toBeNull();
  });

  it("巨大なpropsは切り詰めたことだけ残す", () => {
    const result = normalizeCollectRequest(
      body({ events: [event({ props: { blob: "x".repeat(5000) } })] }),
      NOW,
    );
    expect(result?.events[0].props).toEqual({ _truncated: true });
  });

  it("クライアントが送ってきた余計なキーは無視する", () => {
    const result = normalizeCollectRequest(
      body({
        session: { sessionId: SESSION_ID, visitorId: "spoofed", isBot: false },
      }),
      NOW,
    );
    expect(result?.session).not.toHaveProperty("visitorId");
    expect(result?.session).not.toHaveProperty("isBot");
  });
});
