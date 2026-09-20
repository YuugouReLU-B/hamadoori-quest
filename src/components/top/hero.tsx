import Image from "next/image";
import Link from "next/link";
import { HeroBackdrop } from "@/components/top/hero-backdrop";
import { HowToPlayModal } from "@/components/top/how-to-play-modal";
import { Button } from "@/components/ui/button";
import { LotteryProgressBar } from "@/features/lottery/components/lottery-progress-bar";
import Levels from "@/features/user-level/components/levels";
import { getUser } from "@/features/user-profile/services/profile";

export default async function Hero() {
  const user = await getUser();

  if (user) {
    try {
      return (
        <section className="relative mt-[-96px] pt-24 pb-8 bg-gradient-hero">
          {/* ヘッダーの下まで風景を敷き、白を重ねてカードを浮かせる */}
          <HeroBackdrop priority overlayClassName="bg-white/55" />
          <div className="relative z-10">
            <Levels
              userId={user.id}
              clickable={true}
              showBadge={true}
              showName={false}
              transparent={true}
            />
            <div className="mx-auto max-w-md px-4 pb-4">
              <LotteryProgressBar />
            </div>
          </div>
          <div className="absolute bottom-3 right-4 z-10">
            <HowToPlayModal />
          </div>
        </section>
      );
    } catch (error) {
      console.error("Error fetching user levels:", error);
    }
  }

  return (
    <section className="relative w-full h-[600px] md:h-[720px] bg-linear-to-b from-[var(--app-brand-light)] to-[var(--app-brand-pale)] overflow-hidden mt-[-96px] pt-24">
      {/* ロゴとボタンが乗る上半分を明るく保つ。下端は絵の色を残す */}
      <HeroBackdrop
        priority
        overlayClassName="bg-linear-to-b from-white/75 from-0% via-white/25 via-40% to-white/10 to-100%"
      />

      {/* メインコンテンツ */}
      <div className="relative z-10 px-4 pt-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* ロゴ画像 */}
          <div className="flex justify-center mb-8">
            <Image
              src="/img/logo.png"
              alt="浜通りクエスト"
              width={512}
              height={512}
              sizes="(min-width: 768px) 280px, 220px"
              className="h-[220px] w-auto md:h-[280px]"
              priority
            />
          </div>

          {/* ロゴ画像に同じ文字が入っているため視覚的には出さない */}
          <h1 className="sr-only">浜通りクエスト</h1>

          {!user && (
            <div className="flex flex-col items-center gap-4">
              <Link href="/sign-up" data-analytics-id="hero-sign-up">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-gray-800 border border-black font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl hover:opacity-90 transform hover:-translate-y-0.5 transition-all duration-200 text-base whitespace-nowrap min-w-fit"
                >
                  浜通りクエストに登録する
                </Button>
              </Link>
              <Link
                href="/sign-in"
                data-analytics-id="hero-sign-in"
                className="text-sm font-bold text-white underline underline-offset-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] hover:text-white"
              >
                ログインはこちら
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
