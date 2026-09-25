"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateLotterySettings } from "@/features/admin/actions/lottery-settings-actions";
import type { LotterySettings } from "@/features/lottery/services/lottery-settings";

type LotterySettingsFormProps = {
  settings: LotterySettings;
};

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </div>
  );
}

export function LotterySettingsForm({ settings }: LotterySettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateLotterySettings(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="max-w-xl space-y-5">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-700">保存しました</p>
        </div>
      )}

      <Field
        htmlFor="threshold_points"
        label="表示に必要なポイント（現在のシーズンの累計XP）"
        hint="このポイント以上で応募条件達成とみなす"
      >
        <input
          id="threshold_points"
          name="threshold_points"
          type="number"
          min={0}
          required
          defaultValue={settings.threshold_points}
          className={inputClass}
        />
      </Field>

      <Field
        htmlFor="eligible_display_from"
        label="応募フォーム公開日"
        hint="日本時間のこの日0時から応募フォームへの導線を表示します。空欄の場合はポイント条件のみで判定します。"
      >
        <input
          id="eligible_display_from"
          name="eligible_display_from"
          type="date"
          defaultValue={settings.eligible_display_from ?? ""}
          className={inputClass}
        />
      </Field>

      <Field
        htmlFor="eligible_display_until"
        label="応募終了日"
        hint="日本時間のこの日の終わり（翌日0時）まで応募を受け付けます。空欄の場合は終了しません。"
      >
        <input
          id="eligible_display_until"
          name="eligible_display_until"
          type="date"
          defaultValue={settings.eligible_display_until ?? ""}
          className={inputClass}
        />
      </Field>

      <Field htmlFor="title" label="見出し">
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={settings.title}
          className={inputClass}
        />
      </Field>

      <Field htmlFor="description" label="説明文">
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          defaultValue={settings.description}
          className={inputClass}
        />
      </Field>

      <Field htmlFor="button_label" label="ボタンラベル">
        <input
          id="button_label"
          name="button_label"
          type="text"
          required
          defaultValue={settings.button_label}
          className={inputClass}
        />
      </Field>

      <Field
        htmlFor="form_url"
        label="リンク先URL（応募フォーム）"
        hint="空欄の間はボタンを表示しない"
      >
        <input
          id="form_url"
          name="form_url"
          type="url"
          defaultValue={settings.form_url}
          placeholder="https://forms.gle/..."
          className={inputClass}
        />
      </Field>

      <Button type="submit" disabled={isPending}>
        {isPending ? "保存中..." : "保存"}
      </Button>
    </form>
  );
}
