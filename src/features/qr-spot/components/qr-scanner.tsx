"use client";

import jsQR from "jsqr";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/features/analytics/utils/tracker";
import { QR_SCAN_PATH } from "@/features/qr-spot/constants/qr-scan";

type ScanState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "denied" }
  | { kind: "unavailable" }
  | { kind: "foreign" };

/**
 * カメラでQRを読み取ってスポットのページへ飛ばす。
 *
 * iOS も Android も標準のカメラアプリでQRを読めるが、Webからカメラアプリを
 * 起動する手段は無い。アプリ内で完結させるためにここで読み取る。
 *
 * 読み取り結果が自分のサイトの `/q/<code>` でなければ何もしない。
 * 別サイトのQRを読ませてそこへ飛ばすと、フィッシングの踏み台になる。
 */
export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [state, setState] = useState<ScanState>({ kind: "idle" });

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
  }, []);

  /** 読み取った文字列が自分のサイトのスポットURLなら、そのパスを返す */
  const toSpotPath = useCallback((value: string): string | null => {
    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return null;
      if (!url.pathname.startsWith(`${QR_SCAN_PATH}/`)) return null;
      return url.pathname;
    } catch {
      return null;
    }
  }, []);

  const start = useCallback(async () => {
    setState({ kind: "starting" });

    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ kind: "unavailable" });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // 背面カメラを優先する。前面しか無い端末でも動くよう ideal にする
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      // iOS Safari はこれが無いと全画面再生に切り替わってしまう
      video.setAttribute("playsinline", "true");
      await video.play();
      setState({ kind: "scanning" });

      const tick = () => {
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          frameRef.current = requestAnimationFrame(tick);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(image.data, image.width, image.height);

        if (found?.data) {
          const path = toSpotPath(found.data);
          if (path) {
            stop();
            // どのスポットのQRから入ったかを経路に残す。
            // 遷移で画面が消えるので待たずに送る
            trackEvent("qr_scan", {
              props: { result: "matched", spotPath: path },
              immediate: true,
            });
            router.push(path);
            return;
          }
          // 自サービス以外のQRを読んでしまったケース。掲示物の不備を見つける手がかりになる
          trackEvent("qr_scan", { props: { result: "foreign" } });
          setState({ kind: "foreign" });
        }

        frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    } catch (error) {
      console.warn("カメラを起動できませんでした:", error);
      setState({ kind: "denied" });
    }
  }, [router, stop, toSpotPath]);

  // 画面を離れたらカメラを必ず止める
  useEffect(() => stop, [stop]);

  const isLive = state.kind === "scanning" || state.kind === "foreign";

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        {/* biome-ignore lint/a11y/useMediaCaption: カメラのプレビューに字幕は無い */}
        <video
          ref={videoRef}
          className={isLive ? "aspect-square w-full object-cover" : "hidden"}
          muted
          playsInline
        />
        {!isLive && (
          <div className="flex aspect-square w-full items-center justify-center px-6 text-center text-sm text-white/80">
            {state.kind === "starting"
              ? "カメラを起動しています..."
              : "「カメラを起動する」を押すと読み取りが始まります"}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {state.kind === "foreign" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          このQRコードは浜通りクエストのものではないようです。
          スポットに掲示されているQRコードを読み取ってください。
        </p>
      )}

      {state.kind === "denied" && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          カメラを使えませんでした。ブラウザのカメラ許可を確認するか、
          スマホの標準カメラアプリでQRコードを読み取ってください。
        </p>
      )}

      {state.kind === "unavailable" && (
        <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          このブラウザではカメラを使えません。
          スマホの標準カメラアプリでQRコードを読み取ってください。
        </p>
      )}

      {!isLive && (
        <Button
          type="button"
          onClick={start}
          disabled={state.kind === "starting"}
          className="w-full"
          size="lg"
        >
          {state.kind === "idle" ? "カメラを起動する" : "もう一度試す"}
        </Button>
      )}
    </div>
  );
}
