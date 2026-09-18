"use client";

import { useEffect, useState } from "react";
import {
  buildLineLoginHref,
  buildLinePrepareHref,
} from "@/features/auth/client/line-auth";

/**
 * LINEログインボタンに入れる href を返す。
 *
 * 表示時に `/api/auth/line-prepare` を叩いて state cookie の発行を済ませ、
 * LINEの認可URLそのものを href に入れる。こうするとボタンのタップが
 * access.line.me への単一の遷移になり、iOSのユニバーサルリンクが反応して
 * LINEアプリが起動する。
 *
 * 自前の `/api/auth/line-start` へのリンク（302で認可URLへ飛ばす）だと、
 * 実機のiPhone/Safariでアプリが起動せずWebのログイン画面になってしまった。
 * 同じリンクを長押しして「"LINE"で開く」を選ぶとアプリが起動したので、
 * ユニバーサルリンク自体ではなく間のリダイレクトが原因だと判断している。
 *
 * prepareが終わるまで、またはJS/通信が失敗した場合は、
 * 従来どおり `/api/auth/line-start` へのリンクのままにする。
 */
export function useLineLoginHref(returnUrl?: string): string {
  const [href, setHref] = useState(() => buildLineLoginHref(returnUrl));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(buildLinePrepareHref(returnUrl), {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data: unknown = await response.json();
        const authorizeUrl =
          typeof data === "object" && data !== null
            ? (data as { authorizeUrl?: unknown }).authorizeUrl
            : undefined;

        if (!cancelled && typeof authorizeUrl === "string") {
          setHref(authorizeUrl);
        }
      } catch {
        // フォールバックのリンクのままにする
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [returnUrl]);

  return href;
}
