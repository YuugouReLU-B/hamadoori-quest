import Link from "next/link";
import { listMissionsForDevTools } from "@/features/dev-tools/services/dev-missions";

export const dynamic = "force-dynamic";

/** 提出物の種別を日本語で説明する */
const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  NONE: "提出なし",
  TEXT: "テキスト",
  LINK: "URL",
  LINK_ACCESS: "リンクを開く",
  IMAGE: "画像",
  IMAGE_WITH_GEOLOCATION: "画像＋位置情報",
  QUIZ: "クイズ",
  EMAIL: "メール",
  REFERRAL: "紹介",
  REFERRED: "被紹介",
  POSTING: "ポスティング",
  POSTER: "ポスター",
  RESIDENTIAL_POSTER: "戸別ポスター",
  LINE_FRIEND: "公式LINE友だち追加",
};

export default async function DevMissionsPage() {
  const missions = await listMissionsForDevTools();
  const hiddenCount = missions.filter((mission) => mission.is_hidden).length;
  const featuredCount = missions.filter(
    (mission) => mission.is_featured,
  ).length;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-lg font-bold">クエスト一覧</h2>
        <p className="text-sm text-gray-600">
          全 {missions.length} 件（非公開 {hiddenCount} / 注目 {featuredCount}）
        </p>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        DBの <code className="rounded bg-gray-100 px-1.5 py-0.5">missions</code>{" "}
        テーブルの内容です。非公開のものも含みます。定義元は{" "}
        <code className="rounded bg-gray-100 px-1.5 py-0.5">
          mission_data/missions.yaml
        </code>{" "}
        で、
        <code className="rounded bg-gray-100 px-1.5 py-0.5">
          pnpm run mission:sync
        </code>{" "}
        で反映されます。
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2.5 font-bold">タイトル</th>
              <th className="px-3 py-2.5 font-bold">slug</th>
              <th className="px-3 py-2.5 font-bold">提出物</th>
              <th className="px-3 py-2.5 font-bold">難易度</th>
              <th className="px-3 py-2.5 font-bold">達成回数上限</th>
              <th className="px-3 py-2.5 font-bold">達成数</th>
              <th className="px-3 py-2.5 font-bold">カテゴリ</th>
              <th className="px-3 py-2.5 font-bold">状態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {missions.map((mission) => (
              <tr key={mission.id} className="hover:bg-gray-50">
                <td className="px-3 py-2.5">
                  {mission.slug ? (
                    <Link
                      href={`/missions/${mission.slug}`}
                      className="text-brand-ink underline underline-offset-2"
                    >
                      {mission.title}
                    </Link>
                  ) : (
                    mission.title
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-gray-500">
                  {mission.slug ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  {ARTIFACT_TYPE_LABELS[
                    mission.required_artifact_type ?? "NONE"
                  ] ?? mission.required_artifact_type}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {mission.difficulty ?? "—"}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {mission.max_achievement_count ?? "無制限"}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {mission.achievementCount.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600">
                  {mission.categories.length > 0
                    ? mission.categories.join(" / ")
                    : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {mission.is_featured && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800">
                        注目
                      </span>
                    )}
                    {mission.is_hidden && (
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-bold text-gray-700">
                        非公開
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
