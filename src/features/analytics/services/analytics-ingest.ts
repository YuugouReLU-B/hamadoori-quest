import { createAdminClient } from "@/lib/supabase/adminClient";
import type { TablesInsert } from "@/lib/types/supabase";
import type {
  CollectEventInput,
  CollectSessionInput,
  ResolvedRequestContext,
} from "../types";
import { classifyChannel, extractHost } from "../utils/attribution";

/**
 * 収集したイベントをDBに書き込む。
 *
 * RLSはポリシーを持たないので、書き込みは service_role（createAdminClient）でのみ通る。
 * 認可はここではなく呼び出し元（route handler）の責務だが、このエンドポイントに関しては
 * 「誰でも自分の行動を送れる」のが仕様なので、route側では認可ではなく検証だけを行う。
 */

export interface IngestAnalyticsInput {
  session: CollectSessionInput;
  events: CollectEventInput[];
  context: ResolvedRequestContext;
  /** サーバーが発行・管理する訪問者ID */
  visitorId: string;
  /** サーバーのセッションから解決したユーザーID。未ログインなら null */
  userId: string | null;
  /** 自サイトのホスト名。参照元が内部か外部かの判定に使う */
  currentHost: string | null;
}

export async function ingestAnalytics({
  session,
  events,
  context,
  visitorId,
  userId,
  currentHost,
}: IngestAnalyticsInput): Promise<void> {
  const supabase = await createAdminClient();

  const channel = classifyChannel({
    referrer: session.referrer,
    currentHost,
    utmMedium: session.utmMedium,
    utmSource: session.utmSource,
    campaignCode: session.campaignCode,
    referralCode: session.referralCode,
  });

  const sessionRow: TablesInsert<"analytics_sessions"> = {
    id: session.sessionId,
    visitor_id: visitorId,
    user_id: userId,
    started_at: session.startedAt,
    last_seen_at: new Date().toISOString(),
    landing_path: session.landingPath ?? null,
    landing_query: session.landingQuery ?? null,
    referrer: session.referrer ?? null,
    referrer_host: extractHost(session.referrer),
    channel,
    utm_source: session.utmSource ?? null,
    utm_medium: session.utmMedium ?? null,
    utm_campaign: session.utmCampaign ?? null,
    utm_term: session.utmTerm ?? null,
    utm_content: session.utmContent ?? null,
    campaign_code: session.campaignCode ?? null,
    referral_code: session.referralCode ?? null,
    user_agent: context.userAgent,
    browser: context.browser,
    os: context.os,
    device_type: context.deviceType,
    viewport_width: session.viewportWidth ?? null,
    viewport_height: session.viewportHeight ?? null,
    screen_width: session.screenWidth ?? null,
    screen_height: session.screenHeight ?? null,
    language: session.language ?? null,
    timezone: session.timezone ?? null,
    ip_address: context.ipAddress,
    ip_country: context.ipCountry,
    ip_region: context.ipRegion,
    ip_city: context.ipCity,
    ip_latitude: context.ipLatitude,
    ip_longitude: context.ipLongitude,
    is_bot: context.isBot,
  };

  // 初回だけ流入元を確定させる。以降のリクエストで landing / referrer を
  // 上書きしてしまうと「最初にどこから来たか」が失われるため ignoreDuplicates にする
  const { error: sessionError } = await supabase
    .from("analytics_sessions")
    .upsert(sessionRow, { onConflict: "id", ignoreDuplicates: true });

  if (sessionError) {
    throw new Error(`セッションの記録に失敗しました: ${sessionError.message}`);
  }

  // 最終アクティビティは毎回更新する。
  // user_id はセッション途中でログインした場合にだけ埋めたいので、
  // 未ログインのリクエストでは既存の値を消さないよう更新対象から外す
  const sessionUpdate: Record<string, string> = {
    last_seen_at: sessionRow.last_seen_at as string,
  };
  if (userId) {
    sessionUpdate.user_id = userId;
  }

  const { error: touchError } = await supabase
    .from("analytics_sessions")
    .update(sessionUpdate)
    .eq("id", session.sessionId);

  if (touchError) {
    throw new Error(`セッションの更新に失敗しました: ${touchError.message}`);
  }

  const eventRows: TablesInsert<"analytics_events">[] = events.map((event) => ({
    event_id: event.eventId,
    session_id: session.sessionId,
    visitor_id: visitorId,
    user_id: userId,
    tab_id: event.tabId,
    seq: event.seq,
    page_view_id: event.pageViewId ?? null,
    event_name: event.eventName,
    occurred_at: event.occurredAt,
    page_path: event.pagePath ?? null,
    page_query: event.pageQuery ?? null,
    page_title: event.pageTitle ?? null,
    page_referrer: event.pageReferrer ?? null,
    engaged_ms: event.engagedMs ?? null,
    visible_ms: event.visibleMs ?? null,
    ms_since_page_view: event.msSincePageView ?? null,
    scroll_pct: event.scrollPct ?? null,
    max_scroll_pct: event.maxScrollPct ?? null,
    scroll_depth_px: event.scrollDepthPx ?? null,
    page_height_px: event.pageHeightPx ?? null,
    gps_latitude: event.gps?.latitude ?? null,
    gps_longitude: event.gps?.longitude ?? null,
    gps_accuracy_m: event.gps?.accuracyMeters ?? null,
    region_dwell: (event.regionDwell ??
      null) as TablesInsert<"analytics_events">["region_dwell"],
    props: (event.props ?? {}) as TablesInsert<"analytics_events">["props"],
  }));

  // sendBeacon は再送され得るので、event_id 重複は黙って無視する
  const { error: eventsError } = await supabase
    .from("analytics_events")
    .upsert(eventRows, { onConflict: "event_id", ignoreDuplicates: true });

  if (eventsError) {
    throw new Error(`イベントの記録に失敗しました: ${eventsError.message}`);
  }
}
