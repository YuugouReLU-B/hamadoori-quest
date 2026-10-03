import { ARTIFACT_TYPES } from "@/lib/types/artifact-types";

// achieveMissionは呼ばれない想定（バリデーション失敗で早期return）だが、
// 念のためモック化してDBアクセスを完全に遮断する
jest.mock("../use-cases/achieve-mission", () => ({
  achieveMission: jest.fn(),
}));
jest.mock("../use-cases/cancel-submission", () => ({
  cancelSubmission: jest.fn(),
}));
jest.mock("./quiz-actions", () => ({
  checkQuizAnswersAction: jest.fn(),
  getMissionQuizCategoryAction: jest.fn(),
  getQuizQuestionsAction: jest.fn(),
}));

import { achieveMissionAction } from "./actions";

function buildFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, v);
  }
  return fd;
}

describe("achieveMissionAction — RESIDENTIAL_POSTER バリデーション", () => {
  it("locationTypeが空なら『種別を選択してください』エラーを返す", async () => {
    const fd = buildFormData({
      missionId: "mission-1",
      requiredArtifactType: ARTIFACT_TYPES.RESIDENTIAL_POSTER.key,
      residentialPosterCount: "3",
      locationType: "",
      posterType: "leader_face_a1",
      placedDate: "2026-04-16",
      locationText: "1540017",
    });

    const result = await achieveMissionAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("種別を選択してください");
    }
  });

  it("posterTypeが空なら『ポスターの種類を選択してください』エラーを返す", async () => {
    const fd = buildFormData({
      missionId: "mission-1",
      requiredArtifactType: ARTIFACT_TYPES.RESIDENTIAL_POSTER.key,
      residentialPosterCount: "3",
      locationType: "home",
      posterType: "",
      placedDate: "2026-04-16",
      locationText: "1540017",
    });

    const result = await achieveMissionAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("ポスターの種類を選択してください");
    }
  });

  it("posterTypeが許可値以外なら『有効なポスターの種類を選択してください』エラーを返す", async () => {
    const fd = buildFormData({
      missionId: "mission-1",
      requiredArtifactType: ARTIFACT_TYPES.RESIDENTIAL_POSTER.key,
      residentialPosterCount: "3",
      locationType: "home",
      posterType: "unknown_poster",
      placedDate: "2026-04-16",
      locationText: "1540017",
    });

    const result = await achieveMissionAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("有効なポスターの種類を選択してください");
    }
  });

  it("locationTypeが許可値以外なら『有効な種別を選択してください』エラーを返す", async () => {
    const fd = buildFormData({
      missionId: "mission-1",
      requiredArtifactType: ARTIFACT_TYPES.RESIDENTIAL_POSTER.key,
      residentialPosterCount: "3",
      locationType: "unknown_location",
      posterType: "leader_face_a1",
      placedDate: "2026-04-16",
      locationText: "1540017",
    });

    const result = await achieveMissionAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("有効な種別を選択してください");
    }
  });

  it("placedDateが空なら『日付を入力してください』エラーを返す", async () => {
    const fd = buildFormData({
      missionId: "mission-1",
      requiredArtifactType: ARTIFACT_TYPES.RESIDENTIAL_POSTER.key,
      residentialPosterCount: "3",
      locationType: "home",
      posterType: "leader_face_a1",
      placedDate: "",
      locationText: "1540017",
    });

    const result = await achieveMissionAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("日付を入力してください");
    }
  });

  it("locationTextが空なら『郵便番号を入力してください』エラーを返す", async () => {
    const fd = buildFormData({
      missionId: "mission-1",
      requiredArtifactType: ARTIFACT_TYPES.RESIDENTIAL_POSTER.key,
      residentialPosterCount: "3",
      locationType: "home",
      posterType: "leader_face_a1",
      placedDate: "2026-04-16",
      locationText: "",
    });

    const result = await achieveMissionAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("郵便番号を入力してください");
    }
  });

  it("locationTextが7桁数字でないなら書式エラーを返す", async () => {
    const fd = buildFormData({
      missionId: "mission-1",
      requiredArtifactType: ARTIFACT_TYPES.RESIDENTIAL_POSTER.key,
      residentialPosterCount: "3",
      locationType: "home",
      posterType: "leader_face_a1",
      placedDate: "2026-04-16",
      locationText: "154-0017",
    });

    const result = await achieveMissionAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain(
        "郵便番号はハイフンなし7桁で入力をお願いします",
      );
    }
  });

  it("全フィールドが有効な場合はバリデーションをパスし、認証エラーを返す（未ログイン）", async () => {
    // jest.setup.js で createClient.auth.getUser() が user: null を返すよう設定済み
    const fd = buildFormData({
      missionId: "mission-1",
      requiredArtifactType: ARTIFACT_TYPES.RESIDENTIAL_POSTER.key,
      residentialPosterCount: "3",
      locationType: "home",
      posterType: "leader_face_a1",
      placedDate: "2026-04-16",
      locationText: "1540017",
    });

    const result = await achieveMissionAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("認証エラーが発生しました。");
    }
  });
});

