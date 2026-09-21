import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankingTop } from "@/features/ranking/components/ranking-top";

export default async function RankingSection() {
  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl md:text-3xl text-gray-900 mb-6 text-center">
        ランキング
      </h2>
      <Tabs defaultValue="daily" className="max-w-xl mx-auto px-4">
        <TabsList
          aria-label="ランキングの期間"
          className="grid w-full grid-cols-2"
        >
          <TabsTrigger value="daily" data-analytics-id="ranking-tab-daily">
            今日
          </TabsTrigger>
          <TabsTrigger value="all" data-analytics-id="ranking-tab-all">
            全期間
          </TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-4">
          <RankingTop limit={3} period="daily" title="今日のトップ3" />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <RankingTop limit={3} title="全期間トップ3" />
        </TabsContent>
      </Tabs>
      <div className="mt-6 flex justify-center">
        <Link
          href={"/ranking"}
          data-analytics-id="ranking-see-top100"
          className="flex items-center hover:text-teal-700 self-center"
        >
          トップ100を見る
          <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
    </div>
  );
}
