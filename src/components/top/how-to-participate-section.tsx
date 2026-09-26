"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type HowToParticipateSectionProps = {
  /** ログイン済みユーザーには開閉できるアコーディオンにする。未ログインは常に開いたまま */
  collapsible: boolean;
};

export function HowToParticipateSection({
  collapsible,
}: HowToParticipateSectionProps) {
  const [isOpen, setIsOpen] = useState(!collapsible);
  const showImage = !collapsible || isOpen;

  return (
    <div className="max-w-6xl mx-auto px-4">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="w-full flex items-center justify-center gap-2 text-2xl md:text-3xl font-bold text-gray-900 mb-3"
        >
          <span>参加方法</span>
          <ChevronDown
            className={`h-6 w-6 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>
      ) : (
        <h2 className="text-2xl md:text-3xl text-gray-900 mb-3 text-center">
          参加方法
        </h2>
      )}

      {showImage && (
        <>
          <Image
            src="/img/how-to-participate-mobile.png"
            alt="参加方法：1. 浜通りクエストを開く 2. イベント参加・プレイヤー訪問 3. その場でポイント獲得 4. 1000ptで景品応募"
            width={1135}
            height={1243}
            className="w-full h-auto rounded-lg md:hidden"
          />
          <Image
            src="/img/how-to-participate.png"
            alt="参加方法：1. 浜通りクエストを開く 2. イベント参加・プレイヤー訪問 3. その場でポイント獲得 4. 1000ptで景品応募"
            width={1672}
            height={693}
            className="hidden md:block w-full h-auto rounded-lg"
          />
        </>
      )}
    </div>
  );
}
