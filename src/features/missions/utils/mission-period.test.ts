import { hasEventEnded } from "./mission-period";

// 日本時間 2026-10-10 12:00
const NOON_JST = new Date("2026-10-10T12:00:00+09:00");

describe("hasEventEnded", () => {
  it("開催日を持たない常設クエストは終わらない", () => {
    expect(
      hasEventEnded({ event_date: null, event_end_date: null }, NOON_JST),
    ).toBe(false);
  });

  it("開催日が未来なら終わっていない", () => {
    expect(
      hasEventEnded(
        { event_date: "2026-10-11", event_end_date: null },
        NOON_JST,
      ),
    ).toBe(false);
  });

  it("開催当日はまだ終わっていない", () => {
    expect(
      hasEventEnded(
        { event_date: "2026-10-10", event_end_date: null },
        NOON_JST,
      ),
    ).toBe(false);
  });

  it("開催日を過ぎていれば終わっている", () => {
    expect(
      hasEventEnded(
        { event_date: "2026-10-09", event_end_date: null },
        NOON_JST,
      ),
    ).toBe(true);
  });

  describe("終了日がある場合は終了日で判定する", () => {
    it("会期中は終わっていない", () => {
      expect(
        hasEventEnded(
          { event_date: "2026-10-08", event_end_date: "2026-10-15" },
          NOON_JST,
        ),
      ).toBe(false);
    });

    it("最終日当日はまだ終わっていない", () => {
      expect(
        hasEventEnded(
          { event_date: "2026-10-08", event_end_date: "2026-10-10" },
          NOON_JST,
        ),
      ).toBe(false);
    });

    it("最終日を過ぎていれば終わっている", () => {
      expect(
        hasEventEnded(
          { event_date: "2026-10-02", event_end_date: "2026-10-09" },
          NOON_JST,
        ),
      ).toBe(true);
    });
  });

  describe("境界は日本時間の翌日0時", () => {
    it("最終日の23時59分はまだ終わっていない", () => {
      expect(
        hasEventEnded(
          { event_date: "2026-10-10", event_end_date: null },
          new Date("2026-10-10T23:59:59+09:00"),
        ),
      ).toBe(false);
    });

    it("翌日0時ちょうどで終わる", () => {
      expect(
        hasEventEnded(
          { event_date: "2026-10-10", event_end_date: null },
          new Date("2026-10-11T00:00:00+09:00"),
        ),
      ).toBe(true);
    });

    // UTCで判定すると日本時間の当日午前中に終了扱いになってしまう
    it("日本時間10/11の0時はUTCでは10/10の15時だが、終了と判定する", () => {
      expect(
        hasEventEnded(
          { event_date: "2026-10-10", event_end_date: null },
          new Date("2026-10-10T15:00:00Z"),
        ),
      ).toBe(true);
    });

    it("日本時間10/10の8時（UTC 10/9 23時）はまだ終わっていない", () => {
      expect(
        hasEventEnded(
          { event_date: "2026-10-10", event_end_date: null },
          new Date("2026-10-09T23:00:00Z"),
        ),
      ).toBe(false);
    });
  });
});
