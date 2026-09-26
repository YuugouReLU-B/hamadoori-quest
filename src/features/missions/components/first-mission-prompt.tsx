import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { MissionIcon } from "@/features/missions/components/mission-icon";
import type { Tables } from "@/lib/types/supabase";
import { formatPoints } from "@/lib/utils/format-points";

type FirstMissionPromptProps = {
  mission: Pick<Tables<"missions">, "slug" | "title" | "icon_url" | "points">;
};

/**
 * bot_promptでの自動友だち追加が確認できなかった場合に表示する案内。
 *
 * 「達成しました！」だけの画面を見せるのではなく、最初のクエストへ
 * 誘導しつつ、後回しにしたい人向けにスキップも用意する。
 */
export function FirstMissionPrompt({ mission }: FirstMissionPromptProps) {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 text-center">
      <p className="text-xs font-bold text-gray-500">
        浜通りクエストへようこそ
      </p>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">
        初回ミッションに挑戦してみよう
      </h1>
      <p className="mt-3 text-sm text-gray-600">
        「{mission.title}」から浜通りクエストがはじまります。
      </p>

      <Link
        href={`/missions/${mission.slug}`}
        className="mt-6 flex items-center gap-3 rounded-xl border-2 bg-white p-4 text-left transition-transform hover:-translate-y-0.5"
      >
        {mission.icon_url && (
          <MissionIcon src={mission.icon_url} alt="" size="md" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900">{mission.title}</p>
          <p className="text-xs font-bold text-yellow-700">
            +{formatPoints(mission.points)}
          </p>
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-gray-400"
          aria-hidden="true"
        />
      </Link>

      <Link
        href="/"
        className="mt-6 inline-block text-sm text-gray-500 underline underline-offset-4"
      >
        あとで挑戦する（スキップ）
      </Link>
    </div>
  );
}
