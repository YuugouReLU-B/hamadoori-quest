"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareButton } from "@/features/mission-detail/components/share-buttons/share-button";
import { ShareFacebookButton } from "@/features/mission-detail/components/share-buttons/share-facebook-button";
import { ShareLineButton } from "@/features/mission-detail/components/share-buttons/share-line-button";
import { ShareTwitterButton } from "@/features/mission-detail/components/share-buttons/share-twitter-button";
import { ShareUrlButton } from "@/features/mission-detail/components/share-buttons/share-url-button";
import { loadSuggestedEvent } from "@/features/mission-detail/loaders/suggested-events-loaders";
import type { SuggestedEvent } from "@/features/mission-detail/services/suggested-events";
import type { Tables } from "@/lib/types/supabase";
import { formatPoints } from "@/lib/utils/format-points";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mission: Tables<"missions">;
};

export function MissionCompleteDialog({ isOpen, onClose, mission }: Props) {
  const message = `「${mission.title}」を達成しました！`;
  const shareMessage = `浜通りクエストで${message} #浜通りクエスト\n`;

  const [suggestedEvent, setSuggestedEvent] = useState<SuggestedEvent | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    loadSuggestedEvent(mission.id).then((event) => {
      if (!cancelled) setSuggestedEvent(event);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, mission.id]);

  // OGP画像付きURLを生成（slugベース）
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/missions/${mission.slug}?type=complete`
      : "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-36px)] max-w-md mx-auto p-[18px] rounded-2xl [&>button]:w-6 [&>button]:h-6 [&>button>svg]:w-6 [&>button>svg]:h-6">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-center text-xl">
            おめでとうございます！
          </DialogTitle>
          <DialogDescription className="text-center">
            {message}
          </DialogDescription>
          {/* クエスト個別の画像があればそれを、無ければ共通のOGP画像を出す。
              Supabase Storage等の外部URLが来るため Image Optimization は使わない */}
          <img
            src={mission.ogp_image_url || "/img/ogp-default.png"}
            alt="クエストクリア"
            width={400}
            height={210}
            className="w-full mx-auto min-h-[158px] md:min-h-[215px]"
          />
        </DialogHeader>

        <section className="py-4">
          <header className="text-center mb-4">
            <p className="text-sm font-medium">シェアして応援の輪を広げよう</p>
          </header>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <ShareTwitterButton
              message={shareMessage}
              missionSlug={mission.slug}
              url={shareUrl}
            />
            <ShareFacebookButton missionSlug={mission.slug} url={shareUrl} />
            <ShareLineButton missionSlug={mission.slug} url={shareUrl} />
            <ShareButton
              message={shareMessage}
              missionSlug={mission.slug}
              url={shareUrl}
            />
            <ShareUrlButton url={shareUrl} />
          </div>
        </section>

        {suggestedEvent && (
          <section className="py-4 border-t">
            <header className="text-center mb-3">
              <p className="text-sm font-medium">他のイベントもチェック！</p>
            </header>
            <Link
              href={`/missions/${suggestedEvent.slug}`}
              onClick={onClose}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50"
            >
              <img
                src={suggestedEvent.icon_url ?? "/img/mission_fallback.svg"}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {suggestedEvent.title}
                </p>
                <p className="text-xs text-gray-500">
                  {formatPoints(suggestedEvent.points)}
                </p>
              </div>
            </Link>
          </section>
        )}

        <DialogFooter className="pt-4">
          <Button onClick={onClose} className="w-full">
            このまま閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
