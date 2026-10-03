import { fireEvent, render, screen, within } from "@testing-library/react";
import { MissionsCalendarView } from "./missions-calendar-view";
import type { TaggedMission } from "./missions-tags";

jest.unmock("lucide-react");

function event(
  id: string,
  date: string | null,
  endDate: string | null = null,
): TaggedMission {
  return {
    mission: {
      id,
      slug: id,
      title: id,
      content: "イベントの詳細",
      event_date: date,
      event_end_date: endDate,
      event_type: null,
      quest_category: "SPECIAL_HAMADORI",
      event_category: null,
      region: null,
      address: null,
      google_map_url: null,
      difficulty: 1,
      points: 50,
      latitude: null,
      longitude: null,
      radius_meters: null,
      icon_url: null,
      max_achievement_count: 1,
      is_featured: false,
      is_hidden: false,
      featured_importance: null,
      required_artifact_type: "NONE",
      artifact_label: null,
      supplement: null,
      tag1: null,
      tag2: null,
      tag3: null,
      ogp_image_url: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    userAchievementCount: 0,
    achieved: false,
    questType: "特設クエスト",
    kind: "イベント",
    region: "浜通り",
  };
}

describe("MissionsCalendarView", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 14, 12));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("空の月から最も早い次の開催月へ移動し、その日を選択する", () => {
    render(
      <MissionsCalendarView
        missions={[
          event("年明け", "2027-01-10"),
          event("月末", "2026-10-31"),
          event("次回", "2026-10-01"),
          event("過去", "2026-08-31"),
        ]}
      />,
    );

    expect(screen.getByText("今月の開催なし")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /次の開催日へ/ }));

    expect(screen.getByText("2026年10月")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "2026年10月1日（木）の開催 1件" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("今月の開催なし")).not.toBeInTheDocument();
  });

  it("年をまたぐ次回開催へ移動できる", () => {
    jest.setSystemTime(new Date(2026, 11, 14, 12));
    render(<MissionsCalendarView missions={[event("次回", "2027-02-01")]} />);
    fireEvent.click(screen.getByRole("button", { name: /次の開催日へ/ }));
    expect(screen.getByText("2027年2月")).toBeInTheDocument();
  });

  it("後続の開催がなければ移動ボタンを表示しない", () => {
    render(<MissionsCalendarView missions={[event("過去", "2026-08-31")]} />);
    expect(screen.getByText("今月の開催なし")).toBeInTheDocument();
    expect(
      screen.getByText("この月より後の開催予定はありません"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /次の開催日へ/ }),
    ).not.toBeInTheDocument();
  });

  it("選択日の件数と詳細を分け、残りの日程を近い順で表示する", () => {
    render(
      <MissionsCalendarView
        missions={[
          event("遠い開催", "2026-11-10"),
          event("同日A", "2026-09-20"),
          event("近い開催", "2026-09-21"),
          event("同日B", "2026-09-20"),
        ]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "2026年9月20日（日）、2件の開催" }),
    );

    const selected = screen.getByRole("region", {
      name: "2026年9月20日（日）の開催 2件",
    });
    expect(within(selected).getAllByRole("article")).toHaveLength(2);
    expect(within(selected).getByText("同日A")).toBeInTheDocument();
    expect(within(selected).getByText("同日B")).toBeInTheDocument();
    const others = screen.getByRole("region", { name: "その他の日程 2件" });
    expect(within(others).getAllByRole("article")[0]).toHaveTextContent(
      "近い開催",
    );
    expect(within(others).getAllByRole("article")[1]).toHaveTextContent(
      "遠い開催",
    );
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(
      screen.getByRole("button", { name: "2026年9月20日（日）、2件の開催" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("スマホ用の件数バッジを表示し、タイトルの帯はPC用にする", () => {
    render(
      <MissionsCalendarView
        missions={[
          event("同日A", "2026-09-20"),
          event("同日B", "2026-09-20"),
          event("同日C", "2026-09-20"),
        ]}
      />,
    );
    const day = screen.getByRole("button", {
      name: "2026年9月20日（日）、3件の開催",
    });
    expect(within(day).getByText("3件")).toHaveClass("md:hidden");
    const bars = screen.getAllByTestId("calendar-event-bar");
    expect(bars.map((bar) => bar.textContent)).toEqual(["同日A", "同日B"]);
    for (const bar of bars) {
      expect(bar).toHaveClass("hidden", "md:block");
    }
    expect(screen.getByText("他1件")).toHaveClass("hidden", "md:block");
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("連続する日のイベントは1本の帯につなぎ、週をまたぐと週ごとに分ける", () => {
    render(
      <MissionsCalendarView
        missions={[
          // 9/17(木)〜9/22(火)。月曜始まりなので 17〜20 と 21〜22 の2本になる
          event("連続開催", "2026-09-17", "2026-09-22"),
          event("単発", "2026-09-25"),
        ]}
      />,
    );
    const bars = screen.getAllByTestId("calendar-event-bar");
    expect(bars.map((bar) => bar.textContent)).toEqual([
      "連続開催",
      "連続開催",
      "単発",
    ]);
    // 続く側は角を落とし、始まり・終わりの側だけ丸める
    expect(bars[0]).toHaveClass("rounded-l");
    expect(bars[0]).not.toHaveClass("rounded-r");
    expect(bars[1]).toHaveClass("rounded-r");
    expect(bars[1]).not.toHaveClass("rounded-l");
    expect(bars[2]).toHaveClass("rounded-l", "rounded-r");
  });

  it("月の切り替えで選択を解除し、表示月に応じた空状態を示す", () => {
    render(<MissionsCalendarView missions={[event("開催", "2026-09-20")]} />);
    fireEvent.click(
      screen.getByRole("button", { name: "2026年9月20日（日）、1件の開催" }),
    );
    expect(
      screen.queryByRole("heading", { name: /その他の日程/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "次の月" }));
    expect(screen.getByText("この月の開催なし")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /9月20日/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "前の月" }));
    expect(screen.getByText("2026年9月")).toBeInTheDocument();
    expect(screen.queryByText("今月の開催なし")).not.toBeInTheDocument();
  });

  it("日付未選択では今日から近い順に全件を表示する", () => {
    render(
      <MissionsCalendarView
        missions={[
          event("遠い開催", "2026-11-10"),
          event("近い開催", "2026-09-15"),
          event("日付なし", null),
        ]}
      />,
    );
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getAllByRole("article")[0]).toHaveTextContent("近い開催");
    expect(screen.queryByText("日付なし")).not.toBeInTheDocument();
  });

  it("複数日にまたがるイベントを開始日から終了日までの全マスに出す", () => {
    render(
      <MissionsCalendarView
        missions={[event("連続開催", "2026-09-19", "2026-09-21")]}
      />,
    );
    for (const day of [19, 20, 21]) {
      expect(
        screen.getByRole("button", {
          name: `2026年9月${day}日（${["土", "日", "月"][day - 19]}）、1件の開催`,
        }),
      ).toBeEnabled();
    }
    expect(
      screen.getByRole("button", { name: "2026年9月22日（火）、0件の開催" }),
    ).toBeDisabled();
  });

  it("期間の中日を選んでも「その他の日程」に重複させない", () => {
    render(
      <MissionsCalendarView
        missions={[
          event("連続開催", "2026-09-19", "2026-09-21"),
          event("単発", "2026-09-25"),
        ]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "2026年9月20日（日）、1件の開催" }),
    );

    const selected = screen.getByRole("region", {
      name: "2026年9月20日（日）の開催 1件",
    });
    expect(within(selected).getByText("連続開催")).toBeInTheDocument();
    const others = screen.getByRole("region", { name: "その他の日程 1件" });
    expect(within(others).getByText("単発")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("開催中の長期イベントを今日に最も近いものとして先に並べる", () => {
    render(
      <MissionsCalendarView
        missions={[
          event("明日だけ", "2026-09-15"),
          event("開催中", "2026-09-01", "2026-09-30"),
        ]}
      />,
    );
    expect(screen.getAllByRole("article")[0]).toHaveTextContent("開催中");
  });

  it("終了日が開始日より前の不正データは開始日だけ表示する", () => {
    render(
      <MissionsCalendarView
        missions={[event("逆転", "2026-09-20", "2026-09-18")]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "2026年9月20日（日）、1件の開催" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "2026年9月18日（金）、0件の開催" }),
    ).toBeDisabled();
  });

  it("同じ日をもう一度押すと選択を解除する", () => {
    render(<MissionsCalendarView missions={[event("開催", "2026-09-20")]} />);
    const day = screen.getByRole("button", {
      name: "2026年9月20日（日）、1件の開催",
    });
    fireEvent.click(day);
    expect(day).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(day);
    expect(day).toHaveAttribute("aria-pressed", "false");
  });

  it("カレンダーの外を押すと選択を解除する", () => {
    render(<MissionsCalendarView missions={[event("開催", "2026-09-20")]} />);
    const day = screen.getByRole("button", {
      name: "2026年9月20日（日）、1件の開催",
    });
    fireEvent.click(day);
    expect(day).toHaveAttribute("aria-pressed", "true");
    fireEvent.pointerDown(document.body);
    expect(day).toHaveAttribute("aria-pressed", "false");
  });

  it("クエスト一覧を押しても選択を解除しない（詳細へ進めるようにする）", () => {
    render(
      <MissionsCalendarView
        missions={[event("開催", "2026-09-20"), event("別日", "2026-09-25")]}
      />,
    );
    const day = screen.getByRole("button", {
      name: "2026年9月20日（日）、1件の開催",
    });
    fireEvent.click(day);

    const selected = screen.getByRole("region", {
      name: "2026年9月20日（日）の開催 1件",
    });
    fireEvent.pointerDown(within(selected).getByRole("link"));
    expect(day).toHaveAttribute("aria-pressed", "true");

    const others = screen.getByRole("region", { name: "その他の日程 1件" });
    fireEvent.pointerDown(within(others).getByRole("link"));
    expect(day).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    [],
    [event("日付なし", null)],
  ])("開催日付きのクエストがなければ案内を表示する (%j)", (...missions) => {
    render(<MissionsCalendarView missions={missions} />);
    expect(
      screen.getByText("開催日が設定された特設クエストがありません"),
    ).toBeInTheDocument();
  });
});
