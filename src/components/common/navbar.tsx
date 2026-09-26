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
    // 浮いた角丸バーはテンプレート感が強いので、画面幅いっぱいのフラットなヘッダーにする。
    // 高さはトップのヒーローが mt-[-96px] で潜り込む前提（ナビ64px + main の mt-8）に合わせている
    <nav className="sticky top-0 z-50 w-full h-16 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto h-full max-w-6xl px-4 flex justify-between items-center text-sm">
        <div className="flex gap-5 items-center font-bold min-w-[60px]">
          <Link
            href="/"
            data-analytics-id="nav-logo"
            className="flex items-center gap-3"
          >
            <Image
              src="/img/logo.png"
              alt="浜通りクエスト"
              width={40}
              height={40}
            />
            <div className="flex items-center gap-2 text-base font-bold sm:text-lg">
              浜通りクエスト
              <span className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] font-medium leading-none text-gray-500">
                ベータ版
              </span>
            </div>
          </Link>
        </div>
        {user ? (
          <div className="flex gap-6 items-center">
            <div className="font-bold hidden sm:flex">
              <Link href="/" data-analytics-id="nav-home">
                ホーム
              </Link>
            </div>
            <HeaderAuth />
          </div>
        ) : (
          <>
            <div className="gap-6 items-center font-bold hidden sm:flex">
              <Link href="/" data-analytics-id="nav-home">
                ホーム
              </Link>
              <HeaderAuth />
            </div>
            <div className="flex gap-6 items-center font-bold sm:hidden">
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
                      <Link href="/" data-analytics-id="nav-home">
                        ホーム
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/" data-analytics-id="nav-line-login">
                      LINEで登録/ログイン
                    </Link>
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
