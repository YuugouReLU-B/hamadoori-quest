import { render, screen } from "@testing-library/react";
import { getLotterySettings } from "@/features/lottery/services/lottery-settings";
import { generateLotteryToken } from "@/features/lottery/services/lottery-token";
import { getMyUserLevel } from "@/features/user-level/services/level";
import { LotteryEntryPanel } from "./lottery-entry-panel";

jest.mock("@/features/lottery/services/lottery-settings");
jest.mock("@/features/lottery/services/lottery-token");
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

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-09-13T14:59:59.999Z"));
  jest.mocked(getLotterySettings).mockResolvedValue({ ...settings });
  jest.mocked(getMyUserLevel).mockResolvedValue({
    user_id: "test-user-id",
    xp: 1000,
    line_1000pt_audience_added_at: null,
    season_id: "season-id",
    updated_at: "2026-09-01T00:00:00Z",
  });
  jest.mocked(generateLotteryToken).mockReturnValue("TEST-TOKEN");
});

afterEach(() => jest.useRealTimers());

it("日付未設定なら従来どおり閾値到達で応募できる", async () => {
  render(await LotteryEntryPanel());
  expect(screen.getByText("TEST-TOKEN")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: settings.button_label }),
  ).toHaveAttribute("href", settings.form_url);
});

it("開始直前はポイント達成済みでもトークンを表示しない", async () => {
  jest.mocked(getLotterySettings).mockResolvedValue({
    ...settings,
    eligible_display_from: "2026-09-14",
  });
  render(await LotteryEntryPanel());
  expect(
    screen.getByText("まだ応募できません（応募開始: 2026年9月14日〜）"),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Pで応募できます/)).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(generateLotteryToken).not.toHaveBeenCalled();
});

it.each([
  "2026-09-13T15:00:00Z",
  "2026-09-15T00:00:00Z",
])("日本時間の開始日0時以降は応募できる: %s", async (now) => {
  jest.setSystemTime(new Date(now));
  jest.mocked(getLotterySettings).mockResolvedValue({
    ...settings,
    eligible_display_from: "2026-09-14",
  });
  render(await LotteryEntryPanel());
  expect(screen.getByText("TEST-TOKEN")).toBeInTheDocument();
});

it.each([
  null,
  "2026-09-12",
  "2026-09-14",
])("ポイント不足は日付条件と別に表示する: %s", async (startDate) => {
  jest.mocked(getLotterySettings).mockResolvedValue({
    ...settings,
    threshold_points: 1500,
    eligible_display_from: startDate,
  });
  render(await LotteryEntryPanel());
  expect(screen.getByText(/500P/)).toBeInTheDocument();
  expect(generateLotteryToken).not.toHaveBeenCalled();
  if (startDate === "2026-09-14") {
    expect(screen.getByText(/まだ応募できません/)).toBeInTheDocument();
    expect(screen.queryByText(/Pで応募できます/)).not.toBeInTheDocument();
  }
});
