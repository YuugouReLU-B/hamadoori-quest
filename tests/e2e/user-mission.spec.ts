import { assertAuthState, expect, test } from "../e2e-test-helpers";

/** supabase/seed.sql の成果物不要ミッション。達成・取消の往復に使う */
const SEED_MISSION_SLUG = "seed-cleanup";

test.describe("アクションボード（Web版）のe2eテスト", () => {
  test("ログイン済み状態からトップページ確認", async ({ signedInPage }) => {
    await assertAuthState(signedInPage, true);

    // 自身のステータス表示を確認（レベル表示は廃止し、ポイント数のみ表示）
    await expect(
      signedInPage.locator("section").getByText(/現在\s*0\s*pt/),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      signedInPage.getByRole("link", {
        name: "テストユーザーさんのプロフィールへ",
      }),
    ).toBeVisible();

    // ログイン後は「遊び方」モーダル経由で参加方法の案内図を見る
    await signedInPage.getByRole("button", { name: "遊び方" }).click();
    await expect(
      signedInPage.getByAltText(/参加方法/).locator("visible=true"),
    ).toBeVisible();
    await signedInPage.keyboard.press("Escape");

    // 問い合わせフォームの表示を確認
    await expect(
      signedInPage.getByRole("heading", { name: "ご意見箱" }),
    ).toBeVisible();
    // ご意見箱はポスターマップ分と統合され、1本のリンクになった
    await expect(
      signedInPage.getByRole("link", {
        name: "浜通りクエストへのご意見フォーム",
      }),
    ).toBeVisible();

    // フッターの表示を確認
    // 「運営組織」リンクは運営主体が確定するまでのあいだ削除されている
    await expect(
      signedInPage.getByRole("link", { name: "利用規約" }),
    ).toBeVisible();
    await expect(
      signedInPage.getByRole("link", { name: "プライバシーポリシー" }),
    ).toBeVisible();
    await expect(
      signedInPage.getByRole("link", { name: "ご意見箱" }),
    ).toBeVisible();
  });

  test("アカウント設定（マイページ下部）が正常に動作する", async ({
    signedInPage,
  }) => {
    await assertAuthState(signedInPage, true);

    // マイページに遷移（アイコン変更・ニックネーム編集・退会もここに統合されている）
    await signedInPage.getByTestId("usermenubutton").click();
    await signedInPage.getByRole("menuitem", { name: "マイページ" }).click();
    await expect(signedInPage).toHaveURL(/\/users\/[^/]+$/, {
      timeout: 10000,
    });

    // アカウント設定セクションの表示内容を確認（アイコン+ニックネームのみ）
    await expect(signedInPage.getByText("プロフィール設定")).toBeVisible();
    await expect(signedInPage.getByLabel("ニックネーム")).toBeVisible();
    await expect(
      signedInPage.getByRole("button", { name: "更新する" }),
    ).toBeVisible();

    // /settings/profile に直接アクセスしてもマイページへリダイレクトされる
    await signedInPage.goto("/settings/profile");
    await expect(signedInPage).toHaveURL(/\/users\/[^/]+$/, {
      timeout: 10000,
    });
  });

  test("ユーザーページ遷移が正常に動作する", async ({ signedInPage }) => {
    await assertAuthState(signedInPage, true);

    // 自身のユーザーページに遷移
    await signedInPage
      .getByRole("link", { name: "テストユーザーさんのプロフィールへ" })
      .click();
    await expect(signedInPage).toHaveURL(/\/users\/[^/]+$/, {
      timeout: 10000,
    });

    // 自身のユーザーページの表示内容を確認
    await expect(signedInPage.getByText("テストユーザー")).toBeVisible();
  });

  test("任意のユーザーページ遷移が正常に動作する", async ({ signedInPage }) => {
    await assertAuthState(signedInPage, true);

    // ランキングページ経由で任意のユーザーページに遷移する
    // （ホーム画面のランキングプレビューは廃止されたため、ランキングページへ移動してから探す）
    await signedInPage.goto("/ranking");
    await signedInPage.getByRole("button", { name: "全期間" }).click();
    await signedInPage
      .getByRole("link")
      .filter({ hasText: "佐藤太郎" })
      .first()
      .click();
    await expect(signedInPage).toHaveURL(/\/users\/[^/]+$/, {
      timeout: 10000,
    });

    // 任意のユーザーページの表示内容を確認
    await expect(signedInPage.getByText("佐藤太郎").first()).toBeVisible();
  });

  test("クエストページ遷移 → クエスト完了が正常に動作する", async ({
    signedInPage,
  }) => {
    await assertAuthState(signedInPage, true);

    // ミッションページに遷移。
    // seedのゴミ拾いミッションはカテゴリに紐付いておらずトップの一覧に出ないので、
    // slugで直接開く（トップの一覧表示は別のテストで担保している）
    await signedInPage.goto(`/missions/${SEED_MISSION_SLUG}`);
    await expect(signedInPage).toHaveURL(/\/missions\/[^/]+$/, {
      timeout: 10000,
    });

    // ミッションページの表示内容を確認
    await expect(
      signedInPage.getByRole("button", { name: "クエスト完了を記録する" }),
    ).toBeVisible();
    await expect(
      signedInPage.getByText(
        "※ 成果物の内容が認められない場合、クエストの達成が取り消される場合があります。正確な内容をご記入ください。",
      ),
    ).toBeVisible();

    // ミッション完了ページに遷移
    await signedInPage
      .getByRole("button", { name: "クエスト完了を記録する" })
      .click();
    await expect(signedInPage.getByText("おめでとうございます！")).toBeVisible({
      timeout: 10000,
    });
    await signedInPage.getByRole("button", { name: "このまま閉じる" }).click();

    await expect(
      signedInPage.getByText("このクエストは何度でもチャレンジできます。"),
    ).toBeVisible();
    // ポイント2倍の仕組みは廃止したので、pointsそのまま(400)が付与される
    await expect(signedInPage.getByText("400pt獲得しました")).toBeVisible({
      timeout: 10000,
    });

    // ミッション完了後のポイントの変動を確認（レベル表示は廃止し、ポイント数のみ表示）
    await signedInPage.goto("/");
    await expect(
      signedInPage.locator("section").getByText(/現在\s*400\s*pt/),
    ).toBeVisible({ timeout: 10000 });

    await signedInPage.goto("/ranking");
    await signedInPage.getByRole("button", { name: "全期間" }).click();
    await expect(signedInPage.getByText("あなたのランク")).toBeVisible();
    // ランキング一覧では都道府県とレベルを表示しなくなり、単位は pt（桁区切りなし）
    await expect(
      signedInPage
        .getByRole("link", { name: /テストユーザー\s*400pt/ })
        .first(),
    ).toBeVisible({ timeout: 10000 });

    // 達成の取り消しはここでは検証しない。
    // face9e1e「初回クエストクリア画面と達成演出の統一」でミッション詳細から
    // 達成履歴（と「取り消す」ボタン）の表示が外れており、UIとして存在しない。
    // SubmissionHistoryWrapper / submission-item / cancel-submission-dialog は
    // どこからも参照されていない。取消を再びUIに戻すならここに検証を足す
  });

  test("ランキング - 全体ランキングが表示され期間を切り替えられる", async ({
    signedInPage,
  }) => {
    await assertAuthState(signedInPage, true);

    // ランキングページに遷移
    await signedInPage.goto("/ranking");

    await expect(
      signedInPage.getByRole("heading", { name: "ランキング" }),
    ).toBeVisible();
    await expect(
      signedInPage.getByRole("heading", { name: "今日のトップ10" }),
    ).toBeVisible();
    // TODO: Dailyランキングに表示されるseedデータを投入する必要あり //

    await signedInPage.getByRole("button", { name: "全期間" }).click();
    await expect(
      signedInPage.getByRole("heading", { name: "全期間トップ10" }),
    ).toBeVisible();
  });
});
