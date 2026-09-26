import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { Card } from "@/components/ui/card";

interface BaseRankingProps {
  title: string;
  children: React.ReactNode[];
  detailsHref?: string;
  showDetailedInfo?: boolean;
  detailsLinkText?: string;
  columns?: 3 | 4;
}

export const BaseRanking: React.FC<BaseRankingProps> = ({
  title,
  children,
  detailsHref,
  showDetailedInfo = false,
  detailsLinkText = "トップ10を見る",
  columns = 4,
}) => {
  // 達成者がいないのに大きな枠を出すと「人がいないサイト」に見えるので、1行で済ませる
  if (children.length === 0) {
    return (
      <div className="py-6 text-center">
        <h2 className="text-base text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">まだ達成者がいません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 md:p-8">
        <h2 className="text-xl md:text-2xl text-gray-900 mb-4 text-center">
          {title}
        </h2>
        <div
          className={
            columns === 3
              ? "grid grid-cols-[auto_1fr_auto] gap-x-3"
              : "grid grid-cols-[auto_1fr_auto_auto] gap-x-3"
          }
        >
          {children}
        </div>
      </Card>

      {showDetailedInfo && detailsHref && (
        <Link
          href={detailsHref}
          className="flex items-center text-teal-600 hover:text-teal-700 self-center"
        >
          {detailsLinkText}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      )}
    </div>
  );
};
