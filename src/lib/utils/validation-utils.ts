/**
 * ZodErrorのエラーメッセージを改行区切りの文字列にフォーマットする
 */
export function formatZodErrors(zodError: {
  issues: Array<{ message: string }>;
}): string {
  return zodError.issues.map((error) => error.message).join("\n");
}
