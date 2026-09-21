import { REGION_BAND_COUNT } from "../constants";
import type {
  CollectEventInput,
  CollectRequestBody,
  CollectSessionInput,
  RegionDwellPayload,
} from "../types";

/**
 * 収集エンドポイントに届いたペイロードの検証と正規化。
 *
 * このエンドポイントは未認証で誰でも叩けるため、DBに入る前に必ずここを通す。
 * 「落とせるものは落とす」ではなく「使える範囲に丸める」方針にしているのは、
 * 多少欠けたイベントでも経路分析には役立つため。ただし件数・長さの上限だけは
 * 書き込み量が青天井にならないよう厳格に切る。
 */

export const MAX_EVENTS_PER_REQUEST = 50;
const MAX_PATH_LENGTH = 512;
const MAX_QUERY_LENGTH = 1024;
const MAX_TITLE_LENGTH = 512;
const MAX_URL_LENGTH = 2048;
const MAX_EVENT_NAME_LENGTH = 64;
const MAX_PROPS_JSON_LENGTH = 4096;
/** 滞在時間の上限(24時間)。タブを開きっぱなしにされた場合の外れ値を切る */
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
/** 1ページ表示あたりのセクション数の上限 */
const MAX_SECTIONS = 20;
const MAX_SECTION_KEY_LENGTH = 120;
/** 1ページ表示あたりのコンテンツ数の上限 */
const MAX_CONTENTS = 60;
const MAX_CONTENT_TYPE_LENGTH = 40;
const MAX_CONTENT_ID_LENGTH = 120;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function str(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function int(
  value: unknown,
  { min, max }: { min: number; max: number },
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function float(
  value: unknown,
  { min, max }: { min: number; max: number },
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

/**
 * クライアント時刻をそのまま信じない。
 * 端末の時計がずれていたり、意図的に改ざんされた値が来ても、
 * 「受信時刻から前後1日」に収まらないものは受信時刻に寄せる。
 */
function timestamp(value: unknown, now: number): string {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && Math.abs(parsed - now) <= MAX_DURATION_MS) {
      return new Date(parsed).toISOString();
    }
  }
  return new Date(now).toISOString();
}

function props(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    const json = JSON.stringify(value);
    if (json.length > MAX_PROPS_JSON_LENGTH) {
      // 巨大なpropsは丸ごと捨てず、切り詰められた事実だけ残す
      return { _truncated: true };
    }
    return value as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function normalizeSession(
  input: unknown,
  now: number,
): CollectSessionInput | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  if (!isUuid(raw.sessionId)) return null;

  return {
    sessionId: raw.sessionId,
    startedAt: timestamp(raw.startedAt, now),
    landingPath: str(raw.landingPath, MAX_PATH_LENGTH),
    landingQuery: str(raw.landingQuery, MAX_QUERY_LENGTH),
    referrer: str(raw.referrer, MAX_URL_LENGTH),
    utmSource: str(raw.utmSource, 255),
    utmMedium: str(raw.utmMedium, 255),
    utmCampaign: str(raw.utmCampaign, 255),
    utmTerm: str(raw.utmTerm, 255),
    utmContent: str(raw.utmContent, 255),
    campaignCode: str(raw.campaignCode, 255),
    referralCode: str(raw.referralCode, 255),
    viewportWidth: int(raw.viewportWidth, { min: 0, max: 20000 }),
    viewportHeight: int(raw.viewportHeight, { min: 0, max: 20000 }),
    screenWidth: int(raw.screenWidth, { min: 0, max: 20000 }),
    screenHeight: int(raw.screenHeight, { min: 0, max: 20000 }),
    language: str(raw.language, 35),
    timezone: str(raw.timezone, 64),
  };
}

/**
 * 領域滞在の検証。
 * 帯は必ず REGION_BAND_COUNT 個に揃える（足りなければ0埋め、多ければ切る）。
 * 集計SQLが固定長を前提に unnest するため、ここで形を保証しておく。
 */
function regionDwell(value: unknown): RegionDwellPayload | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const rawBands = Array.isArray(raw.bands) ? raw.bands : [];
  const bands = Array.from(
    { length: REGION_BAND_COUNT },
    (_, index) => int(rawBands[index], { min: 0, max: MAX_DURATION_MS }) ?? 0,
  );

  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
  const sections = rawSections
    .slice(0, MAX_SECTIONS)
    .map((section) => {
      if (!section || typeof section !== "object") return null;
      const item = section as Record<string, unknown>;
      const key = str(item.key, MAX_SECTION_KEY_LENGTH);
      const ms = int(item.ms, { min: 0, max: MAX_DURATION_MS });
      if (!key || ms === null) return null;
      return {
        key,
        label: str(item.label, MAX_SECTION_KEY_LENGTH),
        top: int(item.top, { min: 0, max: 10_000_000 }) ?? 0,
        ms,
      };
    })
    .filter(
      (section): section is RegionDwellPayload["sections"][number] =>
        section !== null,
    );

  const rawContents = Array.isArray(raw.contents) ? raw.contents : [];
  const contents = rawContents
    .slice(0, MAX_CONTENTS)
    .map((content) => {
      if (!content || typeof content !== "object") return null;
      const item = content as Record<string, unknown>;
      const type = str(item.type, MAX_CONTENT_TYPE_LENGTH);
      const ms = int(item.ms, { min: 0, max: MAX_DURATION_MS });
      if (!type || ms === null) return null;
      return {
        type,
        id: str(item.id, MAX_CONTENT_ID_LENGTH),
        label: str(item.label, MAX_SECTION_KEY_LENGTH),
        top: int(item.top, { min: 0, max: 10_000_000 }) ?? 0,
        ms,
        maxVisiblePct: int(item.maxVisiblePct, { min: 0, max: 100 }) ?? 0,
      };
    })
    .filter(
      (content): content is RegionDwellPayload["contents"][number] =>
        content !== null,
    );

  if (
    bands.every((ms) => ms === 0) &&
    sections.length === 0 &&
    contents.length === 0
  ) {
    return null;
  }
  return { bands, sections, contents };
}

