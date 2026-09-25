import type { User } from "@supabase/supabase-js";
import { render, screen } from "@testing-library/react";
import { getLotterySettings } from "@/features/lottery/services/lottery-settings";
import { getMyUserLevel } from "@/features/user-level/services/level";
import { getUser } from "@/features/user-profile/services/profile";
import { LotteryProgressBar } from "./lottery-progress-bar";

jest.mock("@/features/lottery/services/lottery-settings");
jest.mock("@/features/user-level/services/level", () => ({
  getMyUserLevel: jest.fn(),
}));

const settings = {
  id: "default",
  threshold_points: 1000,
  eligible_display_from: null as string | null,
  eligible_display_until: null as string | null,
  title: "プレゼント抽選応募",
  description: "抽選のご案内",
  button_label: "応募フォームを開く",
  form_url: "https://example.com/entry",
  updated_at: "2026-09-01T00:00:00Z",
};

/** 指定ポイントのユーザーレベルを返すようにモックする。 */
function mockPoints(xp: number) {
  jest.mocked(getMyUserLevel).mockResolvedValue({
    user_id: "test-user-id",
    level: 2,
    xp,
    last_notified_level: null,
    line_1000pt_audience_added_at: null,
    season_id: "season-id",
    updated_at: "2026-09-01T00:00:00Z",
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // JST 2026/11/10 9:00
  jest.setSystemTime(new Date("2026-11-10T00:00:00Z"));
  // getUser は jest.setup.js のグローバルモック。clearAllMocks で実装が消える
  // わけではないが、テストごとの上書きが漏れないよう明示的に戻す。
  jest.mocked(getUser).mockResolvedValue({
    id: "test-user-id",
    email: "test@example.com",
  } as unknown as User);
  jest.mocked(getLotterySettings).mockResolvedValue({ ...settings });
  mockPoints(1000);
});

afterEach(() => jest.useRealTimers());

it("ポイント未達成なら固定文言と進捗バーを表示する", async () => {
  mockPoints(100);
  const { container } = render(await LotteryProgressBar());

  expect(
    screen.getByText(
      "期間中に1,000pt集めると、浜通りの産品が当たる抽選に応募可能！",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("/ 1,000 pt")).toBeInTheDocument();
  expect(screen.getByText(/あと/)).toBeInTheDocument();
  expect(screen.getByText("900")).toBeInTheDocument();
  expect(container.querySelector("progress")).toBeInTheDocument();
});

it("達成済みでフォーム未オープンなら日付入りの案内だけを表示する", async () => {
  jest.mocked(getLotterySettings).mockResolvedValue({
    ...settings,
    eligible_display_from: "2026-11-16",
  });
  const { container } = render(await LotteryProgressBar());

  expect(screen.getByText("プレゼント応募条件達成！")).toBeInTheDocument();
  expect(
    screen.getByText(
      "応募フォームは11/16(月)にオープンします。しばらくお待ちください。",
    ),
  ).toBeInTheDocument();
  expect(container.querySelector("progress")).not.toBeInTheDocument();
  expect(screen.queryByText(/1,000 pt/)).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

it("応募受付中はマイページへのリンクと応募期間を表示する", async () => {
  jest.mocked(getLotterySettings).mockResolvedValue({
    ...settings,
    eligible_display_from: "2026-11-02",
    eligible_display_until: "2026-11-29",
  });
  const { container } = render(await LotteryProgressBar());

  expect(screen.getByText("プレゼント応募条件達成！")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "プレゼント応募はこちらから" }),
  ).toHaveAttribute("href", "/users/test-user-id");
  expect(screen.getByText("応募期間：2026/11/02~11/29")).toBeInTheDocument();
  expect(container.querySelector("progress")).not.toBeInTheDocument();
  expect(screen.queryByText(/1,000 pt/)).not.toBeInTheDocument();
});

it("応募受付中でも終了日が未設定なら応募期間を表示しない", async () => {
  jest.mocked(getLotterySettings).mockResolvedValue({
    ...settings,
    eligible_display_from: "2026-11-02",
    eligible_display_until: null,
  });
  render(await LotteryProgressBar());

  expect(
    screen.getByRole("link", { name: "プレゼント応募はこちらから" }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/応募期間/)).not.toBeInTheDocument();
});

it.each([
  100, 1000,
])("応募期間終了後はポイントに関係なく終了メッセージだけを表示する: %sP", async (xp) => {
  mockPoints(xp);
  jest.mocked(getLotterySettings).mockResolvedValue({
    ...settings,
    eligible_display_from: "2026-11-02",
    eligible_display_until: "2026-11-09",
  });
  const { container } = render(await LotteryProgressBar());

  expect(screen.getByText("応募期間は終了しました")).toBeInTheDocument();
  expect(container.querySelector("progress")).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.queryByText(/応募条件達成/)).not.toBeInTheDocument();
  expect(screen.queryByText(/1,000 pt/)).not.toBeInTheDocument();
});

it("未ログインなら何も表示しない", async () => {
  jest.mocked(getUser).mockResolvedValue(null);
  expect(await LotteryProgressBar()).toBeNull();
});

it("開始日前でもnullを返さず描画する", async () => {
  jest.mocked(getLotterySettings).mockResolvedValue({
    ...settings,
    eligible_display_from: "2026-11-16",
  });
  expect(await LotteryProgressBar()).not.toBeNull();
});
