import { act, render, screen } from "@testing-library/react";
import { XpProgressToastContent } from "./xp-progress-toast-content";

// ProgressBarAnimated は requestAnimationFrame と Date.now で動くのでフェイクタイマーと
// 相性が悪い。ここでの検証対象は「バーを出すか」「3秒の起点はどこか」なので、
// アニメーション自体はモックし、完了は手動で発火させる。
let triggerAnimationComplete: (() => void) | undefined;

jest.mock("@/features/user-level/components/progress-bar-animated", () => ({
  ProgressBarAnimated: ({
    maxValue,
    startValue,
    endValue,
    onAnimationComplete,
  }: {
    maxValue: number;
    startValue: number;
    endValue: number;
    onAnimationComplete?: () => void;
  }) => {
    triggerAnimationComplete = onAnimationComplete;
    return (
      <div
        data-testid="progress-bar"
        data-max={maxValue}
        data-start={startValue}
        data-end={endValue}
      />
    );
  },
}));

describe("XpProgressToastContent", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    triggerAnimationComplete = undefined;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("獲得ポイントと合計ポイントを出す", () => {
    render(
      <XpProgressToastContent
        initialXp={300}
        xpGained={50}
        thresholdPoints={1000}
        onAnimationComplete={jest.fn()}
      />,
    );

    expect(screen.getByText("50pt獲得しました！")).toBeInTheDocument();
    expect(screen.getByText("合計 350pt")).toBeInTheDocument();
  });

  it("合計は桁区切りなしの pt で出す", () => {
    render(
      <XpProgressToastContent
        initialXp={1200}
        xpGained={300}
        thresholdPoints={null}
        onAnimationComplete={jest.fn()}
      />,
    );

    expect(screen.getByText("合計 1500pt")).toBeInTheDocument();
  });

  it("レベルや応募可否の案内は出さない", () => {
    render(
      <XpProgressToastContent
        initialXp={300}
        xpGained={50}
        thresholdPoints={1000}
        onAnimationComplete={jest.fn()}
      />,
    );

    expect(screen.queryByText(/レベル/)).not.toBeInTheDocument();
    expect(screen.queryByText(/応募/)).not.toBeInTheDocument();
  });

  describe("バーの表示条件", () => {
    it("しきい値が null ならバーを出さない", () => {
      render(
        <XpProgressToastContent
          initialXp={300}
          xpGained={50}
          thresholdPoints={null}
          onAnimationComplete={jest.fn()}
        />,
      );

      expect(screen.queryByTestId("progress-bar")).not.toBeInTheDocument();
    });

    it("しきい値が0以下ならバーを出さない", () => {
      render(
        <XpProgressToastContent
          initialXp={300}
          xpGained={50}
          thresholdPoints={0}
          onAnimationComplete={jest.fn()}
        />,
      );

      expect(screen.queryByTestId("progress-bar")).not.toBeInTheDocument();
    });

    it("達成前にすでにしきい値へ届いていれば最初からバーを出さない", () => {
      render(
        <XpProgressToastContent
          initialXp={1000}
          xpGained={50}
          thresholdPoints={1000}
          onAnimationComplete={jest.fn()}
        />,
      );

      expect(screen.queryByTestId("progress-bar")).not.toBeInTheDocument();
    });

    it("未到達ならバーを出し、しきい値で頭打ちにする", () => {
      render(
        <XpProgressToastContent
          initialXp={980}
          xpGained={50}
          thresholdPoints={1000}
          onAnimationComplete={jest.fn()}
        />,
      );

      const bar = screen.getByTestId("progress-bar");
      expect(bar).toHaveAttribute("data-max", "1000");
      expect(bar).toHaveAttribute("data-start", "980");
      // min(980 + 50, 1000)
      expect(bar).toHaveAttribute("data-end", "1000");
    });

    it("到達しなければアニメーション後もバーを出したままにする", () => {
      render(
        <XpProgressToastContent
          initialXp={100}
          xpGained={50}
          thresholdPoints={1000}
          onAnimationComplete={jest.fn()}
        />,
      );

      act(() => {
        triggerAnimationComplete?.();
      });

      expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
    });

    it("ちょうど到達した場合もバーを引っ込める", () => {
      render(
        <XpProgressToastContent
          initialXp={950}
          xpGained={50}
          thresholdPoints={1000}
          onAnimationComplete={jest.fn()}
        />,
      );

      act(() => {
        triggerAnimationComplete?.();
      });

      expect(screen.queryByTestId("progress-bar")).not.toBeInTheDocument();
    });
  });

  describe("自動クローズの起点", () => {
    it("バーを出さないケースは表示直後から3秒", () => {
      const onAnimationComplete = jest.fn();
      render(
        <XpProgressToastContent
          initialXp={300}
          xpGained={50}
          thresholdPoints={null}
          onAnimationComplete={onAnimationComplete}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(2999);
      });
      expect(onAnimationComplete).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(onAnimationComplete).toHaveBeenCalledTimes(1);
    });

    it("バーを出すケースはアニメーション完了から3秒", () => {
      const onAnimationComplete = jest.fn();
      render(
        <XpProgressToastContent
          initialXp={100}
          xpGained={50}
          thresholdPoints={1000}
          onAnimationComplete={onAnimationComplete}
        />,
      );

      // アニメーションが終わるまでは数え始めない
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(onAnimationComplete).not.toHaveBeenCalled();

      act(() => {
        triggerAnimationComplete?.();
      });
      act(() => {
        jest.advanceTimersByTime(2999);
      });
      expect(onAnimationComplete).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(onAnimationComplete).toHaveBeenCalledTimes(1);
    });
  });
});
