import { ARTIFACT_TYPES } from "@/lib/types/artifact-types";

/**
 * 管理画面から新しく作れるクエストの種別。
 *
 * いま運用しているのは位置情報チェックイン・公式LINE友だち追加・紹介の3種類だけ。
 * LINE友だち・紹介は既存の各1件を使い続ける（同じ種別が増えると付与先が
 * 曖昧になる）ので、新規作成・複製・CSV取り込みで作れるのは位置情報チェックインだけにする。
 * それ以外の種別はコードは残っているが運用していない。
 *
 * 既存クエストの編集では、今の種別を保ったまま保存できる（種別の変更先はこの一覧に限る）。
 */
export const CREATABLE_ARTIFACT_TYPES: readonly string[] = [
  ARTIFACT_TYPES.GEO_CHECKIN.key,
];

export function isCreatableArtifactType(
  artifactType: string | null | undefined,
): boolean {
  return !!artifactType && CREATABLE_ARTIFACT_TYPES.includes(artifactType);
}
