"use client";

import { useMemo, useState } from "react";
import { MissionsGoogleMap } from "@/features/missions/components/missions-google-map";
import type { TaggedMission } from "@/features/missions/components/missions-tags";
import type { MapSpot } from "@/features/spot-map/services/spot-map";
import { useCurrentLocation } from "@/lib/hooks/use-current-location";
import { calculateDistanceMeters } from "@/lib/utils/geo-distance";
import Mission from "./mission-card";

type MissionsMapViewProps = {
  missions: TaggedMission[];
};

/**
 * ミッション一覧の地図モード。
 *
 * ピンを選ぶとそのミッションが一覧の一番上に来る。選んでいなければ
 * 現在地から近い順に並べる。
 */
export function MissionsMapView({ missions }: MissionsMapViewProps) {
  // 地図インスタンスに紐付けない使い方（現在地の取得だけ利用する）。
  // 現在地は地図の「現在地へ」を押したときだけ取得する
  const { currentPos, status, errorMessage, requestLocation } =
    useCurrentLocation(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pins: MapSpot[] = useMemo(
    () =>
      missions.map(({ mission, achieved }) => ({
        id: mission.id,
        slug: mission.slug,
        title: mission.title,
        points: 0,
        latitude: mission.latitude as number,
        longitude: mission.longitude as number,
        achieved,
        googleMapUrl: mission.google_map_url,
      })),
    [missions],
  );

  const sortedMissions = useMemo(() => {
    const selected = missions.find((m) => m.mission.id === selectedId);
    const rest = missions.filter((m) => m.mission.id !== selectedId);

    const sortedRest = currentPos
      ? [...rest].sort(
          (a, b) =>
            calculateDistanceMeters(
              currentPos[0],
              currentPos[1],
              a.mission.latitude as number,
              a.mission.longitude as number,
            ) -
            calculateDistanceMeters(
              currentPos[0],
              currentPos[1],
              b.mission.latitude as number,
              b.mission.longitude as number,
            ),
        )
      : rest;

    return selected ? [selected, ...sortedRest] : sortedRest;
  }, [missions, selectedId, currentPos]);

  return (
    <div className="space-y-4">
      <MissionsGoogleMap
        spots={pins}
        currentPos={currentPos}
        onRequestLocation={requestLocation}
        locating={status === "locating"}
        locationError={errorMessage}
        selectedSpotId={selectedId}
        onSelectSpot={setSelectedId}
      />
      <p className="text-sm text-gray-600">
        {selectedId
          ? "選んだ場所を一番上に表示しています"
          : currentPos
            ? "現在地から近い順に並んでいます"
            : "「現在地へ」を押すと、近い順に並び替わります"}
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedMissions.map(({ mission, userAchievementCount }) => (
          <Mission
            key={mission.id}
            mission={mission}
            userAchievementCount={userAchievementCount}
          />
        ))}
      </div>
    </div>
  );
}
