/**
 * @jest-environment jsdom
 */
import { buildElementPath } from "./element-path";

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  const target = document.querySelector("[data-target]");
  if (!(target instanceof HTMLElement)) throw new Error("target not found");
  return target;
}

describe("buildElementPath", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("data-analytics-id を最優先で使う", () => {
    const target = mount(
      '<main><button data-target data-analytics-id="start-quest">はじめる</button></main>',
    );
    expect(buildElementPath(target)).toContain("button[start-quest]");
  });

  it("id があれば id を使う", () => {
    const target = mount(
      '<main><button data-target id="cta">押す</button></main>',
    );
    expect(buildElementPath(target)).toContain("button#cta");
  });

  it("祖先を辿って位置が分かる形にする", () => {
    const target = mount(
      '<section class="hero"><div><button data-target id="cta">押す</button></div></section>',
    );
    expect(buildElementPath(target)).toBe("section.hero > div > button#cta");
  });

  it("Tailwind のユーティリティクラスは識別子に使わない", () => {
    const target = mount(
      '<main><button data-target class="px-4 md:py-2 flex">押す</button></main>',
    );
    // "px-4" は3文字以下、"md:py-2" はコロン入り、"flex" は4文字だが意味が薄い。
    // 少なくともコロン入りのクラスが混ざらないことを担保する
    expect(buildElementPath(target)).not.toContain(":");
  });

  it("識別できる属性が無ければタグ名だけになる", () => {
    const target = mount("<main><button data-target>押す</button></main>");
    expect(buildElementPath(target).endsWith("button")).toBe(true);
  });

  it("3階層より上は辿らない", () => {
    const target = mount(
      '<div id="a"><div id="b"><div id="c"><button data-target id="d">押す</button></div></div></div>',
    );
    const path = buildElementPath(target);
    expect(path.split(" > ")).toHaveLength(3);
    expect(path).not.toContain("#a");
  });
});
