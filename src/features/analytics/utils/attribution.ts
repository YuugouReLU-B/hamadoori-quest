import type { AnalyticsChannel } from "../types";

/**
 * 参照元ホストを流入チャネルに分類する。
 *
 * GA4 の「デフォルトチャネルグループ」を、このサービスに必要な粒度まで削ったもの。
 * 検索・SNSは実際にこのサービスの流入で観測される主要なものだけを列挙し、
 * 判定できなかった外部サイトは referral に落とす。
 */

const SEARCH_ENGINE_HOSTS = [
  "google.com",
  "google.co.jp",
  "bing.com",
  "yahoo.co.jp",
  "search.yahoo.co.jp",
  "duckduckgo.com",
  "baidu.com",
  "ecosia.org",
  "brave.com",
  "startpage.com",
];

const SOCIAL_HOSTS = [
  "x.com",
  "twitter.com",
  "t.co",
  "facebook.com",
  "m.facebook.com",
  "l.facebook.com",
  "instagram.com",
  "l.instagram.com",
  "line.me",
  "liff.line.me",
  "lin.ee",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "threads.net",
  "note.com",
  "hatena.ne.jp",
  "linkedin.com",
  "reddit.com",
];

/** utm_medium から機械的にチャネルが決まるもの */
const MEDIUM_TO_CHANNEL: Record<string, AnalyticsChannel> = {
  organic: "organic_search",
  social: "social",
  "social-network": "social",
  referral: "referral",
  cpc: "campaign",
  ppc: "campaign",
  paid: "campaign",
  email: "campaign",
  affiliate: "campaign",
  qr: "campaign",
  poster: "campaign",
};

/** URL文字列からホスト名を取り出す。パースできなければ null */
export function extractHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * ホスト名が候補のいずれかに該当するか。
 *
 * 完全一致か、候補をドメイン末尾に持つサブドメインだけを認める。
 * 前方一致にすると "google.evil.com" のような別ドメインまで検索エンジン扱いに
 * なってしまうため、判定はラベル境界（先頭の "."）で必ず区切る。
 */
function matchesHost(host: string, candidates: string[]): boolean {
  return candidates.some(
    (candidate) => host === candidate || host.endsWith(`.${candidate}`),
  );
}

export interface ClassifyChannelInput {
  /** 外部サイトからの参照元URL。同一オリジン遷移や直接流入では null */
  referrer?: string | null;
  /** 自サイトのホスト名。参照元が自分自身だった場合に internal と判定するために使う */
  currentHost?: string | null;
  utmMedium?: string | null;
  utmSource?: string | null;
  /** ?cv= のキャンペーンコード。付いていればキャンペーン流入と見なす */
  campaignCode?: string | null;
  /** 紹介コード */
  referralCode?: string | null;
}

/**
 * 流入チャネルを判定する。
 *
 * 優先順位は「明示的に付けた計測パラメータ > 参照元ホスト」。
 * キャンペーンコードやutm_mediumはこちらが意図して付けたものなので、
 * 参照元（LINEアプリ内ブラウザ等で欠けやすい）より信頼できる。
 */
export function classifyChannel(input: ClassifyChannelInput): AnalyticsChannel {
  const { referrer, currentHost, utmMedium, campaignCode, referralCode } =
    input;

  if (campaignCode || referralCode) {
    return "campaign";
  }

  const medium = utmMedium?.trim().toLowerCase();
  if (medium && MEDIUM_TO_CHANNEL[medium]) {
    return MEDIUM_TO_CHANNEL[medium];
  }
  // 未知の utm_medium でも、計測パラメータが付いている時点で意図的な流入
  if (medium) {
    return "campaign";
  }

  const host = extractHost(referrer);
  if (!host) {
    return "direct";
  }

  const normalizedCurrentHost = currentHost?.toLowerCase();
  if (normalizedCurrentHost && host === normalizedCurrentHost) {
    return "internal";
  }

  if (matchesHost(host, SEARCH_ENGINE_HOSTS)) {
    return "organic_search";
  }

  if (matchesHost(host, SOCIAL_HOSTS)) {
    return "social";
  }

  return "referral";
}

export interface UtmParams {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
}

/** 長すぎる値でDBを汚さないための上限。UTMは本来短い */
const MAX_UTM_LENGTH = 255;

function readParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key);
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_UTM_LENGTH);
}

/** クエリ文字列から utm_* を取り出す */
export function parseUtmParams(search: string | URLSearchParams): UtmParams {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;

  return {
    utmSource: readParam(params, "utm_source"),
    utmMedium: readParam(params, "utm_medium"),
    utmCampaign: readParam(params, "utm_campaign"),
    utmTerm: readParam(params, "utm_term"),
    utmContent: readParam(params, "utm_content"),
  };
}

/** チャネルの日本語表示名。管理画面用 */
export const CHANNEL_LABELS: Record<AnalyticsChannel, string> = {
  direct: "直接流入",
  organic_search: "検索",
  social: "SNS",
  referral: "他サイト",
  campaign: "キャンペーン",
  internal: "サイト内",
};
