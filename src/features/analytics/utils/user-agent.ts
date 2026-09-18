import type { AnalyticsDeviceType } from "../types";

/**
 * User-Agent の簡易パーサ。
 *
 * ua-parser-js 等を入れれば精度は上がるが、ここで欲しいのは
 * 「スマホかPCか」「主要ブラウザのどれか」「LINEアプリ内ブラウザか」程度の粒度で、
 * 依存を1つ増やすほどの差にならないため自前で持つ。
 * 判定できないものは無理に埋めず unknown / null を返す。
 */

const BOT_PATTERN =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|pinterest|vkshare|w3c_validator|whatsapp|telegrambot|discordbot|slackbot|twitterbot|applebot|petalbot|ahrefs|semrush|mj12bot|dotbot|lighthouse|headlesschrome|monitoring|uptime|pingdom|gtmetrix/i;

/** クローラ・プレビュー取得などの非人間アクセスか */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) {
    // UAが空のリクエストは通常のブラウザではまず起きない
    return true;
  }
  return BOT_PATTERN.test(userAgent);
}

/**
 * ブラウザ名を判定する。
 * 派生ブラウザ（Edge, Chrome, LINE内ブラウザ等）は Safari/Chrome を名乗るため、
 * 具体的なものから順に見る必要がある。
 */
export function parseBrowser(
  userAgent: string | null | undefined,
): string | null {
  if (!userAgent) return null;
  const ua = userAgent;

  // LINEの友だち追加やメッセージ経由の流入を見分けたいので最優先で判定する
  if (/\bLine\//i.test(ua)) return "LINE";
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/Edg[A-Z]?\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/CriOS/i.test(ua)) return "Chrome";
  if (/FxiOS/i.test(ua)) return "Firefox";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return null;
}

/** OS名を判定する */
export function parseOs(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const ua = userAgent;

  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) return "Android";
  // iPadOS 13以降のSafariはデスクトップ版UAを名乗るので Macintosh + タッチで拾う
  if (/iPhone|iPod/i.test(ua)) return "iOS";
  if (/iPad/i.test(ua)) return "iPadOS";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return null;
}

/** 端末種別を判定する */
export function parseDeviceType(
  userAgent: string | null | undefined,
): AnalyticsDeviceType {
  if (!userAgent) return "unknown";
  const ua = userAgent;

  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return "tablet";
  // Android はタブレットでも Android を含むため、Mobile の有無で分ける
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return "mobile";
  if (/Windows NT|Macintosh|Mac OS X|CrOS|Linux/i.test(ua)) return "desktop";
  return "unknown";
}

export interface ParsedUserAgent {
  browser: string | null;
  os: string | null;
  deviceType: AnalyticsDeviceType;
  isBot: boolean;
}

export function parseUserAgent(
  userAgent: string | null | undefined,
): ParsedUserAgent {
  return {
    browser: parseBrowser(userAgent),
    os: parseOs(userAgent),
    deviceType: parseDeviceType(userAgent),
    isBot: isBotUserAgent(userAgent),
  };
}
