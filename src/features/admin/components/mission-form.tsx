"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { AdminActionResult } from "@/features/admin/actions/mission-actions";
import { CREATABLE_ARTIFACT_TYPES } from "@/features/admin/constants/creatable-artifact-types";
import type { AdminCategory } from "@/features/admin/services/admin-categories";
import { EVENT_TYPES } from "@/features/missions/constants/event-types";
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  QUEST_CATEGORIES,
  QUEST_CATEGORY_LABELS,
} from "@/features/missions/constants/quest-categories";
import { defaultPointsForDifficulty } from "@/features/user-level/utils/level-calculator";
import { ARTIFACT_TYPES, getArtifactConfig } from "@/lib/types/artifact-types";
import type { Tables } from "@/lib/types/supabase";

type MissionFormProps = {
  /** 編集時は既存のミッション。新規作成時は undefined */
  mission?: Tables<"missions">;
  categories: AdminCategory[];
  /** 編集時に既に紐付いているカテゴリ */
  selectedCategoryIds?: string[];
  action: (formData: FormData) => Promise<AdminActionResult>;
  submitLabel: string;
};

/**
 * 達成の種類の選択肢。新しく作れる種別に加えて、編集中のクエストの今の種別も出す
 * （LINE友だち・紹介など既存のクエストを、種別を変えずに保存できるようにするため）
 */
