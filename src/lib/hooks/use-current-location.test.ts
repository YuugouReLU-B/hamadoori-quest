import { act, renderHook } from "@testing-library/react";
import {
  LOCATION_PERMISSION_DENIED_MESSAGE,
  LOCATION_UNAVAILABLE_MESSAGE,
  useCurrentLocation,
} from "./use-current-location";

/**
 * プライバシーポリシー4-1「位置情報は、ユーザーが操作したときにのみ取得する。
 * バックグラウンドで継続的に取得しない」をhookの振る舞いで担保する。
 */
describe("useCurrentLocation", () => {
  const getCurrentPosition = jest.fn();
  const watchPosition = jest.fn();
  const originalGeolocation = navigator.geolocation;

  beforeEach(() => {
    getCurrentPosition.mockReset();
    watchPosition.mockReset();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition, watchPosition, clearWatch: jest.fn() },
    });
  });

  afterAll(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: originalGeolocation,
    });
  });

  test("画面を開いただけでは位置情報を取得しない", () => {
    const { result } = renderHook(() => useCurrentLocation(null));

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(watchPosition).not.toHaveBeenCalled();
    expect(result.current.currentPos).toBeNull();
    expect(result.current.status).toBe("idle");
  });

  test("requestLocation を呼ぶと getCurrentPosition を1回だけ呼び、現在地を返す", async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({
        coords: { latitude: 37.49, longitude: 141.0 },
      } as GeolocationPosition);
    });
    const { result } = renderHook(() => useCurrentLocation(null));

    let pos: [number, number] | null = null;
    await act(async () => {
      pos = await result.current.requestLocation();
    });

    expect(pos).toEqual([37.49, 141.0]);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(watchPosition).not.toHaveBeenCalled();
    expect(result.current.currentPos).toEqual([37.49, 141.0]);
    expect(result.current.status).toBe("located");
    expect(result.current.errorMessage).toBeNull();
  });

  test("権限が拒否されたときは許可を促す案内を出す", async () => {
    getCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1 } as GeolocationPositionError);
      },
    );
    const { result } = renderHook(() => useCurrentLocation(null));

    let pos: [number, number] | null = [0, 0];
    await act(async () => {
      pos = await result.current.requestLocation();
    });

    expect(pos).toBeNull();
    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toBe(
      LOCATION_PERMISSION_DENIED_MESSAGE,
    );
  });

  test("取得に失敗したときは取得できなかった旨の案内を出す", async () => {
    getCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 3 } as GeolocationPositionError);
      },
    );
    const { result } = renderHook(() => useCurrentLocation(null));

    await act(async () => {
      await result.current.requestLocation();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toBe(LOCATION_UNAVAILABLE_MESSAGE);
  });
});
