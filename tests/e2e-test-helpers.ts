import { test as base, expect, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import {
  cleanupTestUser,
  createTestUser,
  type TestUser,
} from "./supabase/utils";

// カスタムテストフィクスチャを定義
type TestFixtures = {
  signedInPage: Page;
  testUser: TestUser;
};

// テストヘルパー関数を拡張したテストオブジェクト
export const test = base.extend<TestFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: playwrightで First argument must use the object destructuring pattern とでるのを防ぐため.
  testUser: async ({}, use) => {
    const { user } = await createTestUser();
    await use(user);
    await cleanupTestUser(user.userId);
  },

  signedInPage: async ({ page, testUser, baseURL }, use) => {
    // 一般ユーザー向けの導線はLINEログインのみで、メール+パスワードでログインできる
    // 画面はアプリに置いていない。テストではSupabaseに直接サインインし、
    // アプリのサーバーが読むのと同じ形式のセッションcookieをブラウザに入れる
    await page.context().addCookies(
      (await signInAndGetSessionCookies(testUser)).map(({ name, value }) => ({
        name,
        value,
        url: baseURL,
      })),
    );
    await page.goto("/");

    // ログイン済みのページを渡す
    await use(page);
  },
});

/**
 * メール+パスワードでサインインし、@supabase/ssr が発行するセッションcookieを返す。
 *
 * cookie名や分割の仕方をテスト側で再実装するとライブラリ更新でずれるため、
 * アプリと同じ createServerClient に書き出させたものをそのまま使う
 */
async function signInAndGetSessionCookies(
  testUser: TestUser,
): Promise<{ name: string; value: string }[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabaseの環境変数が設定されていません");
  }

  const sessionCookies = new Map<string, string>();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () =>
        Array.from(sessionCookies).map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          sessionCookies.set(name, value);
        }
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({
    email: testUser.email,
    password: testUser.password,
  });
  if (error) {
    throw new Error(
      `テストユーザーのサインインに失敗しました: ${error.message}`,
    );
  }

  return Array.from(sessionCookies)
    .filter(([, value]) => value !== "")
    .map(([name, value]) => ({ name, value }));
}

export { expect };

/**
 * テスト用にランダムなメールアドレスを生成する
 * @returns {string} ランダムなメールアドレス
 */
export function generateRandomEmail(): string {
  const randomString = Math.random().toString(36).substring(2, 10);
  return `test-${randomString}@example.com`;
}

/**
 * 認証関連の要素が存在するか確認する
 * @param page Playwrightのページオブジェクト
 * @param isLoggedIn ログイン状態の場合はtrue
 */
export async function assertAuthState(
  page: Page,
  isLoggedIn: boolean,
): Promise<void> {
  if (isLoggedIn) {
    // ログイン時はアバターアイコンが表示されること
    await expect(page.getByTestId("usermenubutton")).toBeVisible();
  } else {
    // 未ログイン時はログインとサインアップリンクが表示されること
    await expect(page.getByTestId("usermenubutton")).not.toBeVisible();
  }
}
