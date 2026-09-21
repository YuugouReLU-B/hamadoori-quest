import { ThemeProvider } from "next-themes";
import Navbar from "@/components/common/navbar";
import { generateRootMetadata, notoSansJP } from "@/lib/utils/metadata";
import Footer from "./footer";
import "./globals.css";
import Script from "next/script";
import NextTopLoader from "nextjs-toploader";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AnalyticsTrackerWrapper } from "@/features/analytics/components/analytics-tracker-wrapper";
import { CampaignCodeHandlerWrapper } from "@/features/campaign-attribution/components/campaign-code-handler-wrapper";
import { DevColorOverridesScript } from "@/features/dev-tools/components/dev-color-overrides-script";
import { ReferralCodeHandlerWrapper } from "@/features/referral/components/referral-code-handler-wrapper";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

//metadata.tsxでmetadataを管理
export const generateMetadata = generateRootMetadata;

// Next.js 15でのviewport設定
export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={notoSansJP.variable} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <DevColorOverridesScript />
        {GTM_ID && (
          <>
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
                title="Google Tag Manager"
              />
            </noscript>
            <Script id="gtm-init" strategy="afterInteractive">
              {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `}
            </Script>
          </>
        )}
        <NextTopLoader
          showSpinner={false}
          color="var(--app-brand-primary-strong)"
        />
        {/* 自前のアクセス解析。ページ表示・滞在・スクロール・クリックをサイト全体で記録する */}
        <AnalyticsTrackerWrapper />
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* ナビとフッターは印刷に出さない。掲示用のQRシートなど、
              紙にするのは本文だけでよい */}
          <div className="print:hidden">
            <Navbar />
          </div>
          <main className="flex flex-col items-center mt-8 print:mt-0">
            <Suspense>
              <ReferralCodeHandlerWrapper />
            </Suspense>
            <Suspense>
              <CampaignCodeHandlerWrapper />
            </Suspense>
            {children}
          </main>
          <div className="print:hidden">
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
