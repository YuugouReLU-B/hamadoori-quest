"use client";

import { REGION_BAND_COUNT } from "../constants";

/**
 * 「ページのどの場所を、どれだけ見ていたか」の計測。
 *
 * 3つの見方を同時に持つ:
 *   contents - data-analytics-content を付けた個々のコンテンツ（クエストカード等）の表示時間。
 *              「どのクエストが何秒見られたか」が直接分かる、いちばん読みやすい単位。
 *   sections - <section> / <article> / data-analytics-section 単位の表示時間。
 *              見出しを拾うので「ランキングの所に12秒いた」と読める。
 *   bands    - ページを高さで10等分した帯ごとの表示時間。
 *              マークアップに一切依存しないので、まだ印を付けていない画面でも必ず取れる。
 *
 * いずれも「その領域が画面内に映っていた時間」。ただし加算するかどうかの判断は
 * 呼び出し側（analytics-tracker）が持っていて、無操作が30秒続いた後は積まれない。
 * 開きっぱなしのタブで特定のコンテンツだけ滞在が膨らむのを防ぐため。
 */

export { REGION_BAND_COUNT };

/** セクションとして扱う要素。運営が明示したものを最優先で拾う */
const SECTION_SELECTOR =
  "[data-analytics-section], main section, main article, main > div > section";

/**
 * 個々のコンテンツとして扱う要素。
 *
 *   data-analytics-content       種別（mission / ranking-entry など）
 *   data-analytics-content-id    後から突き合わせるための安定したID（slug等）
 *   data-analytics-content-label 人が読む名前
 */
const CONTENT_SELECTOR = "[data-analytics-content]";

/** 1ページ表示あたりのコンテンツ数の上限。一覧画面で送信量が膨らむのを防ぐ */
const MAX_CONTENTS = 60;

/** この割合以上が画面に入っていたら「見ていた」と数える */
const MIN_VISIBLE_PCT_TO_COUNT = 50;

/** セクションが多すぎるページで送信量が膨らまないようにする上限 */
const MAX_SECTIONS = 20;

export interface ContentDwell {
  type: string;
  id: string | null;
  label: string | null;
  /** ページ先頭からの位置(px) */
  top: number;
  ms: number;
  /** 画面内に入った最大の割合(0-100)。カード全体が見えたのか端だけかを区別する */
  maxVisiblePct: number;
}

interface TrackedContent extends Omit<ContentDwell, "type"> {
  element: Element;
  type: string;
}

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
  contents: ContentDwell[];
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
  private contents: TrackedContent[] = [];
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

    this.rescanContents();

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

  /**
   * data-analytics-content が付いた要素を探し直す。
   * 既に貯めた滞在時間は、要素が同じなら引き継ぐ。
   */
  private rescanContents(): void {
    const found = Array.from(document.querySelectorAll(CONTENT_SELECTOR)).slice(
      0,
      MAX_CONTENTS,
    );

    this.contents = found.map((element) => {
      const existing = this.contents.find((item) => item.element === element);
      const rect = element.getBoundingClientRect();

      return {
        element,
        type: element.getAttribute("data-analytics-content") ?? "unknown",
        id: element.getAttribute("data-analytics-content-id"),
        label: element.getAttribute("data-analytics-content-label"),
        top: existing?.top ?? Math.round(rect.top + window.scrollY),
        ms: existing?.ms ?? 0,
        maxVisiblePct: existing?.maxVisiblePct ?? 0,
      };
    });
  }

  /** 経過時間を、いま画面に映っている帯・セクション・コンテンツに加算する */
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

    const viewportWidth = window.innerWidth || doc.clientWidth || 0;
    const viewportHeight = viewportBottom - viewportTop;

    for (const content of this.contents) {
      const rect = content.element.getBoundingClientRect();
      if (rect.height <= 0 || rect.width <= 0) continue;

      content.top = Math.round(rect.top + viewportTop);

      // 縦と横の両方で重なりを見る。
      // クエスト一覧は横スクロールのカルーセルなので、縦だけで判定すると
      // 画面の外へ流れているカードまで「表示中」になり、全カードが同じ秒数になる。
      // getBoundingClientRect はビューポート基準なので、横スクロール分もここに出る
      const visibleWidth =
        Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
      if (visibleWidth <= 0) continue;

      const visibleHeight =
        Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
      if (visibleHeight <= 0) continue;

      const visiblePct = Math.min(
        100,
        Math.round(
          ((visibleWidth * visibleHeight) / (rect.width * rect.height)) * 100,
        ),
      );
      if (visiblePct > content.maxVisiblePct) {
        content.maxVisiblePct = visiblePct;
      }

      // 「見ていた」と数える条件は縦横それぞれで判定する。
      // 面積だけで見ると、横に数ピクセルしか出ていないカードでも
      // 縦が長ければ条件を満たしてしまう
      const visibleWidthPct = (visibleWidth / rect.width) * 100;
      if (visibleWidthPct < MIN_VISIBLE_PCT_TO_COUNT) continue;

      const visibleHeightPct = (visibleHeight / rect.height) * 100;
      const verticallyVisible =
        visibleHeightPct >= MIN_VISIBLE_PCT_TO_COUNT ||
        // 画面より高い要素（クエスト詳細など）は全体の半分が映ることがないので、
        // 画面の半分を占めていれば見ているとみなす
        (rect.height > viewportHeight && visibleHeight >= viewportHeight / 2);
      if (!verticallyVisible) continue;

      content.ms += deltaMs;
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

    const contents = this.contents
      .filter((content) => content.ms > 0)
      .map(({ type, id, label, top, ms, maxVisiblePct }) => ({
        type,
        id,
        label,
        top,
        ms: Math.round(ms),
        maxVisiblePct,
      }));

    if (
      bands.every((ms) => ms === 0) &&
      sections.length === 0 &&
      contents.length === 0
    ) {
      return null;
    }
    return { bands, sections, contents };
  }

  get currentPageHeight(): number {
    return this.pageHeight;
  }
}
