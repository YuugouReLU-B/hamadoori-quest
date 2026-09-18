/**
 * タイトルの括弧前に改行を挿入する
 * 全角括弧（）と半角括弧()の両方に対応
 */
export function formatTitleWithLineBreaks(title: string): string {
  return title.replace(/（/g, "\n（").replace(/\(/g, "\n(");
}
