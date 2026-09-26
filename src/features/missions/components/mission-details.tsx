"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MissionIcon } from "@/features/missions/components/mission-icon";
import { getMissionRegionLabel } from "@/features/missions/constants/mission-regions";
import type { Tables } from "@/lib/types/supabase";
import { dateFormatter } from "@/lib/utils/date-formatters";
import { formatPoints } from "@/lib/utils/format-points";
import { googleMapsSearchUrl } from "@/lib/utils/map-links";

type MissionDetailsProps = {
  mission: Tables<"missions">;
};

export function MissionDetails({ mission }: MissionDetailsProps) {
  const { latitude, longitude } = mission;
  const hasLocation =
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  const regionLabel = getMissionRegionLabel(mission.region);
  const tags = [regionLabel, mission.tag1, mission.tag2, mission.tag3].filter(
    (tag): tag is string => Boolean(tag),
  );

  // 管理画面で入力されたGoogleマップURLを優先し、なければ座標から検索リンクを組み立てる
  const mapHref =
    mission.google_map_url ||
    (hasLocation ? googleMapsSearchUrl(latitude, longitude) : null);
  const hasPlaceInfo = Boolean(mission.address) || Boolean(mapHref);

  return (
    // 詳細ページ本体も計測上は1つのコンテンツとして扱う。
    // 一覧のカードと同じ mission タイプにすることで、
    // 「一覧で見られた時間」と「詳細で見られた時間」を同じクエストIDで突き合わせられる
    <Card
      data-analytics-content="mission-detail"
      data-analytics-content-id={mission.slug || mission.id}
      data-analytics-content-label={mission.title}
    >
      <CardHeader>
        <div className="flex items-center gap-4">
          {mission.icon_url && (
            <MissionIcon src={mission.icon_url} alt={mission.title} size="lg" />
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-xl">{mission.title}</CardTitle>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border px-2 py-0.5 text-xs font-medium text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <section aria-label="クエスト概要" className="space-y-4">
          <h2 className="font-bold">クエスト概要</h2>
          <dl className="space-y-4 text-sm leading-relaxed">
            {(mission.event_date || mission.event_end_date) && (
              <div className="flex flex-wrap items-baseline gap-1">
                <dt className="font-bold">日程：</dt>
                <dd>
                  {mission.event_date && (
                    <time dateTime={mission.event_date}>
                      {dateFormatter(new Date(mission.event_date))}
                    </time>
                  )}
                  {mission.event_date && mission.event_end_date && " 〜 "}
                  {mission.event_end_date && (
                    <time dateTime={mission.event_end_date}>
                      {dateFormatter(new Date(mission.event_end_date))}
                    </time>
                  )}
                </dd>
              </div>
            )}
            {hasPlaceInfo && (
              <div className="flex flex-wrap items-baseline gap-1">
                <dt className="font-bold">場所：</dt>
                <dd>
                  {mission.address && mapHref ? (
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center rounded-sm text-brand-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {mission.address}
                    </a>
                  ) : mission.address ? (
                    <p>{mission.address}</p>
                  ) : (
                    mapHref && (
                      <a
                        href={mapHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center rounded-sm text-brand-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        Googleマップで場所を開く（新しいタブ）
                      </a>
                    )
                  )}
                </dd>
              </div>
            )}
            {mission.content?.trim() && (
              <div className="space-y-1">
                <dt className="font-bold">内容</dt>
                <dd>
                  {/* 営業時間や予約条件を含む本文を、推測・抽出せずそのまま表示する。 */}
                  <div
                    className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words mission-content"
                    ref={(el) => {
                      if (el) {
                        el.innerHTML = mission.content ?? "";
                      }
                    }}
                  />
                </dd>
              </div>
            )}
            {mission.supplement?.trim() && (
              <div className="space-y-1">
                <dt className="font-bold">補足</dt>
                <dd className="whitespace-pre-wrap break-words">
                  {mission.supplement}
                </dd>
              </div>
            )}
            <div className="space-y-1 border-t pt-4">
              <dt className="font-bold">獲得ポイント</dt>
              <dd className="font-bold text-brand-ink">
                {formatPoints(mission.points)}
              </dd>
            </div>
          </dl>
        </section>
      </CardContent>
    </Card>
  );
}
