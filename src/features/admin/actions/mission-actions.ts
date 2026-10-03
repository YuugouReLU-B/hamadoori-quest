"use server";

import { revalidatePath } from "next/cache";
import { isCreatableArtifactType } from "@/features/admin/constants/creatable-artifact-types";
import { missionSchema } from "@/features/admin/schemas/mission-schema";
import {
  copyMissionCategories,
  setMissionCategories,
} from "@/features/admin/services/admin-categories";
import { requireAdmin } from "@/features/admin/services/authorize-admin";
import { issueQrCode } from "@/features/qr-spot/services/qr-code";
import { createAdminClient } from "@/lib/supabase/adminClient";

/** 新しく作れない種別を指定されたときの案内 */
const NOT_CREATABLE_ERROR =
  "達成の種類は「位置情報チェックイン」だけが選べます（LINE友だち・紹介のクエストは既存のものを使ってください）";

export type AdminActionResult =
  | { success: true; missionId: string }
  | { success: false; error: string };

/** 空文字は「未入力」として null に寄せる。フォームからは "" で飛んでくる */
function emptyToNull(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? null : text;
}

/**
 * チェックされたカテゴリを取り出す。
 *
 * 1つも選ばれていなければ空配列になり、紐付けは全解除される。
 * 「どのカテゴリにも入れない＝トップページに出さない」を意図した操作として扱う。
 */
function parseCategoryIds(formData: FormData): string[] {
  const ids = formData
    .getAll("category_ids")
    .filter(
      (value): value is string => typeof value === "string" && value !== "",
    );
  return Array.from(new Set(ids));
}

function parseMissionForm(formData: FormData) {
  return missionSchema.safeParse({
    slug: String(formData.get("slug") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    content: emptyToNull(formData.get("content")),
    quest_category: formData.get("quest_category"),
    event_category: emptyToNull(formData.get("event_category")),
    ogp_image_url: emptyToNull(formData.get("ogp_image_url")),
    required_artifact_type: String(
      formData.get("required_artifact_type") ?? "",
    ),
    difficulty: formData.get("difficulty"),
    points: formData.get("points"),
    max_achievement_count: emptyToNull(formData.get("max_achievement_count")),
    is_featured: formData.get("is_featured") === "on",
    is_hidden: formData.get("is_hidden") === "on",
    event_date: emptyToNull(formData.get("event_date")),
    event_end_date: emptyToNull(formData.get("event_end_date")),
    event_type: emptyToNull(formData.get("event_type")),
    artifact_label: emptyToNull(formData.get("artifact_label")),
    supplement: emptyToNull(formData.get("supplement")),
    tag1: emptyToNull(formData.get("tag1")),
    tag2: emptyToNull(formData.get("tag2")),
    tag3: emptyToNull(formData.get("tag3")),
    latitude: emptyToNull(formData.get("latitude")),
    longitude: emptyToNull(formData.get("longitude")),
    radius_meters: emptyToNull(formData.get("radius_meters")),
    address: emptyToNull(formData.get("address")),
    google_map_url: emptyToNull(formData.get("google_map_url")),
  });
}

export async function createMission(
  formData: FormData,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = parseMissionForm(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  if (!isCreatableArtifactType(parsed.data.required_artifact_type)) {
    return { success: false, error: NOT_CREATABLE_ERROR };
  }

  const supabase = await createAdminClient();
  const id = crypto.randomUUID();

  const { error } = await supabase.from("missions").insert({
    id,
    ...parsed.data,
  });

  if (error) {
    console.error("ミッションの作成に失敗:", error);
    // slug の一意制約が最も踏みやすいので個別に案内する
    if (error.code === "23505") {
      return { success: false, error: "そのslugは既に使われています" };
    }
    return { success: false, error: `作成に失敗しました: ${error.message}` };
  }

  const linked = await setMissionCategories(
    supabase,
    id,
    parseCategoryIds(formData),
  );

  if (linked.error) {
    // カテゴリが付かないミッションはトップページに出ない。中途半端な状態を
    // 残すと原因が分かりにくいので、作ったミッションごと取り消してやり直させる
    await supabase.from("missions").delete().eq("id", id);
    return { success: false, error: linked.error };
  }

  revalidatePath("/admin/missions");
  return { success: true, missionId: id };
}

export async function updateMission(
  missionId: string,
  formData: FormData,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = parseMissionForm(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createAdminClient();

  // 種別は今のまま保存するか、新しく作れる種別にだけ変えられる
  const { data: current, error: currentError } = await supabase
    .from("missions")
    .select("required_artifact_type")
    .eq("id", missionId)
    .single();
  if (currentError || !current) {
    return { success: false, error: "クエストが見つかりません" };
  }
  if (
    parsed.data.required_artifact_type !== current.required_artifact_type &&
    !isCreatableArtifactType(parsed.data.required_artifact_type)
  ) {
    return { success: false, error: NOT_CREATABLE_ERROR };
  }

  const { error } = await supabase
    .from("missions")
    .update({
      ...parsed.data,
    })
    .eq("id", missionId);

  if (error) {
    console.error("ミッションの更新に失敗:", error);
    if (error.code === "23505") {
      return { success: false, error: "そのslugは既に使われています" };
    }
    return { success: false, error: `更新に失敗しました: ${error.message}` };
  }

  const linked = await setMissionCategories(
    supabase,
    missionId,
    parseCategoryIds(formData),
  );

  if (linked.error) {
    return { success: false, error: linked.error };
  }

  revalidatePath("/admin/missions");
  revalidatePath(`/admin/missions/${missionId}`);
  return { success: true, missionId };
}

/** 一覧から表示/非表示だけを切り替える */
export async function toggleMissionHidden(
  missionId: string,
  isHidden: boolean,
): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("missions")
    .update({ is_hidden: isHidden })
    .eq("id", missionId);

  if (error) {
    console.error("表示状態の変更に失敗:", error);
    return { success: false, error: `変更に失敗しました: ${error.message}` };
  }

  revalidatePath("/admin/missions");
  return { success: true, missionId };
}

/**
 * QRコードを発行する。既にあれば作り直す。
 *
 * **作り直すと印刷済みのQRは読めなくなる。** 呼び出し側で確認を取ること。
 */
export async function issueMissionQrCode(
  missionId: string,
): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = await createAdminClient();
  const result = await issueQrCode(supabase, missionId);

  if ("error" in result) {
    return { success: false, error: result.error };
  }

  revalidatePath("/admin/missions");
  revalidatePath(`/admin/missions/${missionId}`);
  return { success: true, missionId };
}

/**
 * ミッションを削除する。
 *
 * 達成記録が1件でもあると外部キー制約に阻まれて削除できない（安全装置）。
 * 過去に達成した人がいるミッションは、一覧に出したくないだけなら
 * 編集フォームの「公開する」チェックを外して非公開にする運用にする。
 */
export async function deleteMission(
  missionId: string,
): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("missions")
    .delete()
    .eq("id", missionId);

  if (error) {
    console.error("ミッションの削除に失敗:", error);
    if (error.code === "23503") {
      return {
        success: false,
        error:
          "すでに達成した人がいるため削除できません。一覧から消したいだけなら「公開する」のチェックを外してください",
      };
    }
    return { success: false, error: `削除に失敗しました: ${error.message}` };
  }

  revalidatePath("/admin/missions");
  return { success: true, missionId };
}

