import type { ResolvedRequestContext } from "../types";
import { parseUserAgent } from "./user-agent";

/**
 * リクエストヘッダから、クライアントに任せられない情報（IP・IP由来の地域・UA）を解決する。
 *
 * 位置情報について:
 *   ここで取るのは CDN が IP から推定した国/都道府県/市区町村レベルの粗い位置で、
 *   プライバシーポリシー2条「アクセスログ（IPアドレス、ブラウザ情報、Cookie情報等）」の
 *   範囲に収まる。端末のGPS精密座標は別扱いで、地図・ジオチェックインなど
 *   すでに位置情報の利用に同意を得ている画面のイベントにのみ付与する。
 */

/** Vercel と Cloudflare で地域ヘッダの名前が違うので両対応する */
const GEO_HEADERS = {
  country: ["x-vercel-ip-country", "cf-ipcountry"],
  region: ["x-vercel-ip-country-region", "cf-region-code", "cf-region"],
  city: ["x-vercel-ip-city", "cf-ipcity"],
  latitude: ["x-vercel-ip-latitude", "cf-iplatitude"],
  longitude: ["x-vercel-ip-longitude", "cf-iplongitude"],
} as const;

function firstHeader(
  headers: Headers,
  names: readonly string[],
): string | null {
  for (const name of names) {
    const value = headers.get(name);
    if (value) {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

/**
 * Vercel の x-vercel-ip-city は "Fukushima" のような値がURIエンコードで入る
 * （日本語の市区町村名が来る場合もある）ため、デコードを試みる。
 */
function decodeGeoValue(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    // 不正なエスケープが含まれる場合は生の値を使う
    return value;
  }
}

function parseCoordinate(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * IPアドレスとして保存できる形かどうか。
 *
 * analytics_sessions.ip_address は INET 型なので、"unknown" や
 * ポート付きの値をそのまま渡すとキャスト失敗でINSERT全体が落ちる。
 * プロキシの実装次第でそうした値が来るため、保存前に必ずここを通す。
 * 厳密な妥当性検証ではなく、INETに入らない形を弾くのが目的。
 */
export function isStorableIp(value: string): boolean {
  // IPv4: 0-255 を4つ
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    return value.split(".").every((part) => Number.parseInt(part, 10) <= 255);
  }
  // IPv6: 16進とコロン（短縮形・IPv4混在表記を含む）。ゾーンIDは INET が受け付けない
  return /^[0-9a-f:]+(\.\d{1,3}){0,3}$/i.test(value) && value.includes(":");
}

/**
 * クライアントIPを取り出す。
 *
 * x-forwarded-for は "client, proxy1, proxy2" の順に積まれるので先頭を採用する。
 * ここはプロキシが信頼できる環境（Vercel / Cloud Run のロードバランサ配下）を
 * 前提にしている。ヘッダはクライアントから偽装できるため、IPは分析用途にとどめ、
 * 認可の判断には使わない。
 */
export function resolveClientIp(headers: Headers): string | null {
  const candidates = [
    headers.get("x-forwarded-for")?.split(",")[0],
    headers.get("x-real-ip"),
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && isStorableIp(value)) return value;
  }
  return null;
}

export function resolveRequestContext(
  headers: Headers,
): ResolvedRequestContext {
  const userAgent = headers.get("user-agent");
  const { browser, os, deviceType, isBot } = parseUserAgent(userAgent);

  return {
    ipAddress: resolveClientIp(headers),
    ipCountry: decodeGeoValue(firstHeader(headers, GEO_HEADERS.country)),
    ipRegion: decodeGeoValue(firstHeader(headers, GEO_HEADERS.region)),
    ipCity: decodeGeoValue(firstHeader(headers, GEO_HEADERS.city)),
    ipLatitude: parseCoordinate(firstHeader(headers, GEO_HEADERS.latitude)),
    ipLongitude: parseCoordinate(firstHeader(headers, GEO_HEADERS.longitude)),
    userAgent,
    browser,
    os,
    deviceType,
    isBot,
  };
}
