import { expect, test } from "../e2e-test-helpers";

test.describe("認証フロー (トップページに一本化)", () => {
  // 各テストの前に実行
  test.beforeEach(async ({ page }) => {
    // トップページに移動
    await page.goto("/");
    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState("networkidle");
  });

  test("トップにLINEの登録/ログインボタンとみなし同意の表示がある", async ({
    page,
  }) => {
    const loginButton = page.getByTestId("line-login-button");

    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveText("LINEで登録/ログイン");

    // 規約同意はチェックボックスからボタン直下のみなし同意に変えた。
    // 組入要件としてリンクを辿れることが要るので href まで見る
    await expect(
      page.getByText("同意したものとみなします", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "利用規約" }),
    ).toHaveAttribute("href", "/terms");
    await expect(
      page
        .getByRole("main")
        .getByRole("link", { name: "プライバシーポリシー" }),
    ).toHaveAttribute("href", "/privacy");
  });

  test("旧 /sign-in と /sign-up はトップへリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/sign-up");
    await expect(page).toHaveURL(/\/$/);

    // 外部に共有された旧URLを拾えるよう、クエリは引き継ぐ
    await page.goto("/sign-in?returnUrl=%2Fmissions%2Ffoo");
    await expect(page).toHaveURL(/returnUrl=%2Fmissions%2Ffoo/);
  });

  test("returnUrl 付きで来たときはログインが必要な理由を表示する", async ({
    page,
  }) => {
    // 専用のログイン画面を廃したので、理由を出さないと
    // 「なぜトップに戻されたのか」が分からなくなる
    await page.goto("/?returnUrl=%2Fmissions%2Ffoo");

    await expect(
      page.getByText("ログインすると続きから遊べます。"),
    ).toBeVisible();
    await expect(page.getByTestId("line-login-button")).toBeVisible();
  });

  test("トップにメールアドレス+パスワードのログインは出さない", async ({
    page,
  }) => {
    // メール+パスワードのログインは /dev/login に分離済み
    await expect(
      page.getByText("メールアドレス", { exact: true }),
    ).toBeHidden();
    await expect(page.getByText("パスワード", { exact: true })).toBeHidden();
    await expect(
      page.getByRole("button", { name: "ログイン", exact: true }),
    ).toBeHidden();
    await expect(
      page.getByRole("link", { name: "パスワードを忘れた方" }),
    ).toBeHidden();
  });

  test("開発用ログインページでメールアドレスログインができる", async ({
    page,
  }) => {
    await page.goto("/dev/login");

    await expect(
      page.getByRole("heading", { name: "開発用ログイン" }),
    ).toBeVisible();

    // 不正な認証情報でエラーメッセージが表示されることを確認
    await page.fill('input[name="email"]', "nonexistent@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.getByRole("button", { name: "ログイン", exact: true }).click();

    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
  });

  test("LINEボタンから正しいauthorize URLへ遷移する", async ({ page }) => {
    // LINE への実通信は行わず、遷移先URLだけを検証する
    const captured: { url?: URL } = {};
    await page.route("https://access.line.me/**", async (route) => {
      captured.url = new URL(route.request().url());
      await route.fulfill({ status: 200, body: "stub" });
    });

    await page.getByTestId("line-login-button").click();

    await expect
      .poll(() => captured.url?.pathname, { timeout: 15000 })
      .toBe("/oauth2/v2.1/authorize");

    const params = captured.url?.searchParams;
    expect(params?.get("response_type")).toBe("code");
    expect(params?.get("state")).toBeTruthy();
    // 個人情報を増やさないため email スコープは要求しない
    expect(params?.get("scope")).toBe("profile openid");
    // authorize と token 交換で redirect_uri がズレると invalid_grant になる
    expect(params?.get("redirect_uri")).toContain("/api/auth/line-callback");

    // state はサーバー側で HttpOnly cookie に保存され、
    // ブラウザのJSからは読めない（旧実装は localStorage に置いていた）
    const cookies = await page.context().cookies();
    const stateCookie = cookies.find((c) => c.name === "line_login_state");
    expect(stateCookie?.httpOnly).toBe(true);
    expect(stateCookie?.value).toBe(params?.get("state"));

    const localStorageState = await page.evaluate(() =>
      localStorage.getItem("lineLoginState"),
    );
    expect(localStorageState).toBeNull();
  });

  test("stateが一致しないコールバックは拒否される", async ({ page }) => {
    // cookie を持たない状態で直接コールバックを叩く
    await page.goto("/api/auth/line-callback?code=dummy&state=forged");

    await expect(page).toHaveURL(/\/\?error=/);
    await expect(page.getByText(/認証状態が無効です/)).toBeVisible();
  });
});
