import { pickSuggestedEvent } from "./pick-suggested-event";

// 日本時間 2026-10-11 12:00
const NOW = new Date("2026-10-11T12:00:00+09:00");

const m = (
  title: string,
  event_date: string | null = null,
  event_end_date: string | null = null,
) => ({ title, event_date, event_end_date });

describe("pickSuggestedEvent", () => {
  it("候補が無ければ null", () => {
    expect(pickSuggestedEvent([], NOW)).toBeNull();
  });

  it("終わったイベントは出さない", () => {
    expect(
      pickSuggestedEvent([m("終了", "2026-10-03", "2026-10-04")], NOW),
    ).toBeNull();
  });

  it("開催中 → 開催前 → 常設スポットの順に選ぶ", () => {
    const spot = m("あスポット");
    const upcoming = m("開催前", "2026-10-18");
    const ongoing = m("開催中", "2026-10-08", "2026-10-16");
    expect(pickSuggestedEvent([spot, upcoming, ongoing], NOW)).toBe(ongoing);
    expect(pickSuggestedEvent([spot, upcoming], NOW)).toBe(upcoming);
    expect(pickSuggestedEvent([spot], NOW)).toBe(spot);
  });

  it("開催中どうしは終わりが近い方を選ぶ", () => {
    const later = m("あ", "2026-10-08", "2026-10-16");
    const sooner = m("い", "2026-10-10", "2026-10-11");
    expect(pickSuggestedEvent([later, sooner], NOW)).toBe(sooner);
  });

  it("開催前どうしは開催日が近い方を選ぶ", () => {
    const far = m("あ", "2026-11-15");
    const near = m("い", "2026-10-18");
    expect(pickSuggestedEvent([far, near], NOW)).toBe(near);
  });

  it("常設スポットどうしはタイトル順", () => {
    const b = m("ノーマ");
    const a = m("タートル");
    expect(pickSuggestedEvent([b, a], NOW)).toBe(a);
  });
});
