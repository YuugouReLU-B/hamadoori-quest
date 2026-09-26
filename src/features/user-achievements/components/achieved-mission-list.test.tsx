import { render, screen } from "@testing-library/react";
import type React from "react";
import type { AchievedMission } from "@/features/user-achievements/services/achievements";
import { AchievedMissionList } from "./achieved-mission-list";

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
}));

function makeMission(
  overrides: Partial<AchievedMission> = {},
): AchievedMission {
  return {
    missionId: "mission-1",
    slug: "test-mission",
    title: "テストクエスト",
    count: 1,
    achievedAt: "2026-09-26T00:00:00.000Z",
    isHidden: false,
    ...overrides,
  };
}

describe("AchievedMissionList", () => {
  it("達成が無いときは案内文を出す", () => {
    render(<AchievedMissionList missions={[]} />);

    expect(
      screen.getByText("まだ達成したクエストはありません。"),
    ).toBeInTheDocument();
  });

  it("公開クエストは詳細ページへのリンクになる", () => {
    render(<AchievedMissionList missions={[makeMission()]} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/missions/test-mission");
    expect(screen.getByText("テストクエスト")).toBeInTheDocument();
  });

  // 非公開クエストの詳細ページは notFound() になるため、リンクにすると
  // 紹介された側の達成（referred-signup）をタップした人が404に落ちる
  it("非公開クエストはリンクにしない", () => {
    render(
      <AchievedMissionList
        missions={[makeMission({ isHidden: true, slug: "referred-signup" })]}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    // タイトルと日付の表示自体は公開クエストと同じ
    expect(screen.getByText("テストクエスト")).toBeInTheDocument();
  });

  it("非公開クエストではホバーの演出を付けない", () => {
    const { rerender } = render(
      <AchievedMissionList missions={[makeMission({ isHidden: false })]} />,
    );
    expect(screen.getByTestId("card").className).toContain("hover:shadow-md");

    rerender(
      <AchievedMissionList missions={[makeMission({ isHidden: true })]} />,
    );
    expect(screen.getByTestId("card").className).not.toContain(
      "hover:shadow-md",
    );
  });

  it("同じクエストを複数回達成していると回数を出す", () => {
    render(<AchievedMissionList missions={[makeMission({ count: 3 })]} />);

    expect(screen.getByText(/（3回）/)).toBeInTheDocument();
  });
});
