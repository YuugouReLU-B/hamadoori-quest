/**
 * クリックされた要素を、あとから人が読んで特定できる短い文字列にする。
 *
 * 目的は「どのボタンが押されたか」を集計できるようにすること。
 * ページ内の位置まで完全に再現する必要はないので、id / data-analytics-id /
 * 最初のクラス名程度に留めて、祖先を3つまで辿る。
 * React の生成クラス名やユーティリティクラスが大量に付くため、クラスは1つだけ使う。
 */

const MAX_DEPTH = 3;
const MAX_PATH_LENGTH = 255;

/** Tailwind のユーティリティクラスは識別に役立たないので落とす */
function pickClassName(element: Element): string | null {
  const className = element.getAttribute("class");
  if (!className) return null;

  const candidate = className
    .split(/\s+/)
    .filter(Boolean)
    // ユーティリティらしさの薄い、意味のありそうなクラス名だけ残す
    .find((name) => /^[a-z][a-z0-9-]{3,}$/i.test(name) && !name.includes(":"));

  return candidate ?? null;
}

function describeElement(element: Element): string {
  const tag = element.tagName.toLowerCase();

  const analyticsId = element.getAttribute("data-analytics-id");
  if (analyticsId) return `${tag}[${analyticsId}]`;

  if (element.id) return `${tag}#${element.id}`;

  const testId = element.getAttribute("data-testid");
  if (testId) return `${tag}[${testId}]`;

  const className = pickClassName(element);
  return className ? `${tag}.${className}` : tag;
}

/** 要素から祖先方向へ辿った位置表現。例: "main > section.hero > button[start-quest]" */
export function buildElementPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  for (let depth = 0; current && depth < MAX_DEPTH; depth += 1) {
    parts.unshift(describeElement(current));
    current = current.parentElement;
    if (current && current.tagName === "BODY") break;
  }

  return parts.join(" > ").slice(0, MAX_PATH_LENGTH);
}
