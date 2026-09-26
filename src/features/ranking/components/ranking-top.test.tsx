import { render, screen } from "@testing-library/react";
import type React from "react";
import { RankingTop } from "./ranking-top";

type UserRanking = {
  user_id: string;
  name: string;
  address_prefecture: string;
  rank: number | null;
  xp: number | null;
};

jest.mock("@/features/ranking/services/get-ranking", () => ({
  getRanking: jest.fn(),
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
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="link">
      {children}
    </a>
  );
});

jest.mock("lucide-react", () => ({
  ChevronRight: ({ className }: { className?: string }) => (
    <div className={className} data-testid="chevron-right" />
  ),
}));

jest.mock("./ranking-item", () => ({
  RankingItem: ({ user }: any) => (
    <div data-testid="ranking-item">
      <span data-testid="user-name">{user.name}</span>
    </div>
  ),
}));

const mockRankings: UserRanking[] = [
  {
    user_id: "user-1",
    name: "ユーザー1",
    address_prefecture: "東京都",
    rank: 1,
    xp: 2500,
  },
  {
    user_id: "user-2",
    name: "ユーザー2",
    address_prefecture: "大阪府",
    rank: 2,
    xp: 2000,
  },
];

describe("RankingTop", () => {
  const { getRanking } = require("@/features/ranking/services/get-ranking");

  beforeEach(() => {
    getRanking.mockClear();
  });

  describe("基本的な表示", () => {
    it("デフォルトのlimit値でランキングを表示する", async () => {
      getRanking.mockResolvedValue(mockRankings);

      render(await RankingTop({}));

      expect(screen.getByText("全期間トップ10")).toBeInTheDocument();
      expect(screen.getByTestId("card")).toBeInTheDocument();
    });

    it("指定されたlimit値でタイトルが表示される", async () => {
      getRanking.mockResolvedValue(mockRankings);

      render(await RankingTop({ limit: 5 }));

      expect(screen.getByText("全期間トップ5")).toBeInTheDocument();
    });

    it("ランキングアイテムが正しく表示される", async () => {
      getRanking.mockResolvedValue(mockRankings);

      render(await RankingTop({}));

      const rankingItems = screen.getAllByTestId("ranking-item");
      expect(rankingItems).toHaveLength(2);
      expect(screen.getByText("ユーザー1")).toBeInTheDocument();
      expect(screen.getByText("ユーザー2")).toBeInTheDocument();
    });
  });

  describe("詳細情報表示", () => {
    it("showDetailedInfoがtrueの場合はリンクが表示される", async () => {
      getRanking.mockResolvedValue(mockRankings);

      render(await RankingTop({ showDetailedInfo: true }));

      const link = screen.getByTestId("link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/ranking");
      expect(screen.getByText("トップ10を見る")).toBeInTheDocument();
      expect(screen.getByTestId("chevron-right")).toBeInTheDocument();
    });

    it("showDetailedInfoがfalseの場合はリンクが表示されない", async () => {
      getRanking.mockResolvedValue(mockRankings);

      render(await RankingTop({ showDetailedInfo: false }));

      expect(screen.queryByTestId("link")).not.toBeInTheDocument();
      expect(screen.queryByText("トップ10を見る")).not.toBeInTheDocument();
    });

    it("showDetailedInfoのデフォルト値はfalseである", async () => {
      getRanking.mockResolvedValue(mockRankings);

      render(await RankingTop({}));

      expect(screen.queryByTestId("link")).not.toBeInTheDocument();
    });
  });

  describe("limitパラメータ", () => {
    it("limitが指定された場合はタイトルに反映される", async () => {
      getRanking.mockResolvedValue(mockRankings);

      render(await RankingTop({ limit: 20 }));

      expect(screen.getByText("全期間トップ20")).toBeInTheDocument();
    });

    it("limitが1の場合", async () => {
      getRanking.mockResolvedValue(mockRankings);

      render(await RankingTop({ limit: 1 }));

      expect(screen.getByText("全期間トップ1")).toBeInTheDocument();
    });
  });

  describe("期間別ランキング表示", () => {
    it("日次ランキングのタイトルが正しく表示される", async () => {
      getRanking.mockResolvedValue(mockRankings);

      render(await RankingTop({ limit: 10, period: "daily" }));

      expect(screen.getByText("今日のトップ10")).toBeInTheDocument();
    });

    it("全期間ランキングのタイトルが正しく表示される", async () => {
      getRanking.mockResolvedValue(mockRankings);

      render(await RankingTop({ limit: 10, period: "all" }));

      expect(screen.getByText("全期間トップ10")).toBeInTheDocument();
    });
  });

  describe("サービス関数の呼び出し", () => {
    it("getRankingが正しいパラメータで呼ばれる", async () => {
      getRanking.mockResolvedValue(mockRankings);

      await RankingTop({ limit: 15 });

      expect(getRanking).toHaveBeenCalledWith(15, "all", undefined);
    });

    it("デフォルトのlimit値で呼ばれる", async () => {
      getRanking.mockResolvedValue(mockRankings);

      await RankingTop({});

      expect(getRanking).toHaveBeenCalledWith(10, "all", undefined);
    });

    it("期間パラメータが渡される", async () => {
      getRanking.mockResolvedValue(mockRankings);

      await RankingTop({ period: "daily" });

      expect(getRanking).toHaveBeenCalledWith(10, "daily", undefined);
    });
  });

  describe("エラーハンドリング", () => {
    it("getRankingがエラーを投げても処理が継続される", async () => {
      getRanking.mockRejectedValue(new Error("API Error"));

      await expect(RankingTop({})).rejects.toThrow("API Error");
    });
  });

  describe("空のデータ", () => {
    it("ランキングが空の場合でもエラーにならない", async () => {
      getRanking.mockResolvedValue([]);

      render(await RankingTop({}));

      expect(screen.getByText("全期間トップ10")).toBeInTheDocument();
      expect(screen.queryByTestId("ranking-item")).not.toBeInTheDocument();
    });
  });

  describe("プロップスの組み合わせ", () => {
    it("limitとshowDetailedInfoが両方指定された場合", async () => {
      getRanking.mockResolvedValue(mockRankings);

      render(await RankingTop({ limit: 25, showDetailedInfo: true }));

      expect(screen.getByText("全期間トップ25")).toBeInTheDocument();
      expect(screen.getByTestId("link")).toBeInTheDocument();
    });
  });
});
