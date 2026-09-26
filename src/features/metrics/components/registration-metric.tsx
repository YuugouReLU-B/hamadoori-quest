import type { RegistrationData } from "@/features/metrics/types/metrics-types";
import { formatNumber } from "@/lib/utils/metrics-formatter";

interface RegistrationMetricProps {
  data: RegistrationData | null;
}

/**
 * 登録者数表示コンポーネント
 *
 * 浜通りクエストの登録者数（public_user_profiles の件数）と、
 * 過去24時間の増加数を表示します。
 */
export function RegistrationMetric({ data }: RegistrationMetricProps) {
  const registrationCount = data?.totalCount ?? 0;
  const registrationIncrease = data?.todayCount ?? 0;

  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base text-black">登録者数</p>
        </div>
        <div className="text-right">
          {/* 総登録者数（大きく表示） */}
          <p className="text-2xl font-bold text-gray-800">
            {formatNumber(registrationCount)}
            <span className="text-lg">人</span>
          </p>
          {/* 24時間の増加数 */}
          <p className="text-xs text-gray-600">
            1日で{" "}
            <span className="font-bold text-teal-700">
              +{formatNumber(registrationIncrease)}人
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
