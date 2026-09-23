import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getRanking } from "../loaders/ranking-loaders";
import type { UserRanking } from "../types/ranking-types";
import RankingSection from "./ranking-section";
import { RankingTop } from "./ranking-top";

jest.unmock("lucide-react");

jest.mock("../loaders/ranking-loaders", () => ({
  getRanking: jest.fn(),
}));

jest.mock("./ranking-top", () => ({
  RankingTop: jest.fn(),
}));

const renderRankingSection = async (dailyCount: number, allCount: number) => {
  const createRankings = (count: number, period: string): UserRanking[] =>
    Array.from({ length: count }, (_, index) => ({
      user_id: `${period}-${index}`,
      name: `${period}の参加者${index + 1}`,
      address_prefecture: null,
      rank: index + 1,
      level: 1,
      xp: 100,
      updated_at: null,
    }));

  jest
    .mocked(getRanking)
    .mockImplementation(async (_limit, period) =>
      period === "daily"
        ? createRankings(dailyCount, "今日")
        : createRankings(allCount, "全期間"),
    );

  // Resolve the server components before rendering the real tabs in jsdom.
  const { RankingTop: ServerRankingTop } =
    jest.requireActual<typeof import("./ranking-top")>("./ranking-top");
  const daily = await ServerRankingTop({
    limit: 3,
    period: "daily",
    title: "今日のトップ3",
  });
  const all = await ServerRankingTop({ limit: 3, title: "全期間トップ3" });
  jest.mocked(RankingTop).mockImplementation(
    ({ period }) =>
      // React renders the already resolved server output synchronously in this test.
      (period === "daily" ? daily : all) as unknown as ReturnType<
        typeof RankingTop
      >,
  );

  render(await RankingSection());
};

describe("RankingSection", () => {
  it.each([
    [0, 3],
    [1, 3],
    [3, 0],
    [3, 1],
    [3, 3],
    [0, 0],
  ])("今日%d人・全期間%d人で選択中のランキングだけを表示する", async (daily, all) => {
    const user = userEvent.setup();
    await renderRankingSection(daily, all);

    const checkPanel = (label: string, count: number) => {
      expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
      const panel = screen.getByRole("tabpanel", { name: label });
      expect(within(panel).queryAllByRole("link")).toHaveLength(count);
      if (count === 0) {
        expect(within(panel).getByText("まだ達成者がいません")).toBeVisible();
      } else {
        expect(within(panel).queryByText("まだ達成者がいません")).toBeNull();
      }
    };

    expect(screen.getByRole("tab", { name: "今日" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    checkPanel("今日", daily);
    expect(screen.queryByText("全期間トップ3")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "全期間" }));
    checkPanel("全期間", all);
    expect(screen.queryByText("今日のトップ3")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "今日" }));
    checkPanel("今日", daily);
    expect(
      screen.getByRole("link", { name: "トップ10を見る" }),
    ).toHaveAttribute("href", "/ranking");
    expect(getRanking).toHaveBeenCalledWith(3, "daily", undefined);
    expect(getRanking).toHaveBeenCalledWith(3, "all", undefined);
  });

  it("キーボードで期間を切り替えられる", async () => {
    const user = userEvent.setup();
    await renderRankingSection(1, 3);

    await user.tab();
    expect(screen.getByRole("tab", { name: "今日" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "全期間" })).toHaveFocus();
    expect(screen.getByRole("tabpanel", { name: "全期間" })).toBeVisible();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tabpanel", { name: "今日" })).toBeVisible();
  });
});
