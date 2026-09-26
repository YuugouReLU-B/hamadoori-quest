import { User } from "lucide-react";
import type React from "react";
import { UserName } from "@/components/common/user-name";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatUserDisplayName,
  formatUserPrefecture,
} from "../utils/ranking-utils";

interface BaseCurrentUserCardProps {
  currentUser: {
    user_id: string;
    name: string | null;
    address_prefecture: string | null;
    rank: number | null;
  } | null;
  title?: string;
  children: React.ReactNode;
}

export const BaseCurrentUserCard: React.FC<BaseCurrentUserCardProps> = ({
  currentUser,
  title = "あなたのランク",
  children,
}) => {
  if (!currentUser) {
    return null;
  }

  const displayUser = {
    ...currentUser,
    rank: currentUser.rank || 0,
    name: formatUserDisplayName(currentUser.name),
    address_prefecture: formatUserPrefecture(currentUser.address_prefecture),
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="border-teal-200 bg-teal-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-teal-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {displayUser.rank}
              </div>
              <div>
                <UserName
                  name={displayUser.name}
                  nameClassName="font-bold text-gray-900"
                />
                {/* 都道府県は表示しない（ranking-item と同じ理由） */}
              </div>
            </div>
            <div className="text-right">{children}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
