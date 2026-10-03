import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { isCreatableArtifactType } from "@/features/admin/constants/creatable-artifact-types";
import {
  type MissionSchemaOutput,
  missionSchema,
} from "@/features/admin/schemas/mission-schema";
import { setMissionCategories } from "@/features/admin/services/admin-categories";
import { issueQrCode } from "@/features/qr-spot/services/qr-code";
import { ARTIFACT_TYPES } from "@/lib/types/artifact-types";
import type { Database } from "@/lib/types/supabase";

/**
 * イベント登録CSVの1行を管理画面フォームと同じスキーマ（missionSchema）に合わせて解釈する。
 * 一括登録の対象は現地訪問系（QR / GEO_CHECKIN）に限定する。
 */

export type MissionCsvRow = {
  rowNumber: number;
  categorySlug: string | null;
  /** バリデーション・coerce済みの値。エラーがある行はnull */
  data: MissionSchemaOutput | null;
  errors: string[];
};

function emptyToNull(value: string | undefined): string | null {
  const text = (value ?? "").trim();
  return text === "" ? null : text;
}

/**
 * CSVテキストを行ごとに検証する。DBへの書き込みは行わない。
 *
 * ヘッダー: slug, title, content, required_artifact_type, points, difficulty,
 * event_date, latitude, longitude, radius_meters, icon_url, category_slug,
 * is_featured, is_hidden, quest_category（省略時PERMANENT）, event_category（任意）
 */
export function parseMissionCsv(csvText: string): MissionCsvRow[] {
  let records: Record<string, string>[];
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    });
  } catch (error) {
    return [
      {
        rowNumber: 0,
        categorySlug: null,
        data: null,
        errors: [
          `CSVの解析に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        ],
      },
    ];
  }

  return records.map((record, index) => {
    const rowNumber = index + 2; // ヘッダー行の次から1行目
    const errors: string[] = [];

    const requiredArtifactType = emptyToNull(record.required_artifact_type);
    if (
      requiredArtifactType &&
      !isCreatableArtifactType(requiredArtifactType)
    ) {
      errors.push(
        `required_artifact_typeはGEO_CHECKINのみ指定できます（入力値: ${requiredArtifactType}）`,
      );
    }

    const categorySlug = emptyToNull(record.category_slug);

    const candidate = {
      slug: emptyToNull(record.slug) ?? "",
      title: emptyToNull(record.title) ?? "",
      content: emptyToNull(record.content),
      icon_url: emptyToNull(record.icon_url),
      quest_category: emptyToNull(record.quest_category) ?? "PERMANENT",
      event_category: emptyToNull(record.event_category),
      required_artifact_type: requiredArtifactType ?? "",
      difficulty: emptyToNull(record.difficulty) ?? "1",
      points: emptyToNull(record.points) ?? "0",
      max_achievement_count: 1,
      is_featured: record.is_featured?.trim().toLowerCase() === "true",
      is_hidden: record.is_hidden?.trim().toLowerCase() === "true",
      event_date: emptyToNull(record.event_date),
      artifact_label: null,
      latitude: emptyToNull(record.latitude),
      longitude: emptyToNull(record.longitude),
      radius_meters: emptyToNull(record.radius_meters),
    };

    const parsed = missionSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(issue.message);
      }
    }

    if (!categorySlug) {
      errors.push("category_slugは必須です");
    }

    return {
      rowNumber,
      categorySlug,
      data: errors.length === 0 && parsed.success ? parsed.data : null,
      errors,
    };
  });
}

export type MissionCsvImportResult = {
  succeeded: Array<{ rowNumber: number; missionId: string }>;
  failed: Array<{ rowNumber: number; errors: string[] }>;
};

/**
 * 検証済みの行をDBへ登録する。エラーがある行は事前に除外しておくこと。
 * QRミッションは登録と同時にQRコードを発行する。
 */
export async function importMissionCsvRows(
  supabase: SupabaseClient<Database>,
  rows: MissionCsvRow[],
): Promise<MissionCsvImportResult> {
  const succeeded: MissionCsvImportResult["succeeded"] = [];
  const failed: MissionCsvImportResult["failed"] = [];

  const { data: categories } = await supabase
    .from("mission_category")
    .select("id, slug")
    .eq("del_flg", false);
  const categoryIdBySlug = new Map(
    (categories ?? []).map((c) => [c.slug, c.id]),
  );

  for (const row of rows) {
    if (!row.data || row.errors.length > 0) {
      failed.push({ rowNumber: row.rowNumber, errors: row.errors });
      continue;
    }

    const categoryId = row.categorySlug
      ? categoryIdBySlug.get(row.categorySlug)
      : undefined;
    if (!categoryId) {
      failed.push({
        rowNumber: row.rowNumber,
        errors: [`カテゴリが見つかりません: ${row.categorySlug}`],
      });
      continue;
    }

    const id = crypto.randomUUID();
    const { error } = await supabase
      .from("missions")
      .insert({ id, ...row.data });

    if (error) {
      failed.push({
        rowNumber: row.rowNumber,
        errors: [
          error.code === "23505"
            ? "そのslugは既に使われています"
            : `登録に失敗しました: ${error.message}`,
        ],
      });
      continue;
    }

    const linked = await setMissionCategories(supabase, id, [categoryId]);
    if (linked.error) {
      await supabase.from("missions").delete().eq("id", id);
      failed.push({ rowNumber: row.rowNumber, errors: [linked.error] });
      continue;
    }

    if (row.data.required_artifact_type === ARTIFACT_TYPES.QR.key) {
      const qrResult = await issueQrCode(supabase, id);
      if ("error" in qrResult) {
        failed.push({ rowNumber: row.rowNumber, errors: [qrResult.error] });
        continue;
      }
    }

    succeeded.push({ rowNumber: row.rowNumber, missionId: id });
  }

  return { succeeded, failed };
}
