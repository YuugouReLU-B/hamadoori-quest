import "server-only";

import { createAdminClient } from "@/lib/supabase/adminClient";

/**
 * 管理画面からのユーザーデータ削除（お問い合わせ経由の削除依頼）を支える読み取り処理。
 *
 * 認可（管理者か）は呼び出し側のページ・actions 層で行う。
 */

export type DeletionSearchKind =
  | "user_id"
  | "lottery_token"
  | "line_id"
  | "nickname";

export type DeletionCandidate = {
  id: string;
  name: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  /** 本人確認用。LINEユーザーIDの末尾4文字だけを見せる */
  lineIdTail: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOTTERY_TOKEN_PATTERN = /^[0-9A-F]{10}$/i;
const LINE_ID_PATTERN = /^U[0-9a-f]{32}$/;

/** 入力の形から、何で検索するかを決める */
export function detectDeletionSearchKind(query: string): DeletionSearchKind {
  const value = query.trim();
  if (UUID_PATTERN.test(value)) return "user_id";
  if (LINE_ID_PATTERN.test(value)) return "line_id";
  if (LOTTERY_TOKEN_PATTERN.test(value)) return "lottery_token";
  return "nickname";
}

async function loadCandidates(userIds: string[]): Promise<DeletionCandidate[]> {
  if (userIds.length === 0) return [];
  const supabase = await createAdminClient();

  const { data: profiles } = await supabase
    .from("public_user_profiles")
    .select("id, name")
    .in("id", userIds);
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  const candidates: DeletionCandidate[] = [];
  for (const id of userIds) {
    const { data } = await supabase.auth.admin.getUserById(id);
    const user = data?.user;
    // 認証ユーザーが無くても、プロフィールだけ残っている場合は消せるように候補に出す
    if (!user && !nameMap.has(id)) continue;
    const lineId = (
      user?.user_metadata as { line_user_id?: string } | undefined
    )?.line_user_id;
    candidates.push({
      id,
      name: nameMap.get(id) ?? null,
      createdAt: user?.created_at ?? null,
      lastSignInAt: user?.last_sign_in_at ?? null,
      lineIdTail: lineId ? lineId.slice(-4) : null,
    });
  }
  return candidates;
}

/**
 * 削除対象を探す。ユーザーID・LINEユーザーID・抽選の応募トークンは完全一致、
 * それ以外はニックネームの部分一致（最大20件）。
 */
export async function searchUsersForDeletion(
  query: string,
): Promise<{ kind: DeletionSearchKind; candidates: DeletionCandidate[] }> {
  const value = query.trim();
  const kind = detectDeletionSearchKind(value);
  if (!value) return { kind, candidates: [] };

  const supabase = await createAdminClient();
  let userIds: string[] = [];

  if (kind === "user_id") {
    userIds = [value.toLowerCase()];
  } else if (kind === "line_id") {
    const { data } = await supabase.rpc("get_user_by_line_id", {
      line_user_id: value,
    });
    userIds = (data ?? []).map((row) => row.id);
  } else if (kind === "lottery_token") {
    const { data } = await supabase
      .from("lottery_tokens")
      .select("user_id")
      .eq("token", value.toUpperCase())
      .maybeSingle();
    userIds = data?.user_id ? [data.user_id] : [];
  } else {
    const { data } = await supabase
      .from("public_user_profiles")
      .select("id")
      .ilike("name", `%${value}%`)
      .limit(20);
    userIds = (data ?? []).map((row) => row.id);
  }

  return { kind, candidates: await loadCandidates(userIds) };
}

export async function getDeletionCandidate(
  userId: string,
): Promise<DeletionCandidate | null> {
  if (!UUID_PATTERN.test(userId)) return null;
  const [candidate] = await loadCandidates([userId]);
  return candidate ?? null;
}

/** テーブルごとの件数。キーはテーブル名 */
export type UserDataCounts = Record<string, number>;

export async function getUserDataCounts(
  userId: string,
): Promise<UserDataCounts> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.rpc("admin_user_data_counts", {
    target_user_id: userId,
  });
  if (error) {
    throw new Error(`件数の取得に失敗しました: ${error.message}`);
  }
  return (data ?? {}) as UserDataCounts;
}

/**
 * 削除後に残してよいもの。
 * lottery_tokens は user_id を NULL にして行を残す設計（トークン文字列だけで
 * 個人に結び付かない）なので、user_id で数えれば0件になる。ここに載せるものは無い。
 */
export const REMAINING_AFTER_DELETION: readonly string[] = [];

/** 削除後に0件でないもの（＝消し残し） */
export function findLeftovers(counts: UserDataCounts): string[] {
  return Object.entries(counts)
    .filter(
      ([table, count]) =>
        count > 0 && !REMAINING_AFTER_DELETION.includes(table),
    )
    .map(([table]) => table);
}

/** 件数一覧に出すテーブル名の説明 */
export const TABLE_LABELS: Record<string, string> = {
  "auth.users": "ログイン情報（認証ユーザー）",
  public_user_profiles: "プロフィール（ニックネーム）",
  private_users: "非公開のユーザー情報",
  achievements: "クエストの達成記録",
  mission_artifacts: "クエストの提出物",
  xp_transactions: "ポイントの履歴",
  user_levels: "ポイントの累計",
  user_badges: "バッジ",
  user_activities: "活動の記録",
  user_referral: "紹介コード",
  user_campaign_attribution: "流入元の記録",
  user_registration_channels: "登録経路",
  user_emails: "識別用アドレスの複製",
  lottery_tokens: "抽選の応募トークン（行は残し、持ち主との紐付けを外す）",
  analytics_sessions: "アクセス解析のセッション",
  analytics_events: "アクセス解析のイベント",
  geo_checkin_locations: "チェックイン時の位置情報",
  referrer_artifacts_with_identifier:
    "紹介した人の記録に残る識別用アドレス（「退会済みユーザー」に置き換え）",
  "storage.objects": "アップロードされたファイル",
};

/** アプリからは消せず、運営が別途対応するもの */
export const NOT_DELETABLE_BY_APP: readonly string[] = [
  "LINE公式アカウントの配信対象（オーディエンス）に追加済みのLINEユーザーID：LINE Official Account Manager から削除する",
  "外部の応募フォーム（Googleフォーム等）の回答：フォームの運営事業者が削除する",
  "日次の自動バックアップ（最大7日分）：保持期間が過ぎると自動で消える",
];

export type DeletionLog = {
  id: string;
  deletedUserId: string;
  deletedAt: string;
  countsBefore: UserDataCounts;
  countsAfter: UserDataCounts;
};

/** 削除の記録を1件読む（結果画面用） */
export async function getDeletionLog(
  logId: string,
): Promise<DeletionLog | null> {
  if (!UUID_PATTERN.test(logId)) return null;
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("admin_deletion_logs")
    .select("id, deleted_user_id, deleted_at, counts_before, counts_after")
    .eq("id", logId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    deletedUserId: data.deleted_user_id,
    deletedAt: data.deleted_at,
    countsBefore: (data.counts_before ?? {}) as UserDataCounts,
    countsAfter: (data.counts_after ?? {}) as UserDataCounts,
  };
}
