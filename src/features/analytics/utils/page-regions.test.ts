/**
 * @jest-environment jsdom
 */
import { PageRegionTracker, REGION_BAND_COUNT } from "./page-regions";

/** ページの高さとスクロール位置を jsdom 上で作る */
function setupPage({
  pageHeight,
  viewportHeight,
  scrollY,
}: {
  pageHeight: number;
  viewportHeight: number;
  scrollY: number;
}) {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: pageHeight,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, "offsetHeight", {
    value: pageHeight,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: viewportHeight,
    configurable: true,
  });
  Object.defineProperty(window, "scrollY", {
    value: scrollY,
    configurable: true,
  });
}

describe("PageRegionTracker", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("画面に映っている帯にだけ時間を加算する", () => {
    // 1000pxのページを200pxのビューポートで最上部から見る → 上から2割だけが可視
    setupPage({ pageHeight: 1000, viewportHeight: 200, scrollY: 0 });

    const tracker = new PageRegionTracker();
    tracker.accumulate(1000);

    const snapshot = tracker.snapshot();
    expect(snapshot?.bands).toHaveLength(REGION_BAND_COUNT);
    expect(snapshot?.bands[0]).toBe(1000);
    expect(snapshot?.bands[1]).toBe(1000);
    // 3番目以降は画面外
    expect(snapshot?.bands[2]).toBe(0);
    expect(snapshot?.bands[9]).toBe(0);
  });

  it("スクロールすると加算される帯が移動する", () => {
    setupPage({ pageHeight: 1000, viewportHeight: 200, scrollY: 0 });
    const tracker = new PageRegionTracker();
    tracker.accumulate(1000);

    // 下端まで移動
    setupPage({ pageHeight: 1000, viewportHeight: 200, scrollY: 800 });
    tracker.accumulate(2000);

    const bands = tracker.snapshot()?.bands ?? [];
    expect(bands[0]).toBe(1000);
    expect(bands[8]).toBe(2000);
    expect(bands[9]).toBe(2000);
    // 中間は一度も映っていない
    expect(bands[4]).toBe(0);
  });

  it("経過時間が0以下なら何も加算しない", () => {
    setupPage({ pageHeight: 1000, viewportHeight: 200, scrollY: 0 });
    const tracker = new PageRegionTracker();
    tracker.accumulate(0);
    tracker.accumulate(-500);
    expect(tracker.snapshot()).toBeNull();
  });

  it("滞在が無ければ snapshot は null", () => {
    setupPage({ pageHeight: 1000, viewportHeight: 200, scrollY: 0 });
    expect(new PageRegionTracker().snapshot()).toBeNull();
  });

  it("セクションの見出しを鍵にする", () => {
    document.body.innerHTML = `
      <main>
        <section><h2>いま募集中のクエスト</h2></section>
        <section data-analytics-section="ranking"><h2>ランキング</h2></section>
      </main>`;
    setupPage({ pageHeight: 1000, viewportHeight: 200, scrollY: 0 });

    const tracker = new PageRegionTracker();
    tracker.rescanSections();

    const snapshot = tracker.snapshot();
    // jsdom は要素の高さを0で返すので滞在は載らないが、走査自体は落ちない
    expect(snapshot?.sections ?? []).toEqual([]);
  });

  it("stop() 後は加算しない", () => {
    // ページ遷移後は DOM が次のページのものになっているため、
    // そのまま測り続けると別ページの高さを混ぜてしまう
    setupPage({ pageHeight: 1000, viewportHeight: 200, scrollY: 0 });
    const tracker = new PageRegionTracker();
    tracker.accumulate(1000);
    tracker.stop();
    tracker.accumulate(5000);

    expect(tracker.snapshot()?.bands[0]).toBe(1000);
  });

  it("再走査しても既に貯めた滞在時間を失わない", () => {
    document.body.innerHTML = "<main><section><h2>見出し</h2></section></main>";
    setupPage({ pageHeight: 1000, viewportHeight: 200, scrollY: 0 });

    const tracker = new PageRegionTracker();
    tracker.rescanSections();
    tracker.accumulate(1000);
    tracker.rescanSections();
    tracker.accumulate(1000);

    expect(tracker.snapshot()?.bands[0]).toBe(2000);
  });
});
