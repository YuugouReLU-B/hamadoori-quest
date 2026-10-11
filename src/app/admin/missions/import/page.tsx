import Link from "next/link";
import { MissionCsvImportForm } from "@/features/admin/components/mission-csv-import-form";
import { listCategorySlugsForAdmin } from "@/features/admin/services/admin-categories";

export const dynamic = "force-dynamic";

const CSV_COLUMNS = [
  "slug",
  "title",
  "content",
  "required_artifact_type",
  "points",
  "difficulty",
  "event_date",
  "latitude",
  "longitude",
  "radius_meters",
  "icon_url",
  "category_slug",
  "is_featured",
  "is_hidden",
  "event_category",
];

export default async function MissionCsvImportPage() {
  const categories = await listCategorySlugsForAdmin();

  return (
    <section>
      <div className="mb-4">
        <Link
          href="/admin/missions"
          className="text-sm text-gray-500 underline underline-offset-2"
        >
          ← クエスト一覧
        </Link>
        <h2 className="mt-1 text-lg font-bold">イベントをCSVで一括登録</h2>
        <p className="mt-1 text-sm text-gray-600">
          対象は現地訪問系クエスト（QR / GEO_CHECKIN）のみ。
          作成されたクエストは非公開のまま登録されるので、
          内容を確認してから一覧で公開に切り替えてください。
          QRクエストは登録と同時にQRコードも発行されます。
        </p>
      </div>

      <div className="mb-6 rounded-lg border bg-gray-50 p-4 text-sm">
        <p className="mb-2 font-bold">CSVのヘッダー（1行目）</p>
        <p className="mb-3 break-all font-mono text-xs text-gray-700">
          {CSV_COLUMNS.join(",")}
        </p>
        <ul className="mb-3 list-disc space-y-1 pl-5 text-gray-700">
          <li>
            <code>required_artifact_type</code>: <code>QR</code> または{" "}
            <code>GEO_CHECKIN</code>
          </li>
          <li>
            <code>GEO_CHECKIN</code>の場合、<code>latitude</code> /{" "}
            <code>longitude</code> / <code>radius_meters</code>
            は必須
          </li>
          <li>
            <code>event_category</code>: <code>SPOT</code> / <code>SPORTS</code>{" "}
            / <code>ART</code> / <code>FOOD</code> / <code>MIXED</code>{" "}
            のいずれか（必須）
          </li>
          <li>
            <code>is_featured</code> / <code>is_hidden</code>: 省略可（既定は
            false）。指定する場合は <code>true</code> / <code>false</code>
          </li>
          <li>
            <code>max_achievement_count</code>は常に1固定（CSVに列は不要）
          </li>
        </ul>
        <p className="mb-1 font-bold">利用できるcategory_slug</p>
        <ul className="space-y-0.5 text-gray-700">
          {categories.map((c) => (
            <li key={c.slug}>
              <code>{c.slug}</code> — {c.title}
            </li>
          ))}
        </ul>
      </div>

      <MissionCsvImportForm />
    </section>
  );
}
