"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/features/analytics/utils/tracker";
import { cn } from "@/lib/utils/utils";
import Mission from "./mission-card";
import type { TaggedMission } from "./missions-tags";

function ChipRow({
  options,
  isSelected,
  onToggle,
}: {
  options: string[];
  isSelected: (value: string) => boolean;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {options.map((option) => {
        const selected = isSelected(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(option)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-gray-300 text-gray-700 hover:bg-gray-50",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

export function MissionsTagFilter({ missions }: { missions: TaggedMission[] }) {
  // 常設クエスト/特設クエストは単一選択（もう一度押すと解除）。
  // どちらを選んだかで下段のチップ（SNS/プレイヤー、または浜通り/東京）を切り替える
  const [selectedQuestType, setSelectedQuestType] = useState<string | null>(
    null,
  );
  const [selectedKinds, setSelectedKinds] = useState<Set<string>>(new Set());
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(
    new Set(),
  );

  const questTypeOptions = useMemo(
    () => Array.from(new Set(missions.map((m) => m.questType))),
    [missions],
  );

  const kindOptions = useMemo(
    () =>
      Array.from(
        new Set(
          missions
            .filter((m) => m.questType === selectedQuestType)
            .map((m) => m.kind),
        ),
      ),
    [missions, selectedQuestType],
  );

  const regionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          missions
            .filter((m) => m.questType === selectedQuestType)
            .map((m) => m.region),
        ),
      ),
    [missions, selectedQuestType],
  );

  const handleSelectQuestType = (value: string) => {
    setSelectedQuestType((prev) => (prev === value ? null : value));
    setSelectedKinds(new Set());
    setSelectedRegions(new Set());
  };

  const isSpecial = selectedQuestType === "特設クエスト";
  const isPermanent = selectedQuestType === "常設クエスト";

  const filtered = useMemo(() => {
    const result = missions.filter((m) => {
      if (selectedQuestType && m.questType !== selectedQuestType) return false;
      if (isPermanent && selectedKinds.size > 0 && !selectedKinds.has(m.kind))
        return false;
      if (
        isSpecial &&
        selectedRegions.size > 0 &&
        !selectedRegions.has(m.region)
      )
        return false;
      return true;
    });

    // 達成済みは下に沈める（Array.prototype.sortは安定ソートなので、
    // それ以外の並び順は元の並び順のまま保たれる）
    return [...result].sort((a, b) => Number(a.achieved) - Number(b.achieved));
  }, [
    missions,
    selectedQuestType,
    isPermanent,
    isSpecial,
    selectedKinds,
    selectedRegions,
  ]);

  // 絞り込みの操作を記録する。
  // 個々のチップの onClick ではなく確定後の状態を見るのは、結果件数まで一緒に残したいため。
  // 初回描画（何も選んでいない状態）は操作ではないので送らない
  const lastTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    const snapshot = JSON.stringify({
      questType: selectedQuestType,
      kinds: Array.from(selectedKinds).sort(),
      regions: Array.from(selectedRegions).sort(),
    });
    if (lastTrackedRef.current === null) {
      lastTrackedRef.current = snapshot;
      return;
    }
    if (lastTrackedRef.current === snapshot) return;
    lastTrackedRef.current = snapshot;

    trackEvent("filter_change", {
      props: {
        questType: selectedQuestType,
        kinds: Array.from(selectedKinds).sort(),
        regions: Array.from(selectedRegions).sort(),
        // 絞り込んだ結果が0件なら、選択肢の組み合わせに無理がある
        resultCount: filtered.length,
        totalCount: missions.length,
      },
    });
  }, [
    selectedQuestType,
    selectedKinds,
    selectedRegions,
    filtered.length,
    missions.length,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <ChipRow
          options={questTypeOptions}
          isSelected={(value) => value === selectedQuestType}
          onToggle={handleSelectQuestType}
        />
        {isPermanent && (
          <ChipRow
            options={kindOptions}
            isSelected={(value) => selectedKinds.has(value)}
            onToggle={(value) =>
              setSelectedKinds((prev) => toggleInSet(prev, value))
            }
          />
        )}
        {isSpecial && (
          <ChipRow
            options={regionOptions}
            isSelected={(value) => selectedRegions.has(value)}
            onToggle={(value) =>
              setSelectedRegions((prev) => toggleInSet(prev, value))
            }
          />
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-gray-500">
          条件に合うクエストが見つかりませんでした
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 md:px-0 lg:grid-cols-3">
          {filtered.map(({ mission, userAchievementCount }) => (
            <Mission
              key={mission.id}
              mission={mission}
              userAchievementCount={userAchievementCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
