/** 応募フォームURLの中で、ユーザーのトークンに差し替える目印 */
export const LOTTERY_TOKEN_PLACEHOLDER = "{token}";

/**
 * 応募フォームのURLに、ユーザーのトークンを埋め込む。
 *
 * Googleフォームの「事前入力したURL」の値の部分を `{token}` にしておくと、
 * そのユーザーのトークンが入った状態でフォームが開く。
 * 目印が無いURLはそのまま返す（従来どおり、トークンは利用者が貼り付ける）。
 */
export function buildLotteryFormUrl(template: string, token: string): string {
  return template.replaceAll(
    LOTTERY_TOKEN_PLACEHOLDER,
    encodeURIComponent(token),
  );
}
