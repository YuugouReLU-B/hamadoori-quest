import type { Enums } from "@/lib/types/supabase";

// 一覧の表示順。開催日のある特設クエストを先に見せる（浜通り→東京→常設→SNS）
export const QUEST_CATEGORIES = [
  "SPECIAL_HAMADORI",
  "SPECIAL_TOKYO",
  "PERMANENT",
  "SNS",
] as const satisfies readonly Enums<"quest_category">[];
export const QUEST_CATEGORY_LABELS = {
  PERMANENT: "常設クエスト",
  SPECIAL_HAMADORI: "特設クエスト(浜通り)",
  SPECIAL_TOKYO: "特設クエスト(東京)",
  SNS: "SNS登録",
} satisfies Record<Enums<"quest_category">, string>;

export const EVENT_CATEGORIES = [
  "SPOT",
  "SPORTS",
  "ART",
  "FOOD",
  "MIXED",
] as const satisfies readonly Enums<"event_category">[];
export const EVENT_CATEGORY_LABELS = {
  SPOT: "スポット(地図)",
  SPORTS: "スポーツ",
  ART: "アート",
  FOOD: "食・収穫",
  MIXED: "複合イベント",
} satisfies Record<Enums<"event_category">, string>;
export const EVENT_CATEGORY_ICONS = {
  SPOT: "/img/quest-icons/spot.png",
  SPORTS: "/img/quest-icons/sports.png",
  ART: "/img/quest-icons/art.png",
  FOOD: "/img/quest-icons/food.png",
  MIXED: "/img/quest-icons/mixed-event.png",
} satisfies Record<Enums<"event_category">, string>;

export function getEventCategoryIcon(
  category: Enums<"event_category"> | null,
): string {
  return category
    ? EVENT_CATEGORY_ICONS[category]
    : "/img/mission_fallback.svg";
}
