import { LINE_START_DISABLE_AUTO_LOGIN_PARAM } from "@/features/auth/constants/line-login";

/**
 * LINEログイン開始リンクの組み立て。
 *
 * 以前はサーバーアクション（startLineLogin）をawaitしてから
 * `window.location.href` で遷移していた。しかしその非同期の間隙のせいで、
 * iOS Safariが「ユーザー操作から連続した遷移」と認識できなくなり、
 * LINEアプリがインストール済みでもアプリを起動せず常にWebのログイン画面が
 * 出てしまう不具合があった。
 *
 * state の生成・cookie保存・authorize URLの組み立ては
 * すべて `/api/auth/line-start` ルートハンドラ側で行う。
 * クライアントはそこへの素の `<a href>` を組み立てるだけにして、
 * クリックからそのルートへの遷移までを一つの連続したブラウザ遷移にする。
 */
export function buildLineLoginHref(
  returnUrl?: string,
  options?: {
    /**
     * LINEの自動ログイン（LINEアプリを起動して無操作でログインを完了させる機能）を
     * 無効にする。自動ログインに失敗したあとの再試行でのみ使う。
     */
    disableAutoLogin?: boolean;
  },
): string {
  const params = new URLSearchParams();
  if (returnUrl) {
    params.set("returnUrl", returnUrl);
  }
  if (options?.disableAutoLogin) {
    params.set(LINE_START_DISABLE_AUTO_LOGIN_PARAM, "1");
  }
  const query = params.toString();
  return query ? `/api/auth/line-start?${query}` : "/api/auth/line-start";
}

/**
 * 認可URLを先に用意しておくためのエンドポイントのパス。
 *
 * ページ表示時にこれを叩いて認可URLを受け取り、ボタンの href に直接入れる。
 * タップから access.line.me への遷移を「リンクのタップ一回」にするため
 * （間にサーバーサイドのリダイレクトを挟むと、iOSのユニバーサルリンクが反応せず
 * LINEアプリが起動しない）。
 */
export function buildLinePrepareHref(returnUrl?: string): string {
  const params = new URLSearchParams();
  if (returnUrl) {
    params.set("returnUrl", returnUrl);
  }
  const query = params.toString();
  return query ? `/api/auth/line-prepare?${query}` : "/api/auth/line-prepare";
}
