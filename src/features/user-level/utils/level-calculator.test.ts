import {
  calculateMissionXp,
  defaultPointsForDifficulty,
} from "./level-calculator";

describe("ミッション経験値計算", () => {
  describe("calculateMissionXp", () => {
    it("ミッションに設定されたポイントをそのまま返す", () => {
      expect(calculateMissionXp({ points: 50 })).toBe(50);
      expect(calculateMissionXp({ points: 300 })).toBe(300);
    });

    it("difficulty からの導出をやめたので、5段階以外の値も扱える", () => {
      expect(calculateMissionXp({ points: 123 })).toBe(123);
    });

    it("ポイント0のミッションは0XP", () => {
      expect(calculateMissionXp({ points: 0 })).toBe(0);
    });
  });

  describe("defaultPointsForDifficulty", () => {
    it.each([
      [1, 50],
      [2, 100],
      [3, 200],
      [4, 400],
      [5, 800],
    ])("難易度%iの既定ポイントは%i", (difficulty, expected) => {
      expect(defaultPointsForDifficulty(difficulty)).toBe(expected);
    });

    it.each([0, 6, -1, 999])("範囲外の難易度%iは既定の50", (difficulty) => {
      expect(defaultPointsForDifficulty(difficulty)).toBe(50);
    });
  });
});
