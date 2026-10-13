export const ADMIN_USERS_PER_PAGE = 50;

type SearchableUser = {
  id: string;
  name: string | null;
  email: string | null;
};

/** ニックネーム・メールアドレス・ユーザーIDの部分一致で絞り込む（大文字小文字は区別しない） */
export function filterAdminUsers<T extends SearchableUser>(
  users: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return users;
  return users.filter((user) =>
    [user.name, user.email, user.id].some((value) =>
      value?.toLowerCase().includes(q),
    ),
  );
}

/** 1始まりのページ番号で切り出す。範囲外のページ番号は最寄りのページに丸める */
export function paginate<T>(
  items: T[],
  requestedPage: number,
  perPage: number = ADMIN_USERS_PER_PAGE,
): { items: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(1, Math.trunc(requestedPage)), totalPages)
    : 1;
  const start = (page - 1) * perPage;
  return { items: items.slice(start, start + perPage), page, totalPages };
}
