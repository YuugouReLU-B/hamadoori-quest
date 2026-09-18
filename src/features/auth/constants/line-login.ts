/**
 * LINEログインのフロー中だけ使う一時cookie。
 *
 * 以前は state と生年月日を localStorage に置き、クライアント側で照合していた。
 * その方式だと state 検証をクライアントで済ませたあとサーバーアクションに
 * code を渡す形になり、サーバー側では state を一切見ていなかった
 * （＝サーバーアクションを直接叩けば検証を素通りできる）。
 *
 * HttpOnly cookie に移してコールバックのルートハンドラで照合する。
 */
export const LINE_LOGIN_COOKIE = {
  /** CSRF対策の state */
  state: "line_login_state",
  /** ログイン後の戻り先 */
  returnUrl: "line_login_return",
  /**
   * 自動ログイン失敗でフォールバック（disable_auto_login=true）済みであることの印。
   * 無限リダイレクトを防ぐため、フォールバックは1フローにつき1回だけにする。
   */
  autoLoginRetry: "line_login_auto_retry",
} as const;

/** 一時cookieの有効期限（秒）。認証フローを往復するだけなので短くてよい */
export const LINE_LOGIN_COOKIE_MAX_AGE = 60 * 10;

/**
 * `/api/auth/line-start` に「自動ログインを無効にして開始する」ことを伝えるクエリ。
 * 自動ログインに失敗したコールバックからの再試行でのみ付く。
 */
export const LINE_START_DISABLE_AUTO_LOGIN_PARAM = "noAutoLogin";

/**
 * state の先頭に付ける印。「この認可リクエストは自動ログインを切った再試行である」
 * ことを cookie なしでも判定できるようにしておく。
 *
 * cookie自体が保存できない環境（プライベートブラウジング等）は自動ログインが
 * 失敗しやすい環境でもあり、再試行済みかどうかを cookie だけで判定すると
 * 「毎回未再試行に見える」＝無限リダイレクトになる。LINEは state をそのまま
 * 返してくるので、state に印を持たせておけばその状況でも一度で打ち切れる。
 */
export const LINE_STATE_PREFIX = {
  initial: "i.",
  autoLoginRetry: "r.",
} as const;

export const LINE_AUTHORIZE_ENDPOINT =
  "https://access.line.me/oauth2/v2.1/authorize";

/**
 * 要求するスコープ。
 *
 * email は含めない。LINE のメールアドレス取得は Developers での審査申請が必要で、
 * かつ「個人情報を持たない」方針に反する。メールが取れない場合は
 * line-{lineUserId}@line.local を合成して使う（line-login.ts 参照）。
 */
export const LINE_LOGIN_SCOPE = "profile openid";

/**
 * 認証フロー中に公式アカウントの友だち追加を促すかどうか。
 *
 * - `aggressive`: 同意後に友だち追加専用の画面を出す（取りこぼしが少ない）
 * - `normal`: 同意画面にチェックボックスを出す
 * - 未設定: 何もしない
 *
 * **LINEログインチャネルに公式アカウントがリンクされていないと機能しない**ため、
 * リンクが済むまでは未設定にしておく（環境変数で切り替える）。
 */
export function getBotPrompt(): "aggressive" | "normal" | null {
  const value = process.env.NEXT_PUBLIC_LINE_BOT_PROMPT;
  return value === "aggressive" || value === "normal" ? value : null;
}