function artifactTypeOptions(currentType: string | undefined) {
  const keys = [...CREATABLE_ARTIFACT_TYPES];
  if (currentType && !keys.includes(currentType)) {
    keys.push(currentType);
  }
  return keys.map((key) => {
    const config = getArtifactConfig(key);
    return {
      value: key,
      label: `${config?.displayName ?? key}（${key}）`,
    };
  });
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  /** 対応する入力要素の id。ラベルをクリックしたときに移動できるようにする */
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

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

export function MissionForm({
  mission,
  categories,
  selectedCategoryIds = [],
  action,
  submitLabel,
}: MissionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>(selectedCategoryIds);
  const [artifactType, setArtifactType] = useState(
    mission?.required_artifact_type ?? ARTIFACT_TYPES.GEO_CHECKIN.key,
  );
  // 難易度は画面表示から廃止したが、DBカラムは残っているため既存値をそのまま送る
  const [difficulty] = useState(mission?.difficulty ?? 1);
  const [points, setPoints] = useState(
    mission?.points ?? defaultPointsForDifficulty(1),
  );

  const [questCategory, setQuestCategory] = useState(
    mission?.quest_category ?? "PERMANENT",
  );
  // 新規作成時は毎回考えず済むよう、ランダムなslugを初期値にしておく。
  // 必要なら送信前に書き換えられる（変更すると既存リンクは切れる）
  const [slug] = useState(
    () => mission?.slug ?? `quest-${crypto.randomUUID().slice(0, 8)}`,
  );

  const isQrSpot = artifactType === ARTIFACT_TYPES.QR.key;
  const isGeoCheckin = artifactType === ARTIFACT_TYPES.GEO_CHECKIN.key;
  const hasLocationFields = isQrSpot || isGeoCheckin;

  const isSpecialQuest =
    questCategory === "SPECIAL_HAMADORI" || questCategory === "SPECIAL_TOKYO";

  const toggleCategory = (categoryId: string) => {
    setCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/admin/missions/${result.missionId}`);
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor="slug"
          label="slug"
          hint="URLに使う。あとから変えるとリンクが切れる"
        >
          <input
            name="slug"
            id="slug"
            defaultValue={slug}
            required
            pattern="[a-z0-9][a-z0-9\-]*"
            className={inputClass}
            placeholder="michinoeki-namie"
          />
        </Field>

        <Field htmlFor="title" label="タイトル">
          <input
            name="title"
            id="title"
            defaultValue={mission?.title}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="quest_category" label="クエストカテゴリ">
          <select
            id="quest_category"
            name="quest_category"
            required
            value={questCategory}
            onChange={(e) =>
              setQuestCategory(e.target.value as typeof questCategory)
            }
            className={inputClass}
          >
            {QUEST_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {QUEST_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor="event_category" label="イベントカテゴリ">
          <select
            id="event_category"
            name="event_category"
            defaultValue={mission?.event_category ?? ""}
            className={inputClass}
          >
            <option value="">未設定</option>
            {EVENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {EVENT_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-2 text-sm font-bold">出すカテゴリ</legend>
        <p className="mb-3 text-xs text-gray-500">
          トップページにはクエストカテゴリごとに表示します。
          どれも選ばないと、公開にしてもトップページには出ません。
        </p>

        {categories.length === 0 ? (
          <p className="text-sm text-gray-500">
            カテゴリがまだありません（mission_data/categories.yaml で作ります）
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="category_ids"
                  value={category.id}
                  checked={categoryIds.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
                <span
                  className={
                    category.visibleMissionCount === 0 ? "text-gray-400" : ""
                  }
                >
                  {category.title}
                  <span className="ml-1 text-xs text-gray-500">
                    {category.visibleMissionCount === 0
                      ? "（未使用）"
                      : `（公開 ${category.visibleMissionCount}）`}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        {categories.length > 0 && categoryIds.length === 0 && (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            カテゴリを選んでいないので、トップページには出ません。
            URLを直接開いた人だけが見られる状態になります。
          </p>
        )}
      </fieldset>

      <Field htmlFor="content" label="説明" hint="HTMLを書ける">
        <textarea
          name="content"
          id="content"
          defaultValue={mission?.content ?? ""}
          rows={5}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="required_artifact_type" label="達成の種類">
          <select
            name="required_artifact_type"
            id="required_artifact_type"
            value={artifactType}
            onChange={(e) => setArtifactType(e.target.value)}
            className={inputClass}
          >
            {artifactTypeOptions(mission?.required_artifact_type).map(
              (option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* 難易度は画面表示から廃止したが、DBカラムは残っているため固定値を送る */}
        <input type="hidden" name="difficulty" value={difficulty} />

        <Field htmlFor="points" label="ポイント" hint="実際に付与されるXP">
          <input
            name="points"
            id="points"
            type="number"
            min={0}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            required
            className={inputClass}
          />
        </Field>

        <Field
          htmlFor="max_achievement_count"
          label="達成できる回数"
          hint="空欄なら無制限"
        >
          <input
            name="max_achievement_count"
            id="max_achievement_count"
            type="number"
            min={1}
            defaultValue={mission?.max_achievement_count ?? 1}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor="artifact_label"
          label="提出物のラベル"
          hint="提出欄の見出し。不要なら空欄"
        >
          <input
            name="artifact_label"
            id="artifact_label"
            defaultValue={mission?.artifact_label ?? ""}
            className={inputClass}
          />
        </Field>

        <Field
          htmlFor="event_type"
          label="イベント種別"
          hint="アイコンの自動選択に使う"
        >
          <select
            name="event_type"
            id="event_type"
            defaultValue={mission?.event_type ?? ""}
            className={inputClass}
          >
            <option value="">選択しない</option>
            {Object.values(EVENT_TYPES).map((type) => (
              <option key={type.key} value={type.key}>
                {type.displayName}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor="event_date"
          label={isSpecialQuest ? "開始日" : "イベント日"}
          hint="イベント系クエストのみ"
        >
          <input
            name="event_date"
            id="event_date"
            type="date"
            defaultValue={mission?.event_date ?? ""}
            className={inputClass}
          />
        </Field>

        {isSpecialQuest && (
          <Field
            htmlFor="event_end_date"
            label="終了日"
            hint="特設クエストのみ"
          >
            <input
              name="event_end_date"
              id="event_end_date"
              type="date"
              defaultValue={mission?.event_end_date ?? ""}
              className={inputClass}
            />
          </Field>
        )}
      </div>

      <Field
        htmlFor="supplement"
        label="補足"
        hint="提出物のラベルとは別の自由記述欄"
      >
        <textarea
          name="supplement"
          id="supplement"
          defaultValue={mission?.supplement ?? ""}
          rows={3}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field htmlFor="tag1" label="タグ1">
          <input
            name="tag1"
            id="tag1"
            defaultValue={mission?.tag1 ?? ""}
            className={inputClass}
          />
        </Field>
        <Field htmlFor="tag2" label="タグ2">
          <input
            name="tag2"
            id="tag2"
            defaultValue={mission?.tag2 ?? ""}
            className={inputClass}
          />
        </Field>
        <Field htmlFor="tag3" label="タグ3">
          <input
            name="tag3"
            id="tag3"
            defaultValue={mission?.tag3 ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      {/* 写真・注目ミッションはフォームから外したが、既存値は変えずにそのまま送る */}
      <input
        type="hidden"
        name="ogp_image_url"
        value={mission?.ogp_image_url ?? ""}
      />
      {mission?.is_featured && (
        <input type="hidden" name="is_featured" value="on" />
      )}

      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-2 text-sm font-bold">住所・地図リンク</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field htmlFor="address" label="住所">
            <input
              name="address"
              id="address"
              defaultValue={mission?.address ?? ""}
              className={inputClass}
              placeholder="福島県いわき市..."
            />
          </Field>
          <Field htmlFor="google_map_url" label="Googleマップの共有URL">
            <input
              name="google_map_url"
              id="google_map_url"
              type="url"
              defaultValue={mission?.google_map_url ?? ""}
              className={inputClass}
              placeholder="https://maps.app.goo.gl/..."
            />
          </Field>
        </div>
      </fieldset>

      {hasLocationFields && (
        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="px-2 text-sm font-bold">スポットの位置</legend>
          <p className="mb-3 text-xs text-gray-500">
            {isGeoCheckin
              ? "「イベントに来た」ボタンを押した位置から、この座標を中心とした半径以内なら達成になります。"
              : "ベータでは位置による判定はしません。周遊の集計と、あとから「スポットの近くでしか読めない」を足すために記録しておきます。"}
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field htmlFor="latitude" label="緯度">
              <input
                name="latitude"
                id="latitude"
                type="number"
                step="any"
                required={isGeoCheckin}
                defaultValue={mission?.latitude ?? ""}
                className={inputClass}
                placeholder="37.4917"
              />
            </Field>
            <Field htmlFor="longitude" label="経度">
              <input
                name="longitude"
                id="longitude"
                type="number"
                step="any"
                required={isGeoCheckin}
                defaultValue={mission?.longitude ?? ""}
                className={inputClass}
                placeholder="141.0000"
              />
            </Field>
          </div>

          {isGeoCheckin && (
            <div className="mt-5">
              <Field
                htmlFor="radius_meters"
                label="判定半径（m）"
                hint="この距離以内なら達成になる。会場の広さに合わせて調整する"
              >
                <input
                  name="radius_meters"
                  id="radius_meters"
                  type="number"
                  min={1}
                  required
                  defaultValue={mission?.radius_meters ?? 300}
                  className={inputClass}
                  placeholder="300"
                />
              </Field>
            </div>
          )}
        </fieldset>
      )}

      {!hasLocationFields && (
        <>
          <input type="hidden" name="latitude" value="" />
          <input type="hidden" name="longitude" value="" />
        </>
      )}

      {!isGeoCheckin && <input type="hidden" name="radius_meters" value="" />}

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_hidden"
            defaultChecked={mission?.is_hidden ?? true}
          />
          非表示にする
        </label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/missions")}
          disabled={isPending}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
