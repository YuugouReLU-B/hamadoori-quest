/**
 * ミッション達成で付与するXPを計算する。
 *
 * 以前は difficulty(1-5) から段階的に導出していたため、ミッションごとに
 * 任意の値を設定できなかった。現在は `missions.points` をそのまま使う。
 * difficulty は★表示のためだけに残っている。
 *
 * 引数をミッション行そのものにしているのは、数値2つだと difficulty を
 * 渡しても型が通ってしまい、静かに誤ったXPが入るため。
 */
export function calculateMissionXp(mission: { points: number }): number {
  return mission.points;
}

/**
 * difficulty から既定のポイントを求める。
 *
 * 管理画面で新しいミッションを作るときの初期値に使う。
 * 既存ミッションの points もこの値で埋めてある（マイグレーション 20260809160000）。
 */
export function defaultPointsForDifficulty(difficulty: number): number {
  switch (difficulty) {
    case 1:
      return 50;
    case 2:
      return 100;
    case 3:
      return 200;
    case 4:
      return 400;
    case 5:
      return 800;
    default:
      return 50;
  }
}
