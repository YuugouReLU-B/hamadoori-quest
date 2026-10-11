import { missionSchema } from "./mission-schema";

const base = {
  slug: "test-quest",
  title: "テストクエスト",
  quest_category: "SPECIAL_HAMADORI",
  event_category: "MIXED",
  required_artifact_type: "NONE",
  difficulty: 1,
  points: 100,
  max_achievement_count: 1,
  is_featured: false,
  is_hidden: false,
  latitude: null,
  longitude: null,
  radius_meters: null,
};

describe("missionSchema のイベントカテゴリ", () => {
  it("SNS登録以外でイベントカテゴリが空なら弾く", () => {
    const result = missionSchema.safeParse({ ...base, event_category: null });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["event_category"]);
  });

  it("常設クエストでも空は弾く", () => {
    const result = missionSchema.safeParse({
      ...base,
      quest_category: "PERMANENT",
      event_category: null,
    });
    expect(result.success).toBe(false);
  });

  it("SNS登録はイベントカテゴリが空でもよい", () => {
    const result = missionSchema.safeParse({
      ...base,
      quest_category: "SNS",
      event_category: null,
    });
    expect(result.success).toBe(true);
  });

  it("イベントカテゴリがあれば通る", () => {
    expect(missionSchema.safeParse(base).success).toBe(true);
  });
});
