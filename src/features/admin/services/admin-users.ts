import "server-only";

import { getCurrentSeason } from "@/lib/services/seasons";
import { createAdminClient } from "@/lib/supabase/adminClient";

export type AdminUserSearchResult = {
  id: string;
  name: string;
  avatarUrl: string | null;
  xp: number;
};

export type AdminUserListItem = {
  id: string;
  name: string | null;
  email: string | null;
  roles: string[];
  isAdmin: boolean;
  createdAt: string;
};

/** auth.users の app_metadata からロール配列を取り出す */
export function extractRoles(appMetadata: unknown): string[] {
  const roles = (appMetadata as { roles?: unknown } | null)?.roles;
  if (!Array.isArray(roles)) return [];
  return roles.filter((role): role is string => typeof role === "string");
}

/**
 * 管理画面のユーザー一覧。
 *
 * 権限は auth.users の app_metadata.roles が正なので、プロフィールだけでなく
 * Auth 側も引いて突き合わせる。1ページ200件までで、それ以上は表示しない。
 */
export async function listUsersForAdmin(): Promise<AdminUserListItem[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) {
    console.error("ユーザー一覧の取得に失敗:", error);
    return [];
  }

  const { data: profiles } = await supabase
    .from("public_user_profiles")
    .select("id, name");
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  return data.users
    .map((user) => {
      const roles = extractRoles(user.app_metadata);
      return {
        id: user.id,
        name: nameMap.get(user.id) ?? null,
        email: user.email ?? null,
        roles,
        isAdmin: roles.includes("admin"),
        createdAt: user.created_at,
      };
    })
    .sort((a, b) => {
      // 管理者を先頭に固め、あとは新しい順。権限の確認がしやすい並びにする
      if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * デバッグ用のユーザー検索。
 *
 * ニックネームの部分一致、またはユーザーIDの完全一致で検索する。
 * 現在のアクティブシーズンのXPも一緒に返す。
 */
export async function searchUsersForAdmin(
  query: string,
): Promise<AdminUserSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const supabase = await createAdminClient();

  const profileQuery = supabase
    .from("public_user_profiles")
    .select("id, name, avatar_url")
    .limit(20);

  const { data: profiles, error } = UUID_PATTERN.test(trimmed)
    ? await profileQuery.eq("id", trimmed)
    : await profileQuery.ilike("name", `%${trimmed}%`);

  if (error) {
    console.error("ユーザー検索に失敗:", error);
    return [];
  }
  if (!profiles || profiles.length === 0) {
    return [];
  }

  const season = await getCurrentSeason();
  if (!season) {
    return profiles.map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatar_url,
      xp: 0,
    }));
  }

  const { data: levels } = await supabase
    .from("user_levels")
    .select("user_id, xp")
    .eq("season_id", season.id)
    .in(
      "user_id",
      profiles.map((p) => p.id),
    );

  const levelMap = new Map((levels ?? []).map((l) => [l.user_id, l]));

  return profiles.map((p) => {
    const userLevelRow = levelMap.get(p.id);
    return {
      id: p.id,
      name: p.name,
      avatarUrl: p.avatar_url,
      xp: userLevelRow?.xp ?? 0,
    };
  });
}
