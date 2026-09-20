import { Menu } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUser } from "@/features/user-profile/services/profile";

export default async function AuthButton() {
  const user = await getUser();

  return user /* && profile */ ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="ユーザーメニューを開く"
          data-testid="usermenubutton"
        >
          <Menu className="w-6 h-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/">ホーム</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            {/* アイコン変更・ニックネーム編集・退会もマイページ下部に統合済み */}
            <Link href={`/users/${user.id}`}>マイページ</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          {/*
            asChild でボタン自体をメニュー項目にする。ボタンを項目の「中」に
            置くと、キーボードのEnterはRadixが項目側で処理してしまい、
            送信ボタンまで届かずログアウトできない
          */}
          <DropdownMenuItem asChild>
            <button
              type="submit"
              className="w-full text-left cursor-default"
              data-testid="sign-out"
            >
              ログアウト
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <div className="flex gap-2">
      {/* 登録とログインは同じLINE認証なので入り口を分けない。
          本体のボタンはトップのヒーローにあり、ここは下層ページからの導線 */}
      <Button
        asChild
        size="sm"
        className="bg-[var(--app-vendor-line-green)] hover:bg-[var(--app-vendor-line-green-hover)] text-white"
      >
        <Link href="/">LINEで登録/ログイン</Link>
      </Button>
    </div>
  );
}
