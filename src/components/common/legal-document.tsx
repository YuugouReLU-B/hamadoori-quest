import type { ReactNode } from "react";

/**
 * 利用規約・プライバシーポリシーの共通レイアウト。
 * 条文の見た目を2つのページで揃えるためだけの部品。
 */

export function LegalDocument({
  title,
  lead,
  updatedAt,
  children,
}: {
  title: string;
  lead: ReactNode;
  /** 表示用の最終更新日（例: 2026年9月29日） */
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white [overflow-wrap:anywhere]">
      <div className="mb-8">
        <h1 className="text-2xl-custom font-bold text-black mb-2">{title}</h1>
        <p className="text-xs text-gray-500 mb-4">最終更新日：{updatedAt}</p>
        <div className="text-sm-custom font-normal text-black text-justify">
          {lead}
        </div>
      </div>
      <div className="space-y-8">{children}</div>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg-custom font-bold text-black mb-4 border-b-2 border-tm-teal pb-2">
        {heading}
      </h2>
      <div className="space-y-3 text-sm-custom font-normal text-black text-justify">
        {children}
      </div>
    </section>
  );
}

/** 「1. 」「2. 」と番号を振る項 */
export function LegalNumberedList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="list-decimal pl-6 space-y-2">
      {items.map((item, index) => (
        // 条文は固定の並びで、並べ替えや追加削除が起きないので添字で足りる
        // biome-ignore lint/suspicious/noArrayIndexKey: 静的な条文
        <li key={index}>{item}</li>
      ))}
    </ol>
  );
}

/** 「(1)」「(2)」と番号を振る号 */
export function LegalItemList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 静的な条文
        <li key={index} className="flex gap-2">
          <span className="shrink-0">({index + 1})</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function ExternalLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 break-all"
    >
      {href}
    </a>
  );
}
