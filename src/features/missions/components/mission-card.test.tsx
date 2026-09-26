import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import type { Tables } from "@/lib/types/supabase";
import Mission from "./mission-card";

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar">{children}</div>
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src: string; alt: string }) => (
    // biome-ignore lint/performance/noImgElement: テスト用モックのため<img>を使用
    <img src={src} alt={alt} data-testid="avatar-image" />
  ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardFooter: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="card-footer">
      {children}
    </div>
  ),
  CardHeader: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} data-testid="card-header">
      {children}
    </div>
  ),
  CardTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <h3 className={className} data-testid="card-title">
      {children}
    </h3>
  ),
}));

jest.mock("@/features/missions/components/difficulty-badge", () => ({
  DifficultyBadge: ({
    difficulty,
    className,
  }: {
    difficulty: number;
    points: number;
    className?: string;
  }) => (
    <span className={className} data-testid="difficulty-badge">
      難易度{difficulty}
    </span>
  ),
}));

jest.mock("@/features/missions/components/mission-icon", () => ({
  MissionIcon: ({ src, alt }: { src: string; alt: string }) => (
    // biome-ignore lint/performance/noImgElement: テスト用モックのため<img>を使用
    <img src={src} alt={alt} data-testid="mission-icon" />
  ),
}));

jest.mock("lucide-react", () => ({
  MapPin: ({ className }: { className?: string }) => (
    <div className={className} data-testid="map-pin-icon" />
  ),
}));

