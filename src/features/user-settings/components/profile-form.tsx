"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { FormMessage, type Message } from "@/components/common/form-message";
import { SubmitButton } from "@/components/common/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/features/user-settings/actions/profile-actions";

interface ProfileFormProps {
  message?: Message;
  isNew: boolean;
  initialProfile: {
    name?: string;
  } | null;
  /** 新規登録時、プロフィール保存後に遷移する先 */
  nextUrlAfterSignup?: string;
}

export default function ProfileForm({
  message,
  isNew,
  initialProfile,
  nextUrlAfterSignup,
}: ProfileFormProps) {
  const [queryMessage, setQueryMessage] = useState<Message | undefined>(
    message,
  );
  const [state, formAction, isPending] = useActionState(updateProfile, null);
  const router = useRouter();
  // 保存完了後、画面遷移が終わるまでボタンを「移動中」表示のままにする。
  // isPendingはアクション完了と同時にfalseへ戻るため、それだけだと
  // 遷移待ちの間だけボタンが一瞬「登録する」に戻って押せてしまう
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // 新規登録時の遷移は基本サーバーアクション側のリダイレクトで行う。
    // ここはそれが効かなかった場合のフォールバック
    if (state?.success && isNew && nextUrlAfterSignup) {
      setIsNavigating(true);
      router.push(nextUrlAfterSignup);
    }
    if (state?.success) {
      setQueryMessage(undefined);
    }
  }, [state?.success, isNew, router, nextUrlAfterSignup]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>プロフィール設定</CardTitle>
        <CardDescription>
          {isNew ? "ニックネームを登録します。" : "ニックネームを編集します。"}
        </CardDescription>
      </CardHeader>
      {queryMessage && (
        <div className="p-2 mb-4">
          <FormMessage message={queryMessage} />
        </div>
      )}
      <form action={formAction}>
        {/* 新規登録時の遷移先。サーバーアクション側でそのままリダイレクトする
            （クライアントに戻ってから router.push すると往復が1回増える）*/}
        {isNew && nextUrlAfterSignup && (
          <input type="hidden" name="nextUrl" value={nextUrlAfterSignup} />
        )}
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">ニックネーム</Label>
            <Input
              id="name"
              name="name"
              type="text"
              defaultValue={initialProfile?.name || ""}
              placeholder="あなたのニックネーム"
              maxLength={100}
              required
              disabled={isPending || isNavigating}
            />
            <p className="text-sm text-gray-500">
              このニックネームは他のユーザーに公開されます。
            </p>
          </div>

          {state?.success && (
            <p className="text-center text-sm text-green-600">
              {isNew
                ? "プロフィールを新規登録しました。"
                : "プロフィールを更新しました。"}
            </p>
          )}
          {state?.error && (
            <p className="text-center text-sm text-red-600">{state.error}</p>
          )}
        </CardContent>
        <CardFooter>
          <SubmitButton
            className="w-full"
            disabled={isPending || isNavigating}
            pendingText="登録中..."
          >
            {isNavigating ? "移動中..." : isNew ? "登録する" : "更新する"}
          </SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
