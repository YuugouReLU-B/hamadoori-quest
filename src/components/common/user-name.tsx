import { cn } from "@/lib/utils/styles";

type UserNameProps = {
  name: string;
  className?: string;
  nameClassName?: string;
};

/**
 * ランキング・アクティビティで使うユーザー名。
 *
 * 以前は UserNameWithBadge という名前で、名前の右に
 * 「党員」バッジを出す責務を持っていた。
 * 党員バッジ機能（派生元の党員DBと連携するもの）を削除したため、
 * 名前を表示するだけのコンポーネントに置き換えている。
 */
export function UserName({ name, className, nameClassName }: UserNameProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 max-w-full", className)}
    >
      <span className={cn("truncate min-w-0", nameClassName)}>{name}</span>
    </span>
  );
}
