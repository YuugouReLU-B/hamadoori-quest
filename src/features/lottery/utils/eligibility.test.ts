import { getLotteryState, isBeforeOpenDate } from "./eligibility";

/** 2026-11-02T00:00:00+09:00 ちょうど */
const OPEN_AT = new Date("2026-11-02T00:00:00+09:00");
/** 2026-11-29T23:59:59.999+09:00（終了日当日の終わり） */
const UNTIL_LAST_MS = new Date("2026-11-29T23:59:59.999+09:00");
/** 2026-11-30T00:00:00+09:00 ちょうど（終了日の翌日0時） */
const CLOSED_AT = new Date("2026-11-30T00:00:00+09:00");

const base = {
  points: 1000,
  thresholdPoints: 1000,
  eligibleDisplayFrom: "2026-11-02",
  eligibleDisplayUntil: "2026-11-29",
};

describe("isBeforeOpenDate", () => {
  test("開始日0時JSTちょうどは開始前ではない", () => {
    expect(isBeforeOpenDate("2026-11-02", OPEN_AT)).toBe(false);
  });

  test("開始日0時JSTの1ミリ秒前は開始前", () => {
    expect(
      isBeforeOpenDate("2026-11-02", new Date(OPEN_AT.getTime() - 1)),
    ).toBe(true);
  });

  test("開始日を十分に過ぎていれば開始前ではない", () => {
    expect(
      isBeforeOpenDate("2026-11-02", new Date("2026-11-10T12:00:00+09:00")),
    ).toBe(false);
  });

  test("開始日がnullなら常に開始前ではない", () => {
    expect(isBeforeOpenDate(null, new Date("2000-01-01T00:00:00+09:00"))).toBe(
      false,
    );
  });

  test("nowを省略すると現在時刻で判定する", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(OPEN_AT.getTime() - 1));
    expect(isBeforeOpenDate("2026-11-02")).toBe(true);

    jest.setSystemTime(OPEN_AT);
    expect(isBeforeOpenDate("2026-11-02")).toBe(false);
    jest.useRealTimers();
  });
});

describe("getLotteryState", () => {
  describe("開始日の境界", () => {
    test("開始日0時JSTの1ミリ秒前は before_open", () => {
      expect(
        getLotteryState({ ...base, now: new Date(OPEN_AT.getTime() - 1) }),
      ).toBe("before_open");
    });

    test("開始日0時JSTちょうどは open", () => {
      expect(getLotteryState({ ...base, now: OPEN_AT })).toBe("open");
    });
  });

  describe("終了日の境界", () => {
    test("終了日当日23:59:59.999 JSTは open", () => {
      expect(getLotteryState({ ...base, now: UNTIL_LAST_MS })).toBe("open");
    });

    test("終了日の翌日0時JSTちょうどは closed", () => {
      expect(getLotteryState({ ...base, now: CLOSED_AT })).toBe("closed");
    });
  });

  describe("判定の優先順位", () => {
    test("ポイント未達成でも応募期間終了後は closed", () => {
      expect(getLotteryState({ ...base, points: 0, now: CLOSED_AT })).toBe(
        "closed",
      );
    });

    test("ポイント未達成かつ開始日前は not_eligible", () => {
      expect(
        getLotteryState({
          ...base,
          points: 0,
          now: new Date(OPEN_AT.getTime() - 1),
        }),
      ).toBe("not_eligible");
    });

    test("ポイントがしきい値ちょうどなら達成とみなす", () => {
      expect(getLotteryState({ ...base, points: 1000, now: OPEN_AT })).toBe(
        "open",
      );
    });

    test("ポイントが1でも足りなければ not_eligible", () => {
      expect(getLotteryState({ ...base, points: 999, now: OPEN_AT })).toBe(
        "not_eligible",
      );
    });
  });

  describe("日付がnullの場合", () => {
    test("開始日nullなら before_open にならない", () => {
      expect(
        getLotteryState({
          ...base,
          eligibleDisplayFrom: null,
          now: new Date("2000-01-01T00:00:00+09:00"),
        }),
      ).toBe("open");
    });

    test("終了日nullなら closed にならない", () => {
      expect(
        getLotteryState({
          ...base,
          eligibleDisplayUntil: null,
          now: new Date("2099-12-31T23:59:59+09:00"),
        }),
      ).toBe("open");
    });

    test("開始日・終了日ともnullならポイント条件のみで判定する", () => {
      const params = {
        ...base,
        eligibleDisplayFrom: null,
        eligibleDisplayUntil: null,
        now: new Date("2026-11-10T12:00:00+09:00"),
      };
      expect(getLotteryState({ ...params, points: 1000 })).toBe("open");
      expect(getLotteryState({ ...params, points: 0 })).toBe("not_eligible");
    });
  });

  test("nowを省略すると現在時刻で判定する", () => {
    jest.useFakeTimers();
    jest.setSystemTime(CLOSED_AT);
    expect(
      getLotteryState({
        points: base.points,
        thresholdPoints: base.thresholdPoints,
        eligibleDisplayFrom: base.eligibleDisplayFrom,
        eligibleDisplayUntil: base.eligibleDisplayUntil,
      }),
    ).toBe("closed");
    jest.useRealTimers();
  });
});
