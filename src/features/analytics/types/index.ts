/**
 * 自前アクセス解析の型定義。
 *
 * クライアントからサーバーへ送る形（Collect*）と、DBに入る形は意図的に分けている。
 * user_id / IPアドレス / IP由来の地域はクライアントを信用せず、必ずサーバー側で
 * セッションとリクエストヘッダから解決して付与する。
 */

/** 流入チャネル。analytics_sessions.channel に入る値 */
export type AnalyticsChannel =
  | "direct"
  | "organic_search"
  | "social"
  | "referral"
  | "campaign"
  | "internal";

/** 端末種別 */
export type AnalyticsDeviceType = "mobile" | "tablet" | "desktop" | "unknown";

/**
 * 計測イベント名。
 *
 * 文字列リテラルで縛らずに string も許すのは、ドメイン側で新しい計測点を足すときに
 * ここを触らずに済ませたいため。ただし既知のものは補完が効くようにしておく。
 */
export type AnalyticsEventName =
  // 自動計測
  | "page_view"
  | "page_engagement"
  | "scroll_depth"
  | "click"
  | "outbound_click"
  | "session_start"
  // ドメインイベント
  | "sign_up"
  | "sign_in"
  | "mission_view"
  | "mission_clear"
  | "qr_scan"
  | "geo_checkin"
  | "lottery_entry"
  | (string & {});

/** 端末で取得できた位置情報（GPSを既に利用している画面でのみ入る） */
export interface AnalyticsGeoPoint {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  /** 取得時刻(epoch ms)。古すぎる座標を使い回さないための鮮度判定に使う */
  capturedAt: number;
}

/**
 * セッションの属性。セッション内で不変の値だけを置く。
 * リクエストごとに送られるが、サーバー側では初回のみ確定させ以降は上書きしない。
 */
export interface CollectSessionInput {
  sessionId: string;
  startedAt: string;
  /** セッション最初のページ */
  landingPath?: string | null;
  landingQuery?: string | null;
  /** 外部サイトからの参照元。同一オリジンからの遷移は null にして送る */
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  campaignCode?: string | null;
  referralCode?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  screenWidth?: number | null;
  screenHeight?: number | null;
  language?: string | null;
  timezone?: string | null;
}

/** 1イベント分のペイロード */
export interface CollectEventInput {
  /** クライアント生成。再送時の冪等キー */
  eventId: string;
  tabId: string;
  seq: number;
  pageViewId?: string | null;
  eventName: AnalyticsEventName;
  occurredAt: string;

  pagePath?: string | null;
  pageQuery?: string | null;
  pageTitle?: string | null;
  pageReferrer?: string | null;

  engagedMs?: number | null;
  visibleMs?: number | null;
  msSincePageView?: number | null;
  scrollPct?: number | null;
  maxScrollPct?: number | null;
  scrollDepthPx?: number | null;
  pageHeightPx?: number | null;

  gps?: AnalyticsGeoPoint | null;

  /** ページ内のどこに何ミリ秒いたか。page_engagement にのみ入る */
  regionDwell?: RegionDwellPayload | null;

  props?: Record<string, unknown> | null;
}

/** ページを高さで10等分した帯と、セクション単位の滞在時間 */
export interface RegionDwellPayload {
  /** 先頭が最上部。要素数は REGION_BAND_COUNT */
  bands: number[];
  sections: {
    key: string;
    label: string | null;
    top: number;
    ms: number;
  }[];
}

/** POST /api/analytics/collect のリクエストボディ */
export interface CollectRequestBody {
  session: CollectSessionInput;
  events: CollectEventInput[];
}

/** リクエストヘッダから解決したサーバー側の付帯情報 */
export interface ResolvedRequestContext {
  ipAddress: string | null;
  ipCountry: string | null;
  ipRegion: string | null;
  ipCity: string | null;
  ipLatitude: number | null;
  ipLongitude: number | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  deviceType: AnalyticsDeviceType;
  isBot: boolean;
}
