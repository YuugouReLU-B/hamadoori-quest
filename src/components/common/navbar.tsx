import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import HeaderAuth from "@/components/common/header-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUser } from "@/features/user-profile/services/profile";

export default async function Navbar() {
  const user = await getUser();

  return (
    <nav className="sticky top-4 z-50 w-full flex justify-center h-16 mt-4">
      <div className="px-4 w-full flex justify-between items-center text-sm bg-white border-b border-b-foreground/10 mx-4 rounded-2xl ">
        <div className="flex gap-5 items-center font-semibold min-w-[60px]">
          <Link href="/" className="flex items-center gap-4">
            <Image
              src="/img/logo.png"
              alt="浜通りクエスト"
              width={48}
              height={48}
            />
            <div className="text-sm leading-tight sm:text-lg">
              浜通りクエスト（ベータ）
            </div>
          </Link>
        </div>
        {user ? (
          <div className="flex gap-6 items-center">
            <div className="font-semibold hidden sm:flex">
              <Link href="/">ホーム</Link>
            </div>
            <HeaderAuth />
          </div>
        ) : (
          <>
            <div className="gap-6 items-center font-semibold hidden sm:flex">
              <Link href="/">ホーム</Link>
              <HeaderAuth />
            </div>
            <div className="flex gap-6 items-center font-semibold sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="-m-2.5 p-2.5"
                  aria-label="ナビゲーションメニューを開く"
                  data-testid="navmenubutton"
                >
                  <Menu />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  // Keep the menu aligned with the icon after adding 10px of trigger padding.
                  alignOffset={10}
                  sideOffset={-6}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/">ホーム</Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/">LINEで登録/ログイン</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
