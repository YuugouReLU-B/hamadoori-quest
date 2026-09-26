// 外部リンク設定
//
// 派生元（チームみらい）のNotionを指していた faq は消した。他団体のFAQへ
// 送るのは、リンクが無いより悪い。浜通りクエストのFAQができたら足す。
// TODO: FAQを用意して、フッターと入力エラーの案内から参照させる
export const EXTERNAL_LINKS = {
  // ご意見箱。浜通りクエスト専用のGoogleフォーム。
  // 末尾は必ず /viewform（回答用）にする。/edit は編集画面で、
  // 権限の無い訪問者には Google の権限エラーが出る。
  feedback_action_board:
    "https://docs.google.com/forms/d/1LNkdTjlfQvsu0tQv4KklwE8O5Vb5O6PBaUckaRz7IrU/viewform",

  // SNS指名検索（シェア導線の受け皿。タグは #浜通りクエスト に差し替え済み）
  x_search_hamadori: "https://x.com/search?q=%23浜通りクエスト",
  note_search_hamadori: "https://note.com/search?q=浜通りクエスト",
} as const;
// 利用側で `keyof typeof EXTERNAL_LINKS` を直接書く手間を省く
export type ExternalLinkKey = keyof typeof EXTERNAL_LINKS;
