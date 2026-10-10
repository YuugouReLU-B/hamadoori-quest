import { render, screen } from "@testing-library/react";
import { getMissionCategoryView } from "@/features/missions/loaders/missions-loaders";
import { getUserMissionAchievements } from "@/features/user-achievements/loaders/achievements-loaders";
import type { Tables } from "@/lib/types/supabase";
import MissionsByCategory from "./missions-by-category";

jest.mock("@/features/missions/loaders/missions-loaders", () => ({
  getMissionCategoryView: jest.fn(),
}));
jest.mock("@/features/user-achievements/loaders/achievements-loaders", () => ({
  getUserMissionAchievements: jest.fn(),
}));
jest.mock("./mission-card", () => ({
  __esModule: true,
  default: ({
    mission,
    userAchievementCount,
  }: {
    mission: Tables<"missions">;
    userAchievementCount: number;
  }) => (
    <div data-testid={`mission-${mission.id}`}>
      {mission.title}:{userAchievementCount}
    </div>
  ),
}));
jest.mock("./horizontal-scroll-container", () => ({
  HorizontalScrollContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="horizontal-scroll">{children}</div>
  ),
}));
jest.mock("./missions-view-toggle", () => ({
  MissionsViewToggle: ({
    children,
    mapMissions,
    calendarMissions,
  }: {
    children: React.ReactNode;
    mapMissions: unknown[];
    calendarMissions: unknown[];
  }) => (
    <div>
      {children}
      <span data-testid="map-count">{mapMissions.length}</span>
      <span data-testid="calendar-count">{calendarMissions.length}</span>
    </div>
  ),
}));

function row(
  id: string,
  quest_category: Tables<"missions">["quest_category"],
  overrides = {},
): Tables<"mission_category_view"> {
  return {
    mission_id: id,
    category_id: "legacy",
    category_title: "旧カテゴリ",
    category_kbn: "PERMANENT",
    title: id,
    quest_category,
    event_category: null,
    latitude: null,
    longitude: null,
    event_date: null,
    ...overrides,
  } as Tables<"mission_category_view">;
}

describe("MissionsByCategory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(getUserMissionAchievements)
      .mockResolvedValue(new Map([["p", 2]]));
  });
  it("指定順に分類し重複を除き、達成済みを後ろに並べる", async () => {
    jest.mocked(getMissionCategoryView).mockResolvedValue([
      row("s", "SNS"),
      row("t", "SPECIAL_TOKYO", { event_date: "2099-10-01" }),
      row("h", "SPECIAL_HAMADORI", { latitude: 37, longitude: 140 }),
      row("p", "PERMANENT"),
      row("p2", "PERMANENT"),
      row("h", "SPECIAL_HAMADORI", {
        category_id: "another",
        latitude: 37,
        longitude: 140,
      }),
    ]);
    render(await MissionsByCategory({ userId: "user" }));
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((el) => el.textContent),
    ).toEqual([
      "特設クエスト(浜通り)",
      "特設クエスト(東京)",
      "常設クエスト",
      "SNS登録",
    ]);
    expect(screen.getAllByTestId("mission-h")).toHaveLength(1);
    expect(
      screen.getAllByTestId(/^mission-/).map((el) => el.textContent),
    ).toEqual(["h:0", "t:0", "p2:0", "p:2", "s:0"]);
    expect(screen.getAllByTestId("horizontal-scroll")).toHaveLength(4);
    expect(screen.getByTestId("map-count")).toHaveTextContent("1");
    expect(screen.getByTestId("calendar-count")).toHaveTextContent("1");
    expect(getUserMissionAchievements).toHaveBeenCalledWith("user");
  });
  it("空のグループは見出しごと表示しない", async () => {
    jest
      .mocked(getMissionCategoryView)
      .mockResolvedValue([row("p", "PERMANENT")]);
    render(await MissionsByCategory({}));
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
    expect(screen.queryByText("SNS登録")).not.toBeInTheDocument();
    expect(getUserMissionAchievements).not.toHaveBeenCalled();
  });
  it("データがない場合は空状態を表示する", async () => {
    jest.mocked(getMissionCategoryView).mockResolvedValue([]);
    render(await MissionsByCategory({}));
    expect(
      screen.getByText("クエストが見つかりませんでした"),
    ).toBeInTheDocument();
  });
});
