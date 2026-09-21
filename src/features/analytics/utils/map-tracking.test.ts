/**
 * @jest-environment jsdom
 */
import { createMapTracker } from "./map-tracking";
import { trackEvent } from "./tracker";

jest.mock("./tracker", () => ({
  trackEvent: jest.fn(),
}));

const trackEventMock = trackEvent as jest.Mock;

/**
 * 地図生成直後は自動移動が走るため送らない仕様なので、
 * テストでは毎回その待機時間を越えてから操作を始める。
 */
const INITIAL_SETTLE_MS = 2000;
const MOVE_DEBOUNCE_MS = 1200;

function createTracker(visibleSpotIds: string[] = ["a", "b"], zoom = 12) {
  return createMapTracker({
    mapId: "spot-map",
    getZoom: () => zoom,
    getVisibleSpotIds: () => visibleSpotIds,
  });
}

/** 初期の待機時間を越える */
function passInitialSettle() {
  jest.advanceTimersByTime(INITIAL_SETTLE_MS + 1);
}

describe("createMapTracker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    trackEventMock.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("生成直後の自動移動は送らない", () => {
    const tracker = createTracker();
    // fitBounds などでいきなり動く
    tracker.reportMove();
    jest.advanceTimersByTime(MOVE_DEBOUNCE_MS + 100);

    expect(trackEventMock).not.toHaveBeenCalled();
    tracker.dispose();
  });

  it("連続した操作を1件にまとめる", () => {
    const tracker = createTracker();
    passInitialSettle();

    // ドラッグ中は何十回も発火する
    for (let i = 0; i < 30; i += 1) {
      tracker.reportMove();
      jest.advanceTimersByTime(50);
    }
    jest.advanceTimersByTime(MOVE_DEBOUNCE_MS);

    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledWith("map_move", {
      props: {
        mapId: "spot-map",
        zoom: 12,
        visibleSpotCount: 2,
        visibleSpotIds: ["a", "b"],
      },
    });
    tracker.dispose();
  });

  it("操作が止まるたびに1件ずつ送る", () => {
    const tracker = createTracker();
    passInitialSettle();

    tracker.reportMove();
    jest.advanceTimersByTime(MOVE_DEBOUNCE_MS + 10);
    tracker.reportMove();
    jest.advanceTimersByTime(MOVE_DEBOUNCE_MS + 10);

    expect(trackEventMock).toHaveBeenCalledTimes(2);
    tracker.dispose();
  });

  it("1ページ表示あたりの件数に上限をかける", () => {
    const tracker = createTracker();
    passInitialSettle();

    for (let i = 0; i < 40; i += 1) {
      tracker.reportMove();
      jest.advanceTimersByTime(MOVE_DEBOUNCE_MS + 10);
    }

    // 上限は20件
    expect(trackEventMock).toHaveBeenCalledTimes(20);
    tracker.dispose();
  });

  it("中心座標は送らない", () => {
    const tracker = createTracker();
    passInitialSettle();
    tracker.reportMove();
    jest.advanceTimersByTime(MOVE_DEBOUNCE_MS);

    const props = trackEventMock.mock.calls[0][1].props;
    expect(props).not.toHaveProperty("centerLat");
    expect(props).not.toHaveProperty("centerLng");
    tracker.dispose();
  });

  it("画面内のスポットIDは20件までに切る", () => {
    const many = Array.from({ length: 50 }, (_, i) => `spot-${i}`);
    const tracker = createTracker(many);
    passInitialSettle();
    tracker.reportMove();
    jest.advanceTimersByTime(MOVE_DEBOUNCE_MS);

    expect(trackEventMock.mock.calls[0][1].props.visibleSpotIds).toHaveLength(
      20,
    );
    tracker.dispose();
  });

  it("ピンのクリックは間引かずにそのまま送る", () => {
    const tracker = createTracker();
    // クリックは初期の待機時間に関係なく送る（利用者の明確な操作のため）
    tracker.reportMarkerClick({ id: "spot-a", title: "スポットA" });

    expect(trackEventMock).toHaveBeenCalledWith("map_marker_click", {
      props: {
        mapId: "spot-map",
        spotId: "spot-a",
        spotTitle: "スポットA",
        zoom: 12,
      },
    });
    tracker.dispose();
  });

  it("dispose 後は送らない", () => {
    const tracker = createTracker();
    passInitialSettle();
    tracker.reportMove();
    tracker.dispose();
    jest.advanceTimersByTime(MOVE_DEBOUNCE_MS + 100);

    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("dispose 後のクリックも送らない", () => {
    const tracker = createTracker();
    tracker.dispose();
    tracker.reportMarkerClick({ id: "spot-a", title: "スポットA" });

    expect(trackEventMock).not.toHaveBeenCalled();
  });
});