const mockMission: Tables<"missions"> = {
  id: "test-mission-1",
  slug: "test-mission-1",
  title: "テストミッション",
  content: "テストミッションの内容",
  difficulty: 1,
  points: 50,
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
  max_achievement_count: 3,
  is_featured: false,
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

describe("Mission", () => {
  it.each([
    ["SPOT", "spot.png"],
    ["SPORTS", "sports.png"],
    ["ART", "art.png"],
    ["FOOD", "food.png"],
    ["MIXED", "mixed-event.png"],
  ] as const)("%sの固定アイコンを表示する", (event_category, filename) => {
    render(
      <Mission
        mission={{ ...mockMission, event_category, icon_url: null }}
        userAchievementCount={0}
      />,
    );
    expect(screen.getByTestId("mission-icon")).toHaveAttribute(
      "src",
      `/img/quest-icons/${filename}`,
    );
  });
  it("ミッション情報が正しく表示される", () => {
    render(<Mission mission={mockMission} userAchievementCount={0} />);

    expect(screen.getByText("テストミッション")).toBeInTheDocument();
    expect(screen.getByText("50pt")).toBeInTheDocument();
  });

  it.each([
    0, 1, 3,
  ])("達成回数%sでも報酬・状態と詳細リンクを分離する", (count) => {
    render(<Mission mission={mockMission} userAchievementCount={count} />);

    const link = screen.getByRole("link", { name: "詳細を見る" });
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(link).not.toContainElement(screen.getByText("50pt"));
    if (count === 3) {
      expect(link).not.toContainElement(screen.getByText("クリア済み"));
    } else {
      expect(screen.queryByText("クリア済み")).not.toBeInTheDocument();
    }
  });

  it.each([
    0, 1, 3,
  ])("達成回数%sでもTabは1回だけ停止しEnterで詳細リンクを起動する", async (count) => {
    const user = userEvent.setup();
    render(<Mission mission={mockMission} userAchievementCount={count} />);
    const link = screen.getByRole("link");
    const activate = jest.fn((event: Event) => event.preventDefault());
    link.addEventListener("click", activate);

    await user.tab();
    expect(link).toHaveFocus();
    expect(link).toHaveAttribute("href", "/missions/test-mission-1");
    expect(link).not.toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Enter}");
    expect(activate).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it("slugがなければIDで詳細に遷移する", () => {
    render(
      <Mission
        mission={{ ...mockMission, slug: "" }}
        userAchievementCount={0}
      />,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/missions/${mockMission.id}`,
    );
  });

  it.each([
    ["POSTER", "1枚あたり400pt"],
    ["POSTING", "1枚あたり50pt"],
  ] as const)("%sでは1枚あたりの報酬を表示する", (type, reward) => {
    render(
      <Mission
        mission={{ ...mockMission, required_artifact_type: type }}
        userAchievementCount={0}
      />,
    );
    expect(screen.getByText(reward)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "詳細を見る" }),
    ).toBeInTheDocument();
  });

  it("イベント日付が正しく表示される", () => {
    render(<Mission mission={mockMission} userAchievementCount={0} />);

    expect(screen.getByText("6月22日（日）開催")).toBeInTheDocument();
  });

  it("最大達成回数に達した場合の表示が正しい", () => {
    render(<Mission mission={mockMission} userAchievementCount={3} />);

    expect(screen.getByText("クリア済み")).toBeInTheDocument();
  });

  it("最大達成回数が設定されていない場合は制限なし", () => {
    const missionWithoutLimit = { ...mockMission, max_achievement_count: null };

    render(<Mission mission={missionWithoutLimit} userAchievementCount={5} />);

    expect(screen.getByText("50pt")).toBeInTheDocument();
  });

  it("icon_urlが設定されていればイベントカテゴリより優先して使用", () => {
    const missionWithIcon = {
      ...mockMission,
      event_category: null,
      icon_url: "/test-icon.svg",
    };

    render(<Mission mission={missionWithIcon} userAchievementCount={0} />);

    const missionIcon = document.querySelector("img");
    expect(missionIcon?.getAttribute("src")).toBe("/test-icon.svg");
  });

  it("icon_urlもイベントカテゴリも未設定ならフォールバック画像を使用", () => {
    const missionWithoutIcon = {
      ...mockMission,
      event_category: null,
      icon_url: null,
    };

    render(<Mission mission={missionWithoutIcon} userAchievementCount={0} />);

    const missionIcon = document.querySelector("img");
    expect(missionIcon?.getAttribute("src")).toContain("mission_fallback.svg");
  });

  it("tag1が設定されている場合は地域チップが表示される", () => {
    const missionWithTag = { ...mockMission, tag1: "いわき市" };

    render(<Mission mission={missionWithTag} userAchievementCount={0} />);

    expect(screen.getByText("いわき市")).toBeInTheDocument();
    expect(screen.getByTestId("map-pin-icon")).toBeInTheDocument();
    const tagBadge = screen.getByText("いわき市").parentElement;
    expect(tagBadge).toHaveClass("rounded-full", "border");
    expect(tagBadge?.parentElement?.children).toHaveLength(1);
  });

  it("両方のタグ・カテゴリのアイコン・報酬と状態・詳細リンクが共存する", () => {
    const missionWithTags = {
      ...mockMission,
      tag1: "いわき市",
      tag2: "地域交流",
      event_category: "FOOD" as const,
      icon_url: null,
    };

    render(<Mission mission={missionWithTags} userAchievementCount={3} />);

    expect(screen.getByTestId("mission-icon")).toHaveAttribute(
      "src",
      "/img/quest-icons/food.png",
    );
    const link = screen.getByRole("link", { name: "詳細を見る" });
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(link).not.toContainElement(screen.getByText("50pt"));
    expect(link).not.toContainElement(screen.getByText("クリア済み"));

    const tag1Badge = screen.getByText("いわき市").parentElement;
    const tag2Badge = screen.getByText("地域交流").parentElement;
    expect(tag1Badge).toHaveClass("rounded-full", "border");
    expect(tag2Badge).toHaveClass("rounded-full", "border");
    expect(tag1Badge?.parentElement).toBe(tag2Badge?.parentElement);
    expect(screen.getByTestId("map-pin-icon").parentElement).toBe(tag1Badge);
  });

  it("tag1がnullでもtag2のチップは表示される", () => {
    const missionWithTag2 = { ...mockMission, tag2: "地域交流" };

    render(<Mission mission={missionWithTag2} userAchievementCount={0} />);

    expect(screen.getByText("地域交流")).toBeInTheDocument();
    expect(screen.queryByTestId("map-pin-icon")).not.toBeInTheDocument();
    const tagBadge = screen.getByText("地域交流").parentElement;
    expect(tagBadge).toHaveClass("rounded-full", "border");
    expect(tagBadge?.parentElement?.children).toHaveLength(1);
  });

  it("tag1とtag2が両方nullの場合はチップ群が表示されない", () => {
    render(<Mission mission={mockMission} userAchievementCount={0} />);

    expect(screen.queryByTestId("map-pin-icon")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-footer").children).toHaveLength(2);
    expect(
      screen.getByTestId("card-footer").firstElementChild,
    ).toContainElement(screen.getByText("50pt"));
    expect(screen.getByTestId("card-footer").lastElementChild).toBe(
      screen.getByRole("link"),
    );
  });

  it("イベント日付がnullの場合は日付表示なし", () => {
    const missionWithoutDate = { ...mockMission, event_date: null };

    render(<Mission mission={missionWithoutDate} userAchievementCount={0} />);

    expect(screen.queryByText(/開催/)).not.toBeInTheDocument();
  });
});
