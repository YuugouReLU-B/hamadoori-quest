import { filterAdminUsers, paginate } from "./admin-user-list";

const users = [
  { id: "11111111-aaaa", name: "ちさ", email: "line-u1@line.local" },
  { id: "22222222-bbbb", name: "ちさと", email: null },
  { id: "33333333-cccc", name: null, email: "Admin@Example.com" },
];

describe("filterAdminUsers", () => {
  it("空の検索語なら全件を返す", () => {
    expect(filterAdminUsers(users, "  ")).toEqual(users);
  });

  it("ニックネームの部分一致で絞り込む", () => {
    expect(filterAdminUsers(users, "ちさ").map((u) => u.id)).toEqual([
      "11111111-aaaa",
      "22222222-bbbb",
    ]);
  });

  it("メールアドレスは大文字小文字を区別しない", () => {
    expect(filterAdminUsers(users, "admin@example").map((u) => u.id)).toEqual([
      "33333333-cccc",
    ]);
  });

  it("ユーザーIDの一部でも見つかる", () => {
    expect(filterAdminUsers(users, "2222").map((u) => u.id)).toEqual([
      "22222222-bbbb",
    ]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 120 }, (_, i) => i);

  it("指定ページの分だけ返す", () => {
    const result = paginate(items, 3, 50);
    expect(result.items).toEqual(items.slice(100, 120));
    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(3);
  });

  it("範囲外のページ番号は端に丸める", () => {
    expect(paginate(items, 99, 50).page).toBe(3);
    expect(paginate(items, 0, 50).page).toBe(1);
    expect(paginate(items, Number.NaN, 50).page).toBe(1);
  });

  it("0件でも1ページとして扱う", () => {
    expect(paginate([], 1, 50)).toEqual({ items: [], page: 1, totalPages: 1 });
  });
});
