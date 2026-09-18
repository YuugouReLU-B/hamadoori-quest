"use client";

import { REGION_BAND_COUNT } from "../constants";

/**
 * 「ページのどの場所を、どれだけ見ていたか」の計測。
 *
 * 2つの見方を同時に持つ:
 *   bands    - ページを高さで10等分した帯ごとの表示時間。
 *              ページ側のマークアップに一切依存しないので、どの画面でも必ず取れる。
 *   sections - <section> / <article> / data-analytics-section 単位の表示時間。
 *              見出しも一緒に拾うので、「ランキングの所に12秒いた」と読める。
 *
 * どちらも「その領域が画面内に映っていた時間」で、スクロールせず眺めていた時間も含む。
 */

export { REGION_BAND_COUNT };

/** セクションとして扱う要素。運営が明示したものを最優先で拾う */
const SECTION_SELECTOR =
  "[data-analytics-section], main section, main article, main > div > section";

/** セクションが多すぎるページで送信量が膨らまないようにする上限 */
const MAX_SECTIONS = 20;

export interface SectionDwell {
  key: string;
  label: string | null;
  /** ページ先頭からの位置(px)。ページ内のどのあたりかを後から復元するため */
  top: number;
  ms: number;
}

interface TrackedSection {
  element: Element;
  key: string;
  label: string | null;
  top: number;
  ms: number;
}

export interface RegionDwell {
  bands: number[];
  sections: SectionDwell[];
}

/** セクションの見出しを拾う。無ければ null */
function readSectionLabel(element: Element): string | null {
  const explicit = element.getAttribute("data-analytics-section");
  if (explicit) return explicit.slice(0, 80);

  const heading = element.querySelector("h1, h2, h3");
  const text = heading?.textContent?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 80) : null;
}

/**
 * 1ページ表示分の領域滞在を集める。
 *
 * スクロール位置とページ高さから毎tick計算するだけで、
 * IntersectionObserver は使わない。帯とセクションで同じ計算を共有でき、
 * 「表示されていた時間」の定義を1か所に保てるため。
 */
export class PageRegionTracker {
  private bands: number[] = new Array(REGION_BAND_COUNT).fill(0);
  private sections: TrackedSection[] = [];
  private pageHeight = 0;
  private stopped = false;

  /**
   * 計測を打ち切る。
   * ページ遷移後は DOM が次のページのものに入れ替わっているため、
   * そのまま測り続けると別ページの高さとスクロール位置を混ぜてしまう。
   */
  stop(): void {
    this.stopped = true;
  }

  /**
   * セクションを探し直す。
   * App Router ではストリーミングで本文が後から届くので、表示直後だけでなく
   * 少し待ってから再走査する必要がある。
   */
  rescanSections(): void {
    if (this.stopped || typeof document === "undefined") return;

    const found = Array.from(document.querySelectorAll(SECTION_SELECTOR)).slice(
      0,
      MAX_SECTIONS,
    );

    const next: TrackedSection[] = found.map((element, index) => {
      const existing = this.sections.find(
        (section) => section.element === element,
      );
      const rect = element.getBoundingClientRect();
      const top = Math.round(rect.top + window.scrollY);
      const label = readSectionLabel(element);

      return {
        element,
        // 見出しが取れるならそれを鍵にする。同じページの再訪で同じ鍵になり集計できる
        key: label ? `${index}:${label}` : `${index}:section`,
        label,
        top,
        ms: existing?.ms ?? 0,
      };
    });

    this.sections = next;
  }

  /** 経過時間を、いま画面に映っている帯とセクションに加算する */
  accumulate(deltaMs: number): void {
    if (this.stopped || deltaMs <= 0 || typeof window === "undefined") return;

    const doc = document.documentElement;
    const pageHeight = Math.max(
      doc.scrollHeight,
      doc.offsetHeight,
      document.body?.scrollHeight ?? 0,
    );
    if (pageHeight <= 0) return;
    this.pageHeight = pageHeight;

    const viewportTop = window.scrollY || doc.scrollTop || 0;
    const viewportBottom =
      viewportTop + (window.innerHeight || doc.clientHeight);

    const bandHeight = pageHeight / REGION_BAND_COUNT;
    for (let index = 0; index < REGION_BAND_COUNT; index += 1) {
      const bandTop = index * bandHeight;
      const bandBottom = bandTop + bandHeight;
      // 画面に少しでも掛かっていれば「見ていた」とみなす
      if (bandTop < viewportBottom && bandBottom > viewportTop) {
        this.bands[index] += deltaMs;
      }
    }

    for (const section of this.sections) {
      const rect = section.element.getBoundingClientRect();
      // 表示のたびに高さが変わるので、位置は都度読み直す
      const top = rect.top + viewportTop;
      const bottom = top + rect.height;
      section.top = Math.round(top);
      if (rect.height > 0 && top < viewportBottom && bottom > viewportTop) {
        section.ms += deltaMs;
      }
    }
  }

  /** 送信用に丸めた結果を返す。滞在0の領域は落とす */
  snapshot(): RegionDwell | null {
    const bands = this.bands.map((ms) => Math.round(ms));
    const sections = this.sections
      // 見出しが取れないセクションは後から読んでも意味が取れないので送らない。
      // 入れ子の <section> が多いページで同じ位置の行が量産されるのも防げる
      .filter((section) => section.ms > 0 && section.label !== null)
      .map(({ key, label, top, ms }) => ({
        key,
        label,
        top,
        ms: Math.round(ms),
      }));

    if (bands.every((ms) => ms === 0) && sections.length === 0) {
      return null;
    }
    return { bands, sections };
  }

  get currentPageHeight(): number {
    return this.pageHeight;
  }
}
