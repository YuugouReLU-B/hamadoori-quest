import { createAdminClient } from "@/lib/supabase/adminClient";
import type { Database } from "@/lib/types/supabase";

/**
 * 管理画面向けの集計読み取り。
 *
 * 集計そのものはDB関数側にある（20260918091000_add_analytics_report_functions.sql）。
 * これらの関数は service_role にしか EXECUTE 権限がないので、必ず
 * createAdminClient 経由で呼ぶ。認可（isAdmin）は呼び出し元のページで行う。
 */

type Fn = Database["public"]["Functions"];

export type AnalyticsOverview = Fn["analytics_overview"]["Returns"][number];
export type AnalyticsChannelRow = Fn["analytics_by_channel"]["Returns"][number];
export type AnalyticsReferrerRow =
  Fn["analytics_by_referrer"]["Returns"][number];
export type AnalyticsPageRow = Fn["analytics_by_page"]["Returns"][number];
export type AnalyticsFlowRow = Fn["analytics_page_flow"]["Returns"][number];
export type AnalyticsLocationRow =
  Fn["analytics_by_location"]["Returns"][number];
export type AnalyticsAcquisitionRow =
  Fn["analytics_acquisitions"]["Returns"][number];
export type AnalyticsSessionRow =
  Fn["analytics_recent_sessions"]["Returns"][number];
export type AnalyticsTimelineRow =
  Fn["analytics_session_timeline"]["Returns"][number];
export type AnalyticsVisitFrequencyRow =
  Fn["analytics_visit_frequency"]["Returns"][number];
export type AnalyticsVisitorRow =
  Fn["analytics_visitor_activity"]["Returns"][number];
export type AnalyticsHourRow = Fn["analytics_by_hour"]["Returns"][number];
export type AnalyticsClickRow =
  Fn["analytics_click_targets"]["Returns"][number];
export type AnalyticsBandRow = Fn["analytics_page_bands"]["Returns"][number];
export type AnalyticsSectionRow =
  Fn["analytics_page_sections"]["Returns"][number];
export type AnalyticsContentRow =
  Fn["analytics_content_dwell"]["Returns"][number];
export type QuestSequenceRow =
  Fn["analytics_quest_sequence"]["Returns"][number];
export type QuestTimingRow =
  Fn["analytics_quest_step_timing"]["Returns"][number];
export type QuestProgressionRow =
  Fn["analytics_quest_progression"]["Returns"][number];
export type QuestTransitionRow =
  Fn["analytics_quest_transitions"]["Returns"][number];
export type QuestJourneyRow =
  Fn["analytics_user_quest_journey"]["Returns"][number];

export interface AnalyticsPeriod {
  from: Date;
  to: Date;
}

/** 直近 days 日間（終端は現在時刻） */
export function recentPeriod(days: number): AnalyticsPeriod {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

function range({ from, to }: AnalyticsPeriod) {
  return { from_ts: from.toISOString(), to_ts: to.toISOString() };
}

/**
 * ダッシュボードが必要とする集計をまとめて取得する。
 *
 * 個々の関数は互いに独立しているので並列に投げる。
 * 1つでも落ちたらページ全体をエラーにする（部分的に欠けた数字を
 * そのまま見せるほうが判断を誤らせるため）。
 */
export async function getAnalyticsDashboard(period: AnalyticsPeriod) {
  const supabase = await createAdminClient();
  const args = range(period);

  const [
    overview,
    channels,
    referrers,
    pages,
    flows,
    locations,
    acquisitions,
    sessions,
    visitFrequency,
    visitors,
    hours,
    clicks,
    bands,
    sections,
    contents,
    questSequence,
    questTiming,
    questProgression,
    questTransitions,
    questJourneys,
  ] = await Promise.all([
    supabase.rpc("analytics_overview", args),
    supabase.rpc("analytics_by_channel", args),
    supabase.rpc("analytics_by_referrer", { ...args, row_limit: 30 }),
    supabase.rpc("analytics_by_page", { ...args, row_limit: 50 }),
    supabase.rpc("analytics_page_flow", { ...args, row_limit: 40 }),
    supabase.rpc("analytics_by_location", { ...args, row_limit: 40 }),
    supabase.rpc("analytics_acquisitions", { ...args, row_limit: 40 }),
    supabase.rpc("analytics_recent_sessions", { ...args, row_limit: 40 }),
    supabase.rpc("analytics_visit_frequency", args),
    supabase.rpc("analytics_visitor_activity", { ...args, row_limit: 60 }),
    supabase.rpc("analytics_by_hour", args),
    supabase.rpc("analytics_click_targets", { ...args, row_limit: 60 }),
    // 帯はページをまたいで平均しても意味が保たれるので、既定は全ページ合算
    supabase.rpc("analytics_page_bands", { ...args, target_path: undefined }),
    supabase.rpc("analytics_page_sections", { ...args, row_limit: 60 }),
    supabase.rpc("analytics_content_dwell", { ...args, row_limit: 80 }),
    // クエスト達成の順番・期間は achievements だけで出るので、
    // 行動計測を入れる前の過去データにもそのまま効く
    supabase.rpc("analytics_quest_sequence", {
      ...args,
      max_step: 5,
      row_limit: 60,
    }),
    supabase.rpc("analytics_quest_step_timing", { ...args, max_step: 10 }),
    supabase.rpc("analytics_quest_progression", { ...args, max_step: 10 }),
    supabase.rpc("analytics_quest_transitions", { ...args, row_limit: 40 }),
    supabase.rpc("analytics_user_quest_journey", { ...args, row_limit: 60 }),
  ]);

  const failed = [
    overview,
    channels,
    referrers,
    pages,
    flows,
    locations,
    acquisitions,
    sessions,
    visitFrequency,
    visitors,
    hours,
    clicks,
    bands,
    sections,
    contents,
    questSequence,
    questTiming,
    questProgression,
    questTransitions,
    questJourneys,
  ].find((result) => result.error);

  if (failed?.error) {
    throw new Error(
      `アクセス解析の集計に失敗しました: ${failed.error.message}`,
    );
  }

  return {
    overview: overview.data?.[0] ?? null,
    channels: channels.data ?? [],
    referrers: referrers.data ?? [],
    pages: pages.data ?? [],
    flows: flows.data ?? [],
    locations: locations.data ?? [],
    acquisitions: acquisitions.data ?? [],
    sessions: sessions.data ?? [],
    visitFrequency: visitFrequency.data ?? [],
    visitors: visitors.data ?? [],
    hours: hours.data ?? [],
    clicks: clicks.data ?? [],
    bands: bands.data ?? [],
    sections: sections.data ?? [],
    contents: contents.data ?? [],
    questSequence: questSequence.data ?? [],
    questTiming: questTiming.data ?? [],
    questProgression: questProgression.data ?? [],
    questTransitions: questTransitions.data ?? [],
    questJourneys: questJourneys.data ?? [],
  };
}

export type AnalyticsDashboard = Awaited<
  ReturnType<typeof getAnalyticsDashboard>
>;

/** 1セッションの行動を時系列で取得する */
export async function getSessionTimeline(
  sessionId: string,
): Promise<AnalyticsTimelineRow[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.rpc("analytics_session_timeline", {
    target_session_id: sessionId,
  });

  if (error) {
    throw new Error(`セッションの取得に失敗しました: ${error.message}`);
  }
  return data ?? [];
}
