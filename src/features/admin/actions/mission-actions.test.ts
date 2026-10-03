import { requireAdmin } from "@/features/admin/services/authorize-admin";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createMission, updateMission } from "./mission-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/features/admin/services/authorize-admin", () => ({
  requireAdmin: jest.fn(),
}));
jest.mock("@/features/admin/services/admin-categories", () => ({
  setMissionCategories: jest.fn().mockResolvedValue({ error: null }),
  copyMissionCategories: jest.fn(),
}));
jest.mock("@/features/qr-spot/services/qr-code", () => ({
  issueQrCode: jest.fn(),
}));

const insert = jest.fn().mockResolvedValue({ error: null });
const eq = jest.fn().mockResolvedValue({ error: null });
const update = jest.fn((_data: Record<string, unknown>) => ({ eq }));
let currentArtifactType = "GEO_CHECKIN";
const single = jest.fn(() =>
  Promise.resolve({
    data: { required_artifact_type: currentArtifactType },
    error: null,
  }),
);
const select = jest.fn(() => ({ eq: jest.fn(() => ({ single })) }));
const from = jest.fn(() => ({ insert, update, select }));

function form(
  quest = "SPECIAL_TOKYO",
  event = "FOOD",
  artifactType = "GEO_CHECKIN",
) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    slug: "test-quest",
    title: "テスト",
    required_artifact_type: artifactType,
    latitude: "37.4",
    longitude: "140.9",
    radius_meters: "300",
    difficulty: "1",
    points: "50",
    quest_category: quest,
    event_category: event,
    icon_url: "https://old.example/icon.png",
  }))
    data.set(key, value);
  return data;
}

describe("mission category actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentArtifactType = "GEO_CHECKIN";
    jest
      .mocked(requireAdmin)
      .mockResolvedValue({ id: "admin" } as Awaited<
        ReturnType<typeof requireAdmin>
      >);
    jest
      .mocked(createAdminClient)
      .mockReturnValue({ from } as unknown as ReturnType<
        typeof createAdminClient
      >);
  });
  it("新規作成時に分類を保存し、旧画像入力を無視する", async () => {
    expect(await createMission(form())).toMatchObject({ success: true });
    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        quest_category: "SPECIAL_TOKYO",
        event_category: "FOOD",
      }),
    );
    expect(insert.mock.calls[0][0]).not.toHaveProperty("icon_url");
  });
  it("更新時にイベントカテゴリを未設定に戻せる", async () => {
    expect(await updateMission("m1", form("SNS", ""))).toMatchObject({
      success: true,
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ quest_category: "SNS", event_category: null }),
    );
    expect(update.mock.calls[0][0]).not.toHaveProperty("icon_url");
    expect(eq).toHaveBeenCalledWith("id", "m1");
  });
  it.each([
    ["", ""],
    ["INVALID", ""],
    ["PERMANENT", "INVALID"],
  ])("不正な分類(%s, %s)はDBに書き込まない", async (quest, event) => {
    expect(await createMission(form(quest, event))).toMatchObject({
      success: false,
    });
    expect(from).not.toHaveBeenCalled();
  });
  it.each([
    "LINE_FRIEND",
    "REFERRAL",
    "QR",
  ])("新規作成では %s のクエストを作れない", async (artifactType) => {
    expect(
      await createMission(form("PERMANENT", "", artifactType)),
    ).toMatchObject({ success: false });
    expect(insert).not.toHaveBeenCalled();
  });
  it("既存クエストは今の種別（LINE友だち）のまま保存できる", async () => {
    currentArtifactType = "LINE_FRIEND";
    expect(
      await updateMission("m1", form("SNS", "", "LINE_FRIEND")),
    ).toMatchObject({ success: true });
    expect(update).toHaveBeenCalled();
  });
  it("既存クエストの種別を位置情報チェックイン以外に変えることはできない", async () => {
    currentArtifactType = "GEO_CHECKIN";
    expect(
      await updateMission("m1", form("SNS", "", "LINE_FRIEND")),
    ).toMatchObject({ success: false });
    expect(update).not.toHaveBeenCalled();
  });
  it("管理者認可に失敗するとDBに書き込まない", async () => {
    jest.mocked(requireAdmin).mockRejectedValueOnce(new Error("権限なし"));
    await expect(updateMission("m1", form())).rejects.toThrow("権限なし");
    expect(from).not.toHaveBeenCalled();
  });
});
