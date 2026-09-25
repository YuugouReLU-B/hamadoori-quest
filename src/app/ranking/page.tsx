import { CurrentUserCard } from "@/features/ranking/components/current-user-card";
import {
  PeriodToggle,
  type RankingPeriod,
} from "@/features/ranking/components/period-toggle";
import { RankingTop } from "@/features/ranking/components/ranking-top";
import { getUserPeriodRanking } from "@/features/ranking/loaders/ranking-loaders";
import { getCurrentSeasonId } from "@/lib/loaders/seasons-loaders";

interface PageProps {
  searchParams: Promise<{
    period?: RankingPeriod;
  }>;
}

export default async function RankingPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const period = resolvedSearchParams.period || "daily";

  // 現在のシーズンIDを取得
  const currentSeasonId = await getCurrentSeasonId();

  // ユーザーランキング取得
  const userRanking = currentSeasonId
    ? await getUserPeriodRanking(currentSeasonId, period)
    : null;

  return (
    <div className="flex flex-col min-h-screen py-4 w-full">
      <h2 className="text-2xl font-bold text-center mb-4">ランキング</h2>
      <div className="w-full max-w-xl mx-auto px-4">
        <section className="max-w-lg mx-auto">
          {/* 期間選択トグル */}
          <section className="py-4">
            <PeriodToggle defaultPeriod={period} />
          </section>

          {/* ユーザーのランキングカード */}
          {userRanking && (
            <section className="py-4">
              <CurrentUserCard currentUser={userRanking} />
            </section>
          )}

          <section className="py-4">
            {/* ランキング */}
            <RankingTop limit={10} period={period} />
          </section>
        </section>
      </div>
    </div>
  );
}
