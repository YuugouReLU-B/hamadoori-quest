import type { AnalyticsDashboard } from "../services/analytics-report";

/** 期間の選択肢。?days= で受け付ける値 */
export const ANALYTICS_PERIOD_OPTIONS = [
  { days: 1, label: "24時間" },
  { days: 7, label: "7日" },
  { days: 30, label: "30日" },
  { days: 90, label: "90日" },
] as const;

const DEFAULT_DAYS = 7;

/** ?days= を許可された値に丸める */
export function resolveAnalyticsDays(
  raw: string | string[] | null | undefined,
): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "", 10);
  return ANALYTICS_PERIOD_OPTIONS.some((option) => option.days === parsed)
    ? parsed
    : DEFAULT_DAYS;
}

/**
 * ダッシュボードのタブ。何を知りたいかで分けている。
 * 集計（ANALYTICS_DATASETS）はどれか1つのタブに必ず属する。
 */
export const ANALYTICS_TABS = [
  {
    key: "overview",
    label: "概要",
    description: "期間全体の数字と、日ごと・時間帯ごとの動き",
  },
  {
    key: "acquisition",
    label: "集客",
    description: "どこから・どの地域から来たか",
  },
  {
    key: "pages",
    label: "ページ・コンテンツ",
    description: "どのページがどれだけ読まれ、どこが押されたか",
  },
  {
    key: "discovery",
    label: "クエストの探し方",
    description: "絞り込み・地図・カレンダーの使われ方",
  },
  {
    key: "quests",
    label: "クエスト達成",
    description: "どのクエストがどの順番で、どれくらいの間隔で達成されたか",
  },
  {
    key: "visitors",
    label: "訪問者",
    description: "再訪の回数と、訪問者・セッションごとの行動",
  },
] as const;

export type AnalyticsTabKey = (typeof ANALYTICS_TABS)[number]["key"];

export function resolveAnalyticsTab(
  raw: string | string[] | null | undefined,
): AnalyticsTabKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (
    ANALYTICS_TABS.find((tab) => tab.key === value)?.key ??
    ANALYTICS_TABS[0].key
  );
}

export interface AnalyticsDataset {
  /** getAnalyticsDashboard の戻り値のキー */
  dataKey: keyof AnalyticsDashboard;
  tab: AnalyticsTabKey;
  /** CSV の見出し。画面の表の見出しと揃える */
  title: string;
}

/** CSV 出力の単位。並び順は画面に出る順 */
export const ANALYTICS_DATASETS: readonly AnalyticsDataset[] = [
  { dataKey: "overview", tab: "overview", title: "サマリー" },
  { dataKey: "timeseries", tab: "overview", title: "推移" },
  { dataKey: "hours", tab: "overview", title: "曜日×時間帯のセッション数" },
  { dataKey: "channels", tab: "acquisition", title: "流入チャネル" },
  { dataKey: "referrers", tab: "acquisition", title: "参照元の内訳" },
  { dataKey: "locations", tab: "acquisition", title: "地域（IPからの推定）" },
  { dataKey: "pages", tab: "pages", title: "ページ別の滞在とスクロール" },
  { dataKey: "flows", tab: "pages", title: "ページ遷移" },
  { dataKey: "contents", tab: "pages", title: "コンテンツ別の閲覧" },
  { dataKey: "bands", tab: "pages", title: "ページ内のどの高さを見ていたか" },
  { dataKey: "sections", tab: "pages", title: "セクション別の滞在" },
  { dataKey: "clicks", tab: "pages", title: "押されたボタン・リンク" },
  { dataKey: "filterUsage", tab: "discovery", title: "絞り込みの使われ方" },
  { dataKey: "mapUsage", tab: "discovery", title: "地図の操作" },
  {
    dataKey: "mapSpotExposure",
    tab: "discovery",
    title: "地図のスポット別の反応",
  },
  { dataKey: "calendarUsage", tab: "discovery", title: "カレンダーでの探し方" },
  { dataKey: "acquisitions", tab: "quests", title: "クエスト獲得と流入元" },
  {
    dataKey: "questProgression",
    tab: "quests",
    title: "何個まで達成が続くか",
  },
  { dataKey: "questTiming", tab: "quests", title: "次の1個までにかかる時間" },
  {
    dataKey: "questSequence",
    tab: "quests",
    title: "何個目にどのクエストを達成したか",
  },
  { dataKey: "questTransitions", tab: "quests", title: "クエストのつながり" },
  {
    dataKey: "questJourneys",
    tab: "quests",
    title: "ユーザーごとの達成の流れ",
  },
  { dataKey: "visitFrequency", tab: "visitors", title: "再訪の回数" },
  { dataKey: "visitors", tab: "visitors", title: "訪問者ごとの行動" },
  { dataKey: "sessions", tab: "visitors", title: "直近のセッション" },
];
