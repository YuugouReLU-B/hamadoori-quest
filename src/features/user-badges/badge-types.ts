export type BadgeType = "DAILY" | "ALL" | "MISSION";

export interface UserBadge {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  sub_type: string | null;
  rank: number;
  season_id: string;
  achieved_at: string;
  is_notified: boolean;
  created_at: string;
  updated_at: string;
  // ミッションバッジの場合、ミッションのタイトル
  mission_title?: string;
  // ミッションバッジの場合、ミッションのID（リンク生成用）
  mission_id?: string;
}

export interface BadgeUpdateParams {
  user_id: string;
  badge_type: BadgeType;
  sub_type: string | null;
  rank: number;
}

export interface BadgeNotification {
  badge: UserBadge;
  badgeTitle: string;
  badgeDescription: string;
}

export const getBadgeTitle = (badge: UserBadge): string => {
  switch (badge.badge_type) {
    case "DAILY":
      return `デイリーランキング ${badge.rank}位`;
    case "ALL":
      return `総合ランキング ${badge.rank}位`;
    case "MISSION": {
      const title = badge.mission_title ?? badge.sub_type ?? "";
      return title
        ? `${title} ${badge.rank}位`
        : `クエストランキング ${badge.rank}位`;
    }
    default:
      return `ランキング ${badge.rank}位`;
  }
};

/**
 * ランキング順位帯に応じたメダルアイコンの色クラス（金・銀・銅）を返す。
 */
export const getBadgeTierColorClass = (rank: number): string => {
  if (rank <= 10) return "text-yellow-500";
  if (rank <= 50) return "text-gray-400";
  return "text-orange-500";
};

export const BadgeType = {
  DAILY: "DAILY",
  ALL: "ALL",
  MISSION: "MISSION",
} as const;

/**
 * バッジタイプに応じたランキングページのURLを取得
 *
 * NOTE: バッジ機能は現在稼働していない。
 * バッジを発行する calculate-badges ワークフロー
 * (.github/workflows/calculate-badges-production.yml / -staging.yml) は
 * production・staging とも `on:` が workflow_dispatch のみで、
 * 「本プロジェクト用に Secrets と接続先を再設定するまで定期実行を停止している」
 * という NOTE 付きで定期実行が止まっている（実行履歴もゼロ）。
 * そのため user_badges テーブルに行が無く、バッジ獲得通知ダイアログも
 * ヒーローのバッジ表示も実際には出ていない。
 *
 * MISSION の遷移先を（mission_id の有無に関わらず）"/ranking" にしているのは、
 * クエスト別ランキングページ（旧 ranking-mission 配下のページ）を削除したため、
 * 存在しないページを指さないようにする目的。バッジ機能が止まっている以上
 * ユーザー影響は無い。
 */
export function getBadgeRankingUrl(badge: UserBadge): string | null {
  switch (badge.badge_type) {
    case BadgeType.DAILY:
      return "/ranking?period=daily";
    case BadgeType.ALL:
      return "/ranking?period=all";
    case BadgeType.MISSION:
      return "/ranking";
    default:
      return null;
  }
}