export function normalizeEvent(
  input: unknown,
  now: number,
): CollectEventInput | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  if (!isUuid(raw.eventId) || !isUuid(raw.tabId)) return null;

  const eventName = str(raw.eventName, MAX_EVENT_NAME_LENGTH);
  if (!eventName) return null;

  return {
    eventId: raw.eventId,
    tabId: raw.tabId,
    seq: int(raw.seq, { min: 0, max: 2_000_000_000 }) ?? 0,
    pageViewId: isUuid(raw.pageViewId) ? raw.pageViewId : null,
    eventName,
    occurredAt: timestamp(raw.occurredAt, now),
    pagePath: str(raw.pagePath, MAX_PATH_LENGTH),
    pageQuery: str(raw.pageQuery, MAX_QUERY_LENGTH),
    pageTitle: str(raw.pageTitle, MAX_TITLE_LENGTH),
    pageReferrer: str(raw.pageReferrer, MAX_URL_LENGTH),
    engagedMs: int(raw.engagedMs, { min: 0, max: MAX_DURATION_MS }),
    visibleMs: int(raw.visibleMs, { min: 0, max: MAX_DURATION_MS }),
    msSincePageView: int(raw.msSincePageView, { min: 0, max: MAX_DURATION_MS }),
    scrollPct: int(raw.scrollPct, { min: 0, max: 100 }),
    maxScrollPct: int(raw.maxScrollPct, { min: 0, max: 100 }),
    scrollDepthPx: int(raw.scrollDepthPx, { min: 0, max: 10_000_000 }),
    pageHeightPx: int(raw.pageHeightPx, { min: 0, max: 10_000_000 }),
    regionDwell: regionDwell(raw.regionDwell),
    props: props(raw.props),
  };
}

export interface NormalizedCollectRequest {
  session: CollectSessionInput;
  events: CollectEventInput[];
}

/** リクエストボディ全体を検証する。使えない場合は null */
export function normalizeCollectRequest(
  body: unknown,
  now: number = Date.now(),
): NormalizedCollectRequest | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Partial<CollectRequestBody>;

  const session = normalizeSession(raw.session, now);
  if (!session) return null;

  if (!Array.isArray(raw.events) || raw.events.length === 0) return null;

  const events = raw.events
    .slice(0, MAX_EVENTS_PER_REQUEST)
    .map((event) => normalizeEvent(event, now))
    .filter((event): event is CollectEventInput => event !== null);

  if (events.length === 0) return null;

  return { session, events };
}
