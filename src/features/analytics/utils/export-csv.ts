import { stringify } from "csv-stringify/sync";
import type { AnalyticsDataset } from "../constants/dashboard";
import type {
  AnalyticsDashboard,
  AnalyticsPeriod,
} from "../services/analytics-report";

/**
 * 集計関数が返す列名 → CSV の見出し。
 * 載っていない列は列名のまま出す（集計関数に列を足しても出力から落ちないように）。
 */
const FIELD_LABELS: Record<string, string> = {
  achievements: "獲得数",
  avg_engaged_seconds: "平均滞在（秒）",
  avg_hours: "平均（時間）",
  avg_max_scroll_pct: "平均スクロール到達率（%）",
  avg_result_count: "平均の結果件数",
  avg_seconds: "平均表示（秒）",
  avg_visible_spots: "画面内のスポット数",
  avg_zoom: "平均ズーム",
  band_index: "高さの帯（0=最上部）",
  bounce_rate: "直帰率（%）",
  browser: "ブラウザ",
  bucket_start: "区間の開始（日本時間）",
  calendar_month: "月",
  campaign_code: "キャンペーンコード",
  channel: "チャネル",
  channels: "流入元",
  click_rate: "押された率（%）",
  clicks: "クリック数",
  content_id: "コンテンツID",
  content_label: "コンテンツ",
  content_type_out: "種別",
  continued_from_previous_pct: "前段から続いた率（%）",
  day_of_week: "曜日（0=日）",
  days_span: "最初〜最後（日）",
  device_type: "端末",
  devices: "端末",
  element_path: "要素",
  engaged_seconds: "滞在（秒）",
  entries: "入口",
  event_count: "その月の開催",
  exits: "出口",
  first_seen_at: "初回",
  from_path: "遷移元",
  from_title: "このクエストの次に",
  fully_seen_rate: "全体が見えた率（%）",
  hour_of_day: "時（日本時間）",
  hours_to_first: "1個目まで（時間）",
  href: "リンク先",
  impressions: "表示回数",
  ip_city: "市区町村",
  ip_country: "国",
  ip_region: "都道府県",
  is_outbound: "外部リンク",
  jumped_to_next: "「次の開催日へ」",
  kinds: "種類",
  label: "ラベル",
  landing_path: "入口",
  last_seen_at: "最終",
  locations: "地域",
  logged_in_users: "ログイン済み",
  logged_in_visitors: "うち登録済み",
  map_id: "地図",
  marker_clicks: "ピンを押した",
  median_engaged_seconds: "滞在の中央値（秒）",
  median_hours: "中央値（時間）",
  mission_id: "クエストID",
  mission_slug: "クエストslug",
  mission_title: "クエスト",
  month: "月",
  moves: "操作回数",
  p25_hours: "25パーセンタイル（時間）",
  p75_hours: "75パーセンタイル（時間）",
  page_path: "ページ",
  page_title: "ページタイトル",
  page_views: "ページビュー",
  quest_count: "達成数",
  quest_titles: "達成した順番",
  quest_type: "クエスト種別",
  read_to_bottom_rate: "ほぼ最後まで（%）",
  referrer_host: "参照元",
  regions: "地域",
  registered_at: "登録",
  section_label: "セクション",
  section_top: "ページ内位置（px）",
  selections: "選択回数",
  session_id: "セッションID",
  sessions: "セッション",
  share_of_cohort_pct: "登録者に占める割合（%）",
  share_pct: "その順番での割合（%）",
  signups: "新規登録",
  spot_id: "スポットID",
  spot_title: "スポット",
  started_at: "開始",
  step_index: "順番",
  times_in_view: "映った回数",
  to_path: "遷移先",
  to_title: "このクエスト",
  total_seconds: "合計（秒）",
  transitions: "回数",
  user_id: "ユーザーID",
  user_name: "ユーザー",
  users: "人数",
  users_reached: "到達した人数",
  utm_campaign: "utm_campaign",
  utm_medium: "utm_medium",
  utm_source: "utm_source",
  viewers: "人数",
  views: "見に行った回数",
  visit_count: "訪問回数",
  visitor_id: "訪問者ID",
  visitors: "訪問者",
  visits: "訪問回数",
  zero_result_rate: "0件になった率（%）",
  total_users: "登録ユーザー数（累計）",
  line_friend_achievements: "LINE友だち追加（累計）",
  geo_checkin_achievements: "位置情報チェックイン（累計）",
  referral_achievements: "紹介（累計）",
  other_achievements: "その他のクエスト（累計）",
};

function toCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function toRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === "object") {
    return [value as Record<string, unknown>];
  }
  return [];
}

function formatJst(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

/**
 * 指定した集計を1つの CSV にまとめる。
 *
 * 表ごとに「■ 見出し」の行・列見出しの行・データ行を並べ、表の間は空行で区切る。
 * Excel で開いても文字化けしないよう先頭に BOM を付ける。
 */
export function buildAnalyticsCsv(
  data: AnalyticsDashboard,
  datasets: readonly AnalyticsDataset[],
  period: AnalyticsPeriod,
): string {
  const lines: string[][] = [
    ["浜通りクエスト アクセス解析"],
    [
      "期間（日本時間）",
      `${formatJst(period.from)} 〜 ${formatJst(period.to)}`,
    ],
    [],
  ];

  for (const dataset of datasets) {
    const rows = toRows(data[dataset.dataKey]);
    lines.push([`■ ${dataset.title}`]);

    if (rows.length === 0) {
      lines.push(["（データなし）"], []);
      continue;
    }

    const keys = Object.keys(rows[0]);
    lines.push(keys.map((key) => FIELD_LABELS[key] ?? key));
    for (const row of rows) {
      lines.push(keys.map((key) => toCell(row[key])));
    }
    lines.push([]);
  }

  return `﻿${stringify(lines, { record_delimiter: "windows" })}`;
}

/** ダウンロード時のファイル名（ASCII のみ） */
export function analyticsCsvFilename(
  scope: string,
  days: number,
  now: Date,
): string {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  })
    .format(now)
    .replaceAll("-", "");
  return `hamadori-quest-analytics_${scope}_${days}d_${ymd}.csv`;
}