/**
 * ミッションを複製する。
 *
 * イベントごとにQRチェックインを作るとき、毎回フォームを埋め直すのは手間。
 * 複製してタイトルと日付だけ書き換える運用を想定している。
 *
 * **QRコードは引き継がない。** 同じコードを2つのスポットに配ると、
 * どちらを読んでも同じミッションが達成されてしまう。
 * 複製先では改めて発行する。
 *
 * カテゴリの紐付けは引き継ぐ。同じカテゴリに並べるための複製だから。
 */
export async function duplicateMission(
  missionId: string,
): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = await createAdminClient();
  const { data: source, error: fetchError } = await supabase
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .single();

  if (fetchError || !source) {
    return { success: false, error: "複製元のクエストが見つかりません" };
  }

  if (!isCreatableArtifactType(source.required_artifact_type)) {
    return {
      success: false,
      error: "複製できるのは位置情報チェックインのクエストだけです",
    };
  }

  const id = crypto.randomUUID();
  const {
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...rest
  } = source;

  const { error } = await supabase.from("missions").insert({
    ...rest,
    id,
    // slug は一意なので必ず変える。作成時刻で衝突を避ける
    slug: `${source.slug}-copy-${Date.now()}`,
    title: `${source.title}（コピー）`,
    // 内容を確認してから公開させる
    is_hidden: true,
  });

  if (error) {
    console.error("ミッションの複製に失敗:", error);
    return { success: false, error: `複製に失敗しました: ${error.message}` };
  }

  const copied = await copyMissionCategories(supabase, missionId, id);
  if (copied.error) {
    // ミッション自体は作れている。カテゴリだけ画面で選び直せば済むので消さない
    console.error("複製先へのカテゴリのコピーに失敗:", copied.error);
  }

  revalidatePath("/admin/missions");
  return { success: true, missionId: id };
}
