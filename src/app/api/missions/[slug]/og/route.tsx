import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getMissionPageData } from "@/features/mission-detail/services/mission-detail";
import { readTokenColor } from "@/lib/design/color-tokens";
import { formatTitleWithLineBreaks } from "./og-helpers";

// キャッシュ用Mapを定義（メモリキャッシュ）- completeタイプのみキャッシュ
// キーはslugベースで管理
const MAX_CACHE_SIZE = 100;
const cache = new Map<string, ArrayBuffer>();

const size = {
  width: 1200,
  height: 630,
};

/** OGPの背景。トップのヒーローと同じ背景イラストを使う */
const BACKGROUND_SVG_PATH = "public/img/hero-background.svg";

const BRAND_LABEL = "浜通りクエスト";

async function loadGoogleFont(font: string, text: string) {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${font}:wght@700&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const resource = css.match(
      /src:\s*url\(([^)]+)\)\s*format\('(opentype|truetype|woff2)'\)/,
    );

    if (resource) {
      const response = await fetch(resource[1]);
      if (response.status === 200) {
        return await response.arrayBuffer();
      }
    }
    throw new Error("Font resource not found");
  } catch (error) {
    console.error("Font loading failed:", error);
    // フォールバック: システムフォントを使用
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (typeof slug !== "string") {
    return new Response("Invalid mission identifier", { status: 400 });
  }

  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // getMissionPageDataはslugとUUID両方に対応
  const pageData = await getMissionPageData(slug);
  if (!pageData) {
    return new Response("Mission not found", { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");

  // キャッシュキーはslugベースで統一
  const cacheKey = pageData.mission.slug;

  if (type === "complete") {
    if (cache.has(cacheKey)) {
      const buf = cache.get(cacheKey);
      if (buf) {
        return new Response(buf, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
          },
        });
      }
    }
  }

  let backgroundImage = "";

  try {
    const backgroundBuffer = await readFile(
      join(process.cwd(), BACKGROUND_SVG_PATH),
    );
    backgroundImage = `data:image/svg+xml;base64,${backgroundBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Background image loading failed:", error);
    return new Response("Background image not found", { status: 500 });
  }

  const title = pageData?.mission.title ?? "クエストが見つかりません";
  const achievementCount = pageData?.totalAchievementCount ?? 0;
  const isComplete = type === "complete";

  const headline = isComplete
    ? `「${title}」\nを達成しました！`
    : formatTitleWithLineBreaks(title);

  const fontData = await loadGoogleFont(
    "Noto+Sans+JP",
    `${BRAND_LABEL}${title}を達成しました！${achievementCount}件のアクションが達成されました！クエストが見つかりません「」`,
  );

  const brandColor = readTokenColor("--app-brand-deep");

  const imageResponse = new ImageResponse(
    <div
      style={{
        fontFamily: "Noto Sans JP",
        width: "100%",
        height: "100%",
        padding: "96px 80px",
        display: "flex",
        flexDirection: "column",
        // 背景イラストの街並みは下辺に寄っているので、文字は上寄せにして重ねない
        justifyContent: "flex-start",
        backgroundColor: "#ffffff",
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        style={{
          fontSize: 28,
          color: brandColor,
          fontWeight: 700,
          marginBottom: "20px",
        }}
      >
        {BRAND_LABEL}
      </div>
      <div
        style={{
          fontSize: 52,
          color: "#1f2937",
          fontWeight: 700,
          lineHeight: 1.25,
          whiteSpace: "pre-wrap",
          // 長いクエスト名が右端まで伸びて街並みに重ならないよう折り返す
          maxWidth: "820px",
        }}
      >
        {headline}
      </div>
      {!isComplete && (
        <div
          style={{
            marginTop: "24px",
            display: "flex",
            alignItems: "baseline",
          }}
        >
          <div
            style={{
              fontSize: 58,
              color: brandColor,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {achievementCount.toLocaleString()}
          </div>
          <div
            style={{
              marginLeft: "8px",
              fontSize: 24,
              color: brandColor,
              fontWeight: 700,
            }}
          >
            件のアクションが達成されました！
          </div>
        </div>
      )}
    </div>,
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: "Noto Sans JP",
              data: fontData,
              weight: 700,
              style: "normal",
            },
          ]
        : [],
    },
  );

  // ImageResponseからArrayBufferを取得
  const buf = await imageResponse.arrayBuffer();

  if (type === "complete") {
    // キャッシュサイズ制限（FIFO方式）
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      if (typeof firstKey === "string") {
        cache.delete(firstKey);
      }
    }

    cache.set(cacheKey, buf);
  }

  return new Response(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
