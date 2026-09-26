"use server";

import { z } from "zod";
import { getLotterySettings } from "@/features/lottery/services/lottery-settings";
import { VALID_JP_PREFECTURES } from "@/features/map-poster/constants/poster-prefectures";
import { LOCATION_TYPES } from "@/features/map-poster-residential/constants/location-types";
import { POSTER_TYPES } from "@/features/map-poster-residential/constants/poster-types";
import {
  MAX_POSTING_COUNT,
  MAX_RESIDENTIAL_POSTER_COUNT,
} from "@/lib/constants/mission-config";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/client";
import { ARTIFACT_TYPES } from "@/lib/types/artifact-types";
import { formatZodErrors } from "@/lib/utils/validation-utils";
import { achieveMission } from "../use-cases/achieve-mission";
import { cancelSubmission } from "../use-cases/cancel-submission";

// Quiz関連のServer Actionsをインポート
import {
  checkQuizAnswersAction,
  getMissionQuizCategoryAction,
  getQuizQuestionsAction,
} from "./quiz-actions";

// Quiz関連のServer Actionsを再エクスポート
export {
  getMissionQuizCategoryAction,
  getQuizQuestionsAction,
  checkQuizAnswersAction,
};

// 基本スキーマ（共通項目）
const baseMissionFormSchema = z.object({
  missionId: z.string().nonempty({ message: "クエストIDが必要です" }),
  requiredArtifactType: z
    .string()
    .nonempty({ message: "提出タイプが必要です" }),
  artifactDescription: z.string().optional(),
});

// LINKタイプ用スキーマ
const linkArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.LINK.key),
  artifactLink: z
    .string()
    .nonempty({ message: "リンクURLが必要です" })
    .url({ message: "有効なURLを入力してください" }),
});

// TEXTタイプ用スキーマ
const textArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.TEXT.key),
  artifactText: z.string().nonempty({ message: "テキストが必要です" }),
});

// EMAILタイプ用スキーマ
const emailArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.EMAIL.key),
  artifactEmail: z
    .string()
    .nonempty({ message: "メールアドレスが必要です" })
    .email({ message: "有効なメールアドレスを入力してください" }),
});

// IMAGEタイプ用スキーマ
const imageArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.IMAGE.key),
  artifactImagePath: z.string().nonempty({ message: "画像が必要です" }),
});

// IMAGE_WITH_GEOLOCATIONタイプ用スキーマ
const imageWithGeolocationArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.IMAGE_WITH_GEOLOCATION.key),
  artifactImagePath: z.string().nonempty({ message: "画像が必要です" }),
  latitude: z
    .string()
    .nonempty({ message: "緯度が必要です" })
    .refine((val) => !Number.isNaN(Number.parseFloat(val)), {
      message: "有効な緯度を入力してください",
    }),
  longitude: z
    .string()
    .nonempty({ message: "経度が必要です" })
    .refine((val) => !Number.isNaN(Number.parseFloat(val)), {
      message: "有効な経度を入力してください",
    }),
  accuracy: z
    .string()
    .optional()
    .refine((val) => !val || !Number.isNaN(Number.parseFloat(val)), {
      message: "有効な精度を入力してください",
    }),
  altitude: z
    .string()
    .optional()
    .refine((val) => !val || !Number.isNaN(Number.parseFloat(val)), {
      message: "有効な高度を入力してください",
    }),
});

// NONEタイプ用スキーマ
const noneArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.NONE.key),
});

// POSTINGタイプ用スキーマ
const postingArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.POSTING.key),
  postingCount: z.coerce
    .number()
    .min(1, { message: "ポスティング枚数は1枚以上で入力してください" })
    .max(MAX_POSTING_COUNT, {
      message: `ポスティング枚数は${MAX_POSTING_COUNT}枚以下で入力してください`,
    }),
  locationText: z.string().optional(),
});

// POSTERタイプ用スキーマ
const posterArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.POSTER.key),
  prefecture: z
    .string()
    .min(1, { message: "都道府県を選択してください" })
    .refine(
      (val): val is (typeof VALID_JP_PREFECTURES)[number] =>
        VALID_JP_PREFECTURES.includes(
          val as (typeof VALID_JP_PREFECTURES)[number],
        ),
      {
        message: "有効な都道府県を選択してください",
      },
    ),
  city: z
    .string()
    .min(1, { message: "市町村＋区を入力してください" })
    .max(100, { message: "市町村＋区は100文字以下で入力してください" }),
  boardNumber: z
    .string()
    .min(1, { message: "番号を入力してください" })
    .max(20, { message: "番号は20文字以下で入力してください" }),
  boardName: z
    .string()
    .max(100, { message: "名前は100文字以下で入力してください" })
    .optional(),
  boardNote: z
    .string()
    .max(200, { message: "状況は200文字以下で入力してください" })
    .optional(),
  boardAddress: z
    .string()
    .max(200, { message: "住所は200文字以下で入力してください" })
    .optional(),
  boardLat: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        (!Number.isNaN(Number.parseFloat(val)) &&
          Number.parseFloat(val) >= -90 &&
          Number.parseFloat(val) <= 90),
      {
        message: "緯度は-90から90の間の数値で入力してください",
      },
    ),
  boardLong: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        (!Number.isNaN(Number.parseFloat(val)) &&
          Number.parseFloat(val) >= -180 &&
          Number.parseFloat(val) <= 180),
      {
        message: "経度は-180から180の間の数値で入力してください",
      },
    ),
});

