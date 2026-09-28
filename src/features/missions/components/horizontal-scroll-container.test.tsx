import { fireEvent, render, screen } from "@testing-library/react";
import { HorizontalScrollContainer } from "./horizontal-scroll-container";

// jsdom には ResizeObserver が無い。スクロールボタンの出し分けにしか使って
// いないので、何もしないスタブで足りる
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

/** isDesktop の判定は window.innerWidth >= 768 */
function setDesktop(isDesktop: boolean) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: isDesktop ? 1280 : 375,
  });
}

function renderWithLink() {
  const onClick = jest.fn((e: React.MouseEvent) => e.preventDefault());
  render(
    <HorizontalScrollContainer>
      <a href="/missions/dummy" onClick={onClick}>
        ダミークエスト
      </a>
    </HorizontalScrollContainer>,
  );
  return { link: screen.getByRole("link"), onClick };
}

describe("HorizontalScrollContainer", () => {
  afterEach(() => {
    setDesktop(false);
  });

  it("掴んで大きく動かしたあとのクリックは握りつぶす", () => {
    setDesktop(true);
    const { link, onClick } = renderWithLink();
    const section = screen.getByLabelText("スクロール可能なクエストコンテナ");

    fireEvent.mouseDown(section, { clientX: 300 });
    fireEvent.mouseMove(section, { clientX: 200 });
    fireEvent.mouseUp(section);
    fireEvent.click(link);

    expect(onClick).not.toHaveBeenCalled();
  });

  it("ほとんど動いていなければクリックとして通す", () => {
    setDesktop(true);
    const { link, onClick } = renderWithLink();
    const section = screen.getByLabelText("スクロール可能なクエストコンテナ");

    // 手ぶれ程度（しきい値は5px）
    fireEvent.mouseDown(section, { clientX: 300 });
    fireEvent.mouseMove(section, { clientX: 297 });
    fireEvent.mouseUp(section);
    fireEvent.click(link);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("握りつぶすのは1回だけで、次のクリックは通す", () => {
    setDesktop(true);
    const { link, onClick } = renderWithLink();
    const section = screen.getByLabelText("スクロール可能なクエストコンテナ");

    fireEvent.mouseDown(section, { clientX: 300 });
    fireEvent.mouseMove(section, { clientX: 200 });
    fireEvent.mouseUp(section);
    fireEvent.click(link);
    fireEvent.click(link);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("モバイル幅ではドラッグ自体が働かないのでクリックは常に通る", () => {
    setDesktop(false);
    const { link, onClick } = renderWithLink();
    const section = screen.getByLabelText("スクロール可能なクエストコンテナ");

    fireEvent.mouseDown(section, { clientX: 300 });
    fireEvent.mouseMove(section, { clientX: 200 });
    fireEvent.mouseUp(section);
    fireEvent.click(link);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
