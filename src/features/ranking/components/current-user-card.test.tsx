import { render, screen } from "@testing-library/react";
import type React from "react";
import { CurrentUserCard } from "./current-user-card";

const mockUserName = jest.fn(({ name }: { name: string }) => (
  <span data-testid="user-name">{name}</span>
));

jest.mock("@/components/common/user-name", () => ({
  UserName: (props: unknown) => mockUserName(props as { name: string }),
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

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
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <h2 className={className} data-testid="card-title">
      {children}
    </h2>
  ),
}));

jest.mock("@/features/ranking/utils/ranking-utils", () => ({
  formatUserDisplayName: (name: string) => name || "名前未設定",
  formatUserPrefecture: (prefecture: string) => prefecture || "未設定",
}));

jest.mock("lucide-react", () => ({
  User: ({ className }: { className?: string }) => (
    <div className={className} data-testid="user-icon" />
  ),
}));

const mockUser = {
  user_id: "test-user-1",
  name: "テストユーザー",
  address_prefecture: "東京都",
  rank: 5,
  xp: 2500,
  updated_at: "2024-01-01T00:00:00Z",
  party_membership: {
    plan: "starter" as const,
    badge_visibility: true,
    user_id: "test-user-1",
    synced_at: "2024-01-01T00:00:00Z",
    metadata: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
} as any;

describe("CurrentUserCard", () => {
  beforeEach(() => {
    mockUserName.mockClear();
  });

  describe("基本的な表示", () => {
    it("ユーザー情報が正しく表示される", () => {
      render(<CurrentUserCard currentUser={mockUser} />);

      expect(screen.getByText("テストユーザー")).toBeInTheDocument();
      // 都道府県は表示しなくなった
      expect(screen.queryByText("東京都")).not.toBeInTheDocument();
      expect(screen.queryByText(/^Lv\./)).not.toBeInTheDocument();
      expect(screen.getByText("2500pt")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(mockUserName).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "テストユーザー",
        }),
      );
    });

    it("タイトルが正しく表示される", () => {
      render(<CurrentUserCard currentUser={mockUser} />);

      expect(screen.getByText("あなたのランク")).toBeInTheDocument();
      expect(screen.getByTestId("user-icon")).toBeInTheDocument();
    });

    it("レベルバッジを表示しない", () => {
      render(<CurrentUserCard currentUser={mockUser} />);

      expect(screen.queryByText(/^Lv\./)).not.toBeInTheDocument();
    });
  });

  describe("null値の処理", () => {
    it("currentUserがnullの場合は何も表示されない", () => {
      const { container } = render(<CurrentUserCard currentUser={null} />);

      expect(container.firstChild).toBeNull();
    });

    it("rankがnullの場合は0が表示される", () => {
      const user = { ...mockUser, rank: null };
      render(<CurrentUserCard currentUser={user} />);

      const rankElement = screen.getByText("0");
      expect(rankElement).toBeInTheDocument();
    });

    it("xpがnullの場合は0ptが表示される", () => {
      const user = { ...mockUser, xp: null };
      render(<CurrentUserCard currentUser={user} />);

      expect(screen.getByText("0pt")).toBeInTheDocument();
    });
  });

  describe("コンポーネント構造", () => {
    it("カードの構造が正しい", () => {
      render(<CurrentUserCard currentUser={mockUser} />);

      expect(screen.getByTestId("card-header")).toBeInTheDocument();
      expect(screen.getByTestId("card-content")).toBeInTheDocument();
      expect(screen.getByTestId("card-title")).toBeInTheDocument();
    });
  });

  describe("データフォーマット", () => {
    it("XPが正しくフォーマットされる", () => {
      const user = { ...mockUser, xp: 123456 };
      render(<CurrentUserCard currentUser={user} />);

      expect(screen.getByText("123456pt")).toBeInTheDocument();
    });

    it("大きな数値も正しくフォーマットされる", () => {
      const user = { ...mockUser, xp: 1000000 };
      render(<CurrentUserCard currentUser={user} />);

      expect(screen.getByText("1000000pt")).toBeInTheDocument();
    });
  });

  describe("エッジケース", () => {
    it("空文字列の名前が処理される", () => {
      const user = { ...mockUser, name: "" };
      render(<CurrentUserCard currentUser={user} />);

      expect(screen.getByText("名前未設定")).toBeInTheDocument();
    });

    it("空文字列の都道府県が処理される", () => {
      const user = { ...mockUser, address_prefecture: "" };
      render(<CurrentUserCard currentUser={user} />);

      // 都道府県は表示しなくなった
      expect(screen.queryByText("未設定")).not.toBeInTheDocument();
    });

    it("負の値のランクが処理される", () => {
      const user = { ...mockUser, rank: -1 };
      render(<CurrentUserCard currentUser={user} />);

      expect(screen.getByText("-1")).toBeInTheDocument();
    });
  });
});