// RESIDENTIAL_POSTERタイプ用スキーマ
const residentialPosterArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.RESIDENTIAL_POSTER.key),
  residentialPosterCount: z.coerce
    .number()
    .int({ message: "掲示枚数は整数で入力してください" })
    .min(1, { message: "掲示枚数は1枚以上で入力してください" })
    .max(MAX_RESIDENTIAL_POSTER_COUNT, {
      message: `掲示枚数は${MAX_RESIDENTIAL_POSTER_COUNT}枚以下で入力してください`,
    }),
  locationType: z
    .string()
    .nonempty({ message: "種別を選択してください" })
    .refine((val) => LOCATION_TYPES.some((type) => type.value === val), {
      message: "有効な種別を選択してください",
    }),
  posterType: z
    .string()
    .nonempty({ message: "ポスターの種類を選択してください" })
    .refine((val) => POSTER_TYPES.some((type) => type.value === val), {
      message: "有効なポスターの種類を選択してください",
    }),
  placedDate: z.string().nonempty({ message: "日付を入力してください" }),
  locationText: z
    .string()
    .nonempty({ message: "郵便番号を入力してください" })
    .refine((val) => /^\d{7}$/.test(val), {
      message: "郵便番号はハイフンなし7桁で入力をお願いします",
    }),
});

// QUIZタイプ用スキーマ（sessionIdは不要）
const quizArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.QUIZ.key),
});

// LINK_ACCESSタイプ用スキーマ
const linkAccessArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.LINK_ACCESS.key),
});

// LINE_FRIENDタイプ用スキーマ（提出物なし。友だち状態はサーバーが判定する）
const lineFriendArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.LINE_FRIEND.key),
});

// QRタイプ用スキーマ（提出物なし。読み取ったコードの正当性はサーバーが判定する）
const qrArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.QR.key),
});

// GEO_CHECKINタイプ用スキーマ（提出物なし。位置情報の判定は専用アクションで行う）
const geoCheckinArtifactSchema = baseMissionFormSchema.extend({
  requiredArtifactType: z.literal(ARTIFACT_TYPES.GEO_CHECKIN.key),
});

// 統合スキーマ
const achieveMissionFormSchema = z.discriminatedUnion("requiredArtifactType", [
  linkArtifactSchema,
  textArtifactSchema,
  emailArtifactSchema,
  imageArtifactSchema,
  imageWithGeolocationArtifactSchema,
  noneArtifactSchema,
  postingArtifactSchema,
  posterArtifactSchema,
  residentialPosterArtifactSchema,
  quizArtifactSchema,
  linkAccessArtifactSchema,
  lineFriendArtifactSchema,
  qrArtifactSchema,
  geoCheckinArtifactSchema,
]);

export type AchieveMissionFormData = z.infer<typeof achieveMissionFormSchema>;

// 提出キャンセルアクションのバリデーションスキーマ
const cancelSubmissionFormSchema = z.object({
  achievementId: z.string().nonempty({ message: "達成IDが必要です" }),
  missionId: z.string().nonempty({ message: "クエストIDが必要です" }),
});

