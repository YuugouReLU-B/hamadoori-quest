import { render, screen, within } from "@testing-library/react";
import type { Tables } from "@/lib/types/supabase";
import { MissionDetails } from "./mission-details";

jest.mock("@/lib/utils/date-formatters", () => ({
  dateFormatter: jest.fn(
    (date: Date) =>
      `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
  ),
}));

const mockMission: Tables<"missions"> = {
  id: "test-mission-1",
  slug: "test-mission-1",
  title: "テストミッション",
  content: "<p>テストミッションの<strong>詳細</strong>内容</p>",
  difficulty: 2,
  points: 100,
  latitude: null,
  longitude: null,
  radius_meters: null,
  icon_url: "/test-icon.svg",
  quest_category: "PERMANENT",
  event_category: null,
  region: null,
  address: null,
  google_map_url: null,
  event_date: "2025-06-22",
  max_achievement_count: null,
  is_featured: true,
  is_hidden: false,
  featured_importance: null,
  required_artifact_type: "NONE",
  artifact_label: null,
  supplement: null,
  tag1: null,
  tag2: null,
  tag3: null,
  event_end_date: null,
  event_type: null,
  ogp_image_url: null,
  created_at: "2025-06-22T00:00:00Z",
  updated_at: "2025-06-22T00:00:00Z",
};

describe("MissionDetails", () => {
  it("来訪に必要な情報を同じ概要欄に表示する", () => {
    render(
      <MissionDetails
        mission={{
          ...mockMission,
          latitude: 37.5,
          longitude: 141,
          required_artifact_type: "GEO_CHECKIN",
          points: 1500,
          event_end_date: "2025-06-24",
          content: "営業時間: 10時-19時（水曜定休）",
          supplement: "事前予約が必要です。",
        }}
      />,
    );

    expect(screen.getByText("テストミッション")).toBeInTheDocument();
    const summary = within(
      screen.getByRole("region", { name: "クエスト概要" }),
    );
    expect(summary.getByText("日程：")).toBeInTheDocument();
    expect(summary.getByText("2025年6月22日")).toBeInTheDocument();
    expect(summary.getByText("2025年6月24日")).toBeInTheDocument();
    expect(summary.getByText("1500pt")).toBeInTheDocument();
    expect(screen.queryByText("達成条件")).not.toBeInTheDocument();
    expect(
      summary.getByText("営業時間: 10時-19時（水曜定休）"),
    ).toBeInTheDocument();
    expect(summary.getByText("事前予約が必要です。")).toBeInTheDocument();
    const mapLink = summary.getByRole("link", { name: /Googleマップ/ });
    expect(mapLink).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=37.5,141",
    );
    expect(mapLink).toHaveAttribute("target", "_blank");
    expect(mapLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("アイコンが表示される", () => {
    render(<MissionDetails mission={mockMission} />);

    const icon = screen.getByAltText("テストミッション");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("src", "/test-icon.svg");
  });

  it("アイコンがない場合は表示されない", () => {
    const missionWithoutIcon = { ...mockMission, icon_url: null };

    render(<MissionDetails mission={missionWithoutIcon} />);

    expect(screen.queryByAltText("テストミッション")).not.toBeInTheDocument();
  });

  it("未設定の場所・開催日・補足は表示しない", () => {
    const missionWithoutDate = { ...mockMission, event_date: null };

    render(<MissionDetails mission={missionWithoutDate} />);

    expect(screen.queryByText("2025年6月22日")).not.toBeInTheDocument();
    expect(screen.queryByText("日程：")).not.toBeInTheDocument();
    expect(screen.queryByText("場所：")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Googleマップ/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("補足")).not.toBeInTheDocument();
  });

  it("ミッション内容がHTMLとして表示される", () => {
    render(<MissionDetails mission={mockMission} />);

    const contentElement = document.querySelector(".mission-content");
    expect(contentElement).toBeInTheDocument();
    expect(contentElement?.innerHTML).toBe(
      "<p>テストミッションの<strong>詳細</strong>内容</p>",
    );
  });

  it("ミッション内容がnullの場合でもエラーにならない", () => {
    const missionWithoutContent = { ...mockMission, content: null };

    render(<MissionDetails mission={missionWithoutContent} />);

    const contentElement = document.querySelector(".mission-content");
    expect(contentElement).not.toBeInTheDocument();
    expect(screen.queryByText("内容")).not.toBeInTheDocument();
  });

  it("地域とタグがチップで表示される", () => {
    render(
      <MissionDetails
        mission={{
          ...mockMission,
          region: "IWAKI",
          tag1: "海沿い",
          tag2: "家族向け",
        }}
      />,
    );

    expect(screen.getByText("いわき市")).toBeInTheDocument();
    expect(screen.getByText("海沿い")).toBeInTheDocument();
    expect(screen.getByText("家族向け")).toBeInTheDocument();
  });

  it("住所とgoogle_map_urlがあれば住所自体がGoogleマップへのリンクになる", () => {
    render(
      <MissionDetails
        mission={{
          ...mockMission,
          address: "福島県いわき市平字田町１",
          google_map_url: "https://maps.app.goo.gl/example",
        }}
      />,
    );

    const link = screen.getByRole("link", { name: "福島県いわき市平字田町１" });
    expect(link).toHaveAttribute("href", "https://maps.app.goo.gl/example");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("獲得ポイントが概要欄の一番下に表示される", () => {
    render(<MissionDetails mission={mockMission} />);

    const items = screen.getAllByRole("term");
    expect(items.at(-1)).toHaveTextContent("獲得ポイント");
  });
});
