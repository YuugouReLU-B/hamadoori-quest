"use server";

import { revalidatePath } from "next/cache";
import {
  findLeftovers,
  getDeletionCandidate,
  getUserDataCounts,
  type UserDataCounts,
} from "@/features/admin/services/admin-user-deletion";
import { extractRoles } from "@/features/admin/services/admin-users";
import { requireAdmin } from "@/features/admin/services/authorize-admin";
import { deleteAccountByAdmin } from "@/features/user-profile/services/profile";
import { createAdminClient } from "@/lib/supabase/adminClient";

export type AdminUserActionResult =
  | { success: true }
  | { success: false; error: string };

const ADMIN_ROLE = "admin";

/**
 * 管理者権限を付け外しする。
 *
 * 権限は auth.users の app_metadata.roles で管理している。
 * posting-admin など他のロールを持っている場合もあるので、配列ごと
 * 置き換えずに admin だけを足し引きする。
 *
 * **自分自身からは外せない。** 最後の管理者が自分を降格させると誰も
 * 管理画面に入れなくなり、復旧にSQLを直接叩く必要が出てしまう。
 */
export async function setUserAdminRole(
  userId: string,
  shouldBeAdmin: boolean,
): Promise<AdminUserActionResult> {
  const currentUser = await requireAdmin();

  if (currentUser.id === userId && !shouldBeAdmin) {
    return {
      success: false,
      error:
        "自分自身の管理者権限は外せません。他の管理者から外してもらってください",
    };
  }

  const supabase = await createAdminClient();

  const { data: target, error: fetchError } =
    await supabase.auth.admin.getUserById(userId);
  if (fetchError || !target.user) {
    console.error("対象ユーザーの取得に失敗:", fetchError);
    return { success: false, error: "対象のユーザーが見つかりません" };
  }

  const currentRoles = extractRoles(target.user.app_metadata);
  const nextRoles = shouldBeAdmin
    ? Array.from(new Set([...currentRoles, ADMIN_ROLE]))
    : currentRoles.filter((role) => role !== ADMIN_ROLE);

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { ...target.user.app_metadata, roles: nextRoles },
  });

  if (error) {
    console.error("管理者権限の変更に失敗:", error);
    return { success: false, error: `変更に失敗しました: ${error.message}` };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export type AdminUserDeletionResult =
  | {
      success: true;
      countsBefore: UserDataCounts;
      countsAfter: UserDataCounts;
      /** 削除後も0件にならなかったテーブル（＝消し残し） */
      leftovers: string[];
      /** 削除記録のID。結果画面はこの記録から表示する。記録に失敗したら null */
      logId: string | null;
    }
  | { success: false; error: string };

/** 本人のファイルを置く Storage のバケット（ユーザーIDのフォルダに置かれる） */
const USER_STORAGE_BUCKETS = ["avatars", "mission_artifact_files"] as const;

/**
 * 管理者がユーザーのデータを削除する（お問い合わせフォームからの削除依頼に対応する）。
 *
 * 多重チェック:
 * 1. 管理者であること（requireAdmin）
 * 2. 自分自身ではないこと（自分を消すとセッションが無効になり結果も確認できない）
 * 3. 確認欄に入力された文字列が、対象のユーザーIDかニックネームと完全に一致すること
 *    （画面の取り違えで別人を消さないため。サーバー側でも必ず確かめる）
 * 4. 削除の前後で紐づくデータの件数を数え、消し残しを返す
 *
 * 削除は本人の退会と同じく `delete_user_account` → auth.users の順。
 * 誰がいつどのユーザーIDを消したかは admin_deletion_logs に残す（個人情報は残さない）。
 */
export async function deleteUserDataByAdmin(
  userId: string,
  confirmation: string,
): Promise<AdminUserDeletionResult> {
  const currentUser = await requireAdmin();

  if (currentUser.id === userId) {
    return {
      success: false,
      error: "自分自身はここから削除できません",
    };
  }

  const candidate = await getDeletionCandidate(userId);
  if (!candidate) {
    return { success: false, error: "対象のユーザーが見つかりません" };
  }

  const typed = confirmation.trim();
  const matches =
    typed === candidate.id || (!!candidate.name && typed === candidate.name);
  if (!matches) {
    return {
      success: false,
      error: "確認欄の入力が、対象のユーザーIDまたはニックネームと一致しません",
    };
  }

  let countsBefore: UserDataCounts;
  try {
    countsBefore = await getUserDataCounts(userId);
  } catch (error) {
    console.error("削除前の件数確認に失敗:", error);
    return { success: false, error: "削除前の件数確認に失敗しました" };
  }

  const supabase = await createAdminClient();

  try {
    // Storage 上の本人のファイル（DBの削除では消えない）
    for (const bucket of USER_STORAGE_BUCKETS) {
      const { data: files } = await supabase.storage.from(bucket).list(userId);
      const paths = (files ?? []).map((file) => `${userId}/${file.name}`);
      if (paths.length > 0) {
        const { error } = await supabase.storage.from(bucket).remove(paths);
        if (error) throw error;
      }
    }

    if (candidate.createdAt) {
      await deleteAccountByAdmin(userId);
    } else {
      // 認証ユーザーがすでに無く、プロフィール等だけ残っている場合
      const { error } = await supabase.rpc("delete_user_account", {
        target_user_id: userId,
      });
      if (error) throw error;
    }
  } catch (error) {
    console.error("管理者によるユーザーデータ削除に失敗:", error);
    return { success: false, error: "ユーザーデータの削除に失敗しました" };
  }

  let countsAfter: UserDataCounts = {};
  try {
    countsAfter = await getUserDataCounts(userId);
  } catch (error) {
    console.error("削除後の件数確認に失敗:", error);
  }

  const { data: log, error: logError } = await supabase
    .from("admin_deletion_logs")
    .insert({
      admin_user_id: currentUser.id,
      deleted_user_id: userId,
      counts_before: countsBefore,
      counts_after: countsAfter,
    })
    .select("id")
    .single();
  if (logError) {
    console.error("削除記録の保存に失敗:", logError);
  }

  // 削除画面そのものは再描画しない（対象が消えた画面で再描画するとフォームごと消え、
  // 結果が見えなくなる）。結果は削除記録の画面で表示する
  revalidatePath("/admin/users");
  return {
    success: true,
    countsBefore,
    countsAfter,
    leftovers: findLeftovers(countsAfter),
    logId: log?.id ?? null,
  };
}
