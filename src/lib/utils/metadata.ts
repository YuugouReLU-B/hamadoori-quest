// ==========================================
// 【最小限版】lib/metadata.ts - 必要最低限の機能のみ
// ==========================================

import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { APP_ORIGIN } from "@/lib/constants/app-origin";

export const defaultUrl = APP_ORIGIN;

// ==========================================
// 基本設定
// ==========================================

export const config = {
  title: "浜通りクエスト",
  description:
    "浜通りのスポットやイベントをめぐってポイントを集めよう。福島・浜通りの地域クエストアプリ。",
  defaultImage: "/img/ogp-default.png?v=20260919",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-icon.png",
  },
};

// font-family設定
export const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  weight: ["400", "500", "700"],
});

// ==========================================
// URL検証（Supabase Storage対応）
// ==========================================

// URLが有効な画像URLかどうかを検証する関数
export function isValidImageUrl(_url: string): boolean {
  //TODO: URL検証を追加
  return true;
}

// 画像URLをサニタイズする関数
export function sanitizeImageUrl(url: string): string | null {
  if (!isValidImageUrl(url)) {
    return null;
  }

  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

// ==========================================
// メタデータ生成
// ==========================================

// デフォルトメタデータ
export function createDefaultMetadata(): Metadata {
  return {
    title: config.title,
    description: config.description,
    openGraph: {
      title: config.title,
      description: config.description,
      images: [`${defaultUrl}${config.defaultImage}`],
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
      images: [`${defaultUrl}${config.defaultImage}`],
    },
    icons: config.icons,
    other: {
      "font-family": notoSansJP.style.fontFamily,
    },
  };
}

// ==========================================
// Next.js generateMetadata関数
// ==========================================

export async function generateRootMetadata(): Promise<Metadata> {
  return createDefaultMetadata();
}