export const achieveMissionAction = async (formData: FormData) => {
  const supabase = createClient();
  const missionId = formData.get("missionId")?.toString();
  const requiredArtifactType = formData.get("requiredArtifactType")?.toString();

  // QRスポットは現地のコードを読んだときだけ達成させる。
  // このアクションから通してしまうと、ミッション画面のボタンを押すだけで
  // 現地に行かずにポイントを取れてしまい、QRである意味が無くなる。
  if (requiredArtifactType === ARTIFACT_TYPES.QR.key) {
    // success を literal にしないと戻り値の型が boolean に広がり、
    // 呼び出し側の success === true での絞り込みが効かなくなる
    return {
      success: false as const,
      error: "このクエストは現地のQRコードを読み取ると達成になります",
    };
  }

  // GEO_CHECKINも同様に、位置情報を判定する専用アクション（geoCheckinAction）
  // からしか達成させない。ここを通してしまうと、ボタンを押すだけで
  // 現地に行かずにポイントを取れてしまう。
  if (requiredArtifactType === ARTIFACT_TYPES.GEO_CHECKIN.key) {
    return {
      success: false as const,
      error:
        "このクエストは現地で「イベントに来た」ボタンを押すと達成になります",
    };
  }

  const artifactLink = formData.get("artifactLink")?.toString();
  const artifactText = formData.get("artifactText")?.toString();
  const artifactEmail = formData.get("artifactEmail")?.toString();
  const artifactImagePath = formData.get("artifactImagePath")?.toString();
  const artifactDescription = formData.get("artifactDescription")?.toString();
  // 位置情報データの取得
  const latitude = formData.get("latitude")?.toString();
  const longitude = formData.get("longitude")?.toString();
  const accuracy = formData.get("accuracy")?.toString();
  const altitude = formData.get("altitude")?.toString();
  // ポスティング用データの取得
  const postingCount = formData.get("postingCount")?.toString();
  const locationText = formData.get("locationText")?.toString();
  // 私有地ポスター用データの取得
  const residentialPosterCount = formData
    .get("residentialPosterCount")
    ?.toString();
  const locationType = formData.get("locationType")?.toString();
  const posterType = formData.get("posterType")?.toString();
  const placedDate = formData.get("placedDate")?.toString();
  // ポスター用データの取得
  const prefecture = formData.get("prefecture")?.toString();
  const city = formData.get("city")?.toString();
  const boardNumber = formData.get("boardNumber")?.toString();
  const boardName = formData.get("boardName")?.toString();
  const boardNote = formData.get("boardNote")?.toString();
  const boardAddress = formData.get("boardAddress")?.toString();
  const boardLat = formData.get("boardLat")?.toString();
  const boardLong = formData.get("boardLong")?.toString();
  const boardId = formData.get("boardId")?.toString();

  const validatedFields = achieveMissionFormSchema.safeParse({
    missionId,
    requiredArtifactType,
    artifactLink,
    artifactText,
    artifactEmail,
    artifactImagePath,
    artifactDescription,
    latitude,
    longitude,
    accuracy,
    altitude,
    postingCount,
    locationText,
    residentialPosterCount,
    locationType,
    posterType,
    placedDate,
    prefecture,
    city,
    boardNumber,
    boardName,
    boardNote,
    boardAddress,
    boardLat,
    boardLong,
  });

  if (!validatedFields.success) {
    return {
      success: false as const,
      error: formatZodErrors(validatedFields.error),
    };
  }

  const validatedData = validatedFields.data;
  const {
    missionId: validatedMissionId,
    requiredArtifactType: validatedRequiredArtifactType,
    artifactDescription: validatedArtifactDescription,
  } = validatedData;

  // ユーザーがログイン済みかチェック (念のため)
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return {
      success: false as const,
      error: "認証エラーが発生しました。",
    };
  }

  // ユースケースに委譲（ミッション達成コアロジック）
  const adminClient = await createAdminClient();
  const result = await achieveMission(adminClient, supabase, {
    userId: authUser.id,
    missionId: validatedMissionId,
    artifactType: validatedRequiredArtifactType,
    artifactData: validatedData,
    artifactDescription: validatedArtifactDescription,
    shapeId: formData.get("shapeId") as string | null,
    boardId: boardId || null,
  });

  if (!result.success) {
    return result;
  }

  // 抽選応募のしきい値を、達成トーストの進捗バー用にサーバー側で解決して返す。
  // getLotterySettings は server-only なのでクライアントからは呼べない。
  // 取得に失敗しても null を返すだけで、達成自体は失敗させない
  // （しきい値が無ければトーストはバーを出さず、獲得ポイントだけを出す）。
  const lotterySettings = await getLotterySettings();

  return {
    ...result,
    thresholdPoints: lotterySettings?.threshold_points ?? null,
  };
};

export const cancelSubmissionAction = async (formData: FormData) => {
  const achievementId = formData.get("achievementId")?.toString();
  const missionId = formData.get("missionId")?.toString();

  // zodによるバリデーション
  const validatedFields = cancelSubmissionFormSchema.safeParse({
    achievementId,
    missionId,
  });

  if (!validatedFields.success) {
    return {
      success: false as const,
      error: formatZodErrors(validatedFields.error),
    };
  }

  const {
    achievementId: validatedAchievementId,
    missionId: validatedMissionId,
  } = validatedFields.data;

  const supabase = createClient();

  // ユーザーがログイン済みかチェック
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return { success: false as const, error: "認証エラーが発生しました。" };
  }

  // ユースケースに委譲
  const adminSupabase = await createAdminClient();
  return cancelSubmission(adminSupabase, supabase, {
    userId: authUser.id,
    achievementId: validatedAchievementId,
    missionId: validatedMissionId,
  });
};