describe("achieveMissionAction — 種別はDB上のクエストの種別で判定する", () => {
  const { achieveMission } = jest.requireMock("../use-cases/achieve-mission");
  const { createClient } = jest.requireMock("@/lib/supabase/client");
  const { createAdminClient } = jest.requireMock("@/lib/supabase/adminClient");

  function mockLoggedInWithMission(requiredArtifactType: string | null) {
    createClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    });
    const query: Record<string, jest.Mock> = {};
    Object.assign(query, {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      maybeSingle: jest.fn().mockResolvedValue({
        data:
          requiredArtifactType === null
            ? null
            : { required_artifact_type: requiredArtifactType },
        error: null,
      }),
    });
    createAdminClient.mockResolvedValue({ from: jest.fn(() => query) });
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ["QR", "このクエストは現地のQRコードを読み取ると達成になります"],
    [
      "GEO_CHECKIN",
      "このクエストは現地で「イベントに来た」ボタンを押すと達成になります",
    ],
    ["LINE_FRIEND", "このクエストは公式LINEを友だち追加すると達成になります"],
    ["REFERRAL", "このクエストは紹介した友だちが登録すると達成になります"],
  ])("DB上の種別が %s なら、NONEと偽って送っても達成させない", async (realType, message) => {
    mockLoggedInWithMission(realType);

    const result = await achieveMissionAction(
      buildFormData({
        missionId: "mission-1",
        requiredArtifactType: ARTIFACT_TYPES.NONE.key,
      }),
    );

    expect(result).toEqual({ success: false, error: message });
    expect(achieveMission).not.toHaveBeenCalled();
  });

  it("送られてきた種別がDB上の種別と違えば達成させない", async () => {
    mockLoggedInWithMission(ARTIFACT_TYPES.IMAGE.key);

    const result = await achieveMissionAction(
      buildFormData({
        missionId: "mission-1",
        requiredArtifactType: ARTIFACT_TYPES.NONE.key,
      }),
    );

    expect(result.success).toBe(false);
    expect(achieveMission).not.toHaveBeenCalled();
  });

  it("クエストが見つからなければ達成させない", async () => {
    mockLoggedInWithMission(null);

    const result = await achieveMissionAction(
      buildFormData({
        missionId: "missing",
        requiredArtifactType: ARTIFACT_TYPES.NONE.key,
      }),
    );

    expect(result.success).toBe(false);
    expect(achieveMission).not.toHaveBeenCalled();
  });

  it("種別が一致すればユースケースに渡す", async () => {
    mockLoggedInWithMission(ARTIFACT_TYPES.NONE.key);
    achieveMission.mockResolvedValue({ success: false, error: "stop" });

    await achieveMissionAction(
      buildFormData({
        missionId: "mission-1",
        requiredArtifactType: ARTIFACT_TYPES.NONE.key,
      }),
    );

    expect(achieveMission).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        userId: "user-1",
        missionId: "mission-1",
        artifactType: ARTIFACT_TYPES.NONE.key,
      }),
    );
  });
});
