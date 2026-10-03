import { type CalendarItem, layoutWeek } from "./calendar-week-layout";

// 2026年10月は木曜始まり。月曜始まりの週で並べる
const OCTOBER = new Date(2026, 9, 1);

function week(mondayDate: number, month = 9): Date[] {
  return Array.from(
    { length: 7 },
    (_, i) => new Date(2026, month, mondayDate + i),
  );
}

function item(
  name: string,
  start: number,
  end: number = start,
): CalendarItem<string> {
  return {
    item: name,
    start: new Date(2026, 9, start),
    end: new Date(2026, 9, end),
  };
}

describe("layoutWeek", () => {
  it("連続する日を1本の帯につなぐ", () => {
    const { segments, overflowByCol } = layoutWeek(
      week(12),
      [item("サーフィン", 12, 15)],
      OCTOBER,
      2,
    );
    expect(segments).toEqual([
      {
        item: "サーフィン",
        startCol: 0,
        span: 4,
        lane: 0,
        continuesBefore: false,
        continuesAfter: false,
      },
    ]);
    expect(overflowByCol).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("週をまたぐ帯は週ごとに切り、続きであることを示す", () => {
    const items = [item("サーフィン", 8, 15)];

    const first = layoutWeek(week(5), items, OCTOBER, 2).segments[0];
    expect(first).toMatchObject({
      startCol: 3,
      span: 4,
      continuesBefore: false,
      continuesAfter: true,
    });

    const second = layoutWeek(week(12), items, OCTOBER, 2).segments[0];
    expect(second).toMatchObject({
      startCol: 0,
      span: 4,
      continuesBefore: true,
      continuesAfter: false,
    });
  });

  it("重なる帯は下の段へ送り、重ならなければ同じ段に並べる", () => {
    const { segments } = layoutWeek(
      week(5),
      [item("単発", 10), item("サーフィン", 8, 11), item("前半", 5, 6)],
      OCTOBER,
      2,
    );
    expect(
      segments.map(({ item, lane, startCol }) => [item, lane, startCol]),
    ).toEqual([
      ["前半", 0, 0],
      ["サーフィン", 0, 3],
      ["単発", 1, 5],
    ]);
  });

  it("段に収まらない帯は出さず、日ごとの件数だけ数える", () => {
    const { segments, overflowByCol } = layoutWeek(
      week(5),
      [
        item("サーフィン", 8, 11),
        item("A", 10),
        item("B", 10),
        item("C", 10, 11),
      ],
      OCTOBER,
      2,
    );
    expect(segments.map(({ item }) => item)).toEqual(["サーフィン", "C"]);
    expect(overflowByCol).toEqual([0, 0, 0, 0, 0, 2, 0]);
  });

  it("表示月の外のマスには帯を引かない", () => {
    // 9/28(月)〜10/4(日) の週。10月を表示中なので木曜(10/1)から引く
    const { segments } = layoutWeek(
      week(28, 8),
      [
        {
          item: "月またぎ",
          start: new Date(2026, 8, 29),
          end: new Date(2026, 9, 2),
        },
        {
          item: "9月だけ",
          start: new Date(2026, 8, 30),
          end: new Date(2026, 8, 30),
        },
      ],
      OCTOBER,
      2,
    );
    expect(segments).toEqual([
      {
        item: "月またぎ",
        startCol: 3,
        span: 2,
        lane: 0,
        continuesBefore: true,
        continuesAfter: false,
      },
    ]);
  });
});
