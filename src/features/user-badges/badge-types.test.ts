import type { UserBadge } from "./badge-types";
import {
  getBadgeRankingUrl,
  getBadgeTierColorClass,
  getBadgeTitle,
} from "./badge-types";

const createBadge = (overrides: Partial<UserBadge> = {}): UserBadge => ({
  id: "badge-1",
  user_id: "user-1",
  badge_type: "ALL",
  sub_type: null,
  rank: 1,
  season_id: "season-1",
  achieved_at: "2025-01-01T00:00:00Z",
  is_notified: false,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("badge-types", () => {
  describe("getBadgeTitle", () => {
    describe("badge_typeごとのタイトル生成", () => {
      it("DAILY: デイリーランキング + 順位を返す", () => {
        const badge = createBadge({ badge_type: "DAILY", rank: 5 });
        expect(getBadgeTitle(badge)).toBe("デイリーランキング 5位");
      });

      it("ALL: 総合ランキング + 順位を返す", () => {
        const badge = createBadge({ badge_type: "ALL", rank: 1 });
        expect(getBadgeTitle(badge)).toBe("総合ランキング 1位");
      });

      it("MISSION: mission_titleがある場合はそれを使う", () => {
        const badge = createBadge({
          badge_type: "MISSION",
          sub_type: "mission-slug",
          mission_title: "SNS投稿クエスト",
          rank: 2,
        });
        expect(getBadgeTitle(badge)).toBe("SNS投稿クエスト 2位");
      });

      it("MISSION: mission_titleがない場合はsub_typeを使う", () => {
        const badge = createBadge({
          badge_type: "MISSION",
          sub_type: "mission-slug",
          rank: 10,
        });
        expect(getBadgeTitle(badge)).toBe("mission-slug 10位");
      });

      it("MISSION: mission_titleもsub_typeもない場合", () => {
        const badge = createBadge({
          badge_type: "MISSION",
          sub_type: null,
          rank: 1,
        });
        expect(getBadgeTitle(badge)).toBe("クエストランキング 1位");
      });
    });

    describe("rank値のバリエーション", () => {
      it("rank=1の場合", () => {
        const badge = createBadge({ badge_type: "ALL", rank: 1 });
        expect(getBadgeTitle(badge)).toBe("総合ランキング 1位");
      });

      it("rank=100の場合", () => {
        const badge = createBadge({ badge_type: "ALL", rank: 100 });
        expect(getBadgeTitle(badge)).toBe("総合ランキング 100位");
      });
    });
  });

  describe("getBadgeTierColorClass", () => {
    it("rank 1-10 は金色のクラスを返す", () => {
      expect(getBadgeTierColorClass(1)).toBe("text-yellow-500");
      expect(getBadgeTierColorClass(10)).toBe("text-yellow-500");
    });

    it("rank 11-50 は銀色のクラスを返す", () => {
      expect(getBadgeTierColorClass(11)).toBe("text-gray-400");
      expect(getBadgeTierColorClass(50)).toBe("text-gray-400");
    });

    it("rank 51以上 は銅色のクラスを返す", () => {
      expect(getBadgeTierColorClass(51)).toBe("text-orange-500");
      expect(getBadgeTierColorClass(100)).toBe("text-orange-500");
    });

    it("rank=0 は金色のクラスを返す(10以下)", () => {
      expect(getBadgeTierColorClass(0)).toBe("text-yellow-500");
    });
  });

  describe("getBadgeRankingUrl", () => {
    describe("badge_typeごとのURL生成", () => {
      it("DAILY: /ranking?period=daily を返す", () => {
        const badge = createBadge({ badge_type: "DAILY" });
        expect(getBadgeRankingUrl(badge)).toBe("/ranking?period=daily");
      });

      it("ALL: /ranking?period=all を返す", () => {
        const badge = createBadge({ badge_type: "ALL" });
        expect(getBadgeRankingUrl(badge)).toBe("/ranking?period=all");
      });

      it("MISSION: mission_id の有無に関わらず /ranking を返す", () => {
        const badgeWithMissionId = createBadge({
          badge_type: "MISSION",
          mission_id: "mission-123",
        });
        expect(getBadgeRankingUrl(badgeWithMissionId)).toBe("/ranking");

        const badgeWithoutMissionId = createBadge({ badge_type: "MISSION" });
        expect(getBadgeRankingUrl(badgeWithoutMissionId)).toBe("/ranking");
      });
    });

    describe("不明なbadge_type", () => {
      it("未知のbadge_typeの場合はnullを返す", () => {
        const badge = createBadge({
          badge_type: "UNKNOWN" as UserBadge["badge_type"],
        });
        expect(getBadgeRankingUrl(badge)).toBeNull();
      });
    });
  });
});
