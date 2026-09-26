import { APP_ORIGIN } from "@/lib/constants/app-origin";

/**
 * 本サービスの運営主体。
 *
 * 利用規約・プライバシーポリシーで名乗る主体であり、法的な責任の所在そのもの。
 * 派生元は政治団体「チームみらい」だったが、本サービスの運営主体は
 * 一般社団法人HAMADOORI13。
 *
 * 問い合わせはメールアドレスを公開せず、ご意見フォーム
 * （EXTERNAL_LINKS.feedback_action_board）に寄せている。
 * 個別のメール窓口を設けるときは contactEmail を埋める。
 */
export const OPERATOR = {
  name: "一般社団法人HAMADOORI13",
  contactEmail: null,
  /** 公式ドメイン。非公式サービスと区別するための記載に使う */
  officialUrl: APP_ORIGIN,
} as const;
