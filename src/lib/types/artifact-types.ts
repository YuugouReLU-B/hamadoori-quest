export const ARTIFACT_TYPES = {
  LINK: {
    key: "LINK",
    displayName: "リンク",
    prompt: "成果物のURLを入力してください。",
    validationRegex: /^https?:\/\/.+/,
  },
  TEXT: {
    key: "TEXT",
    displayName: "テキスト",
    prompt: "成果物のテキストを入力してください。",
  },
  EMAIL: {
    key: "EMAIL",
    displayName: "メールアドレス",
    prompt: "成果物のメールアドレスを入力してください。",
    validationRegex: /^[\w!#$%&'*+/=?`{|}~^.-]+@[\w.-]+\.[a-zA-Z]{2,}$/,
  },
  IMAGE: {
    key: "IMAGE",
    displayName: "画像",
    prompt: "画像の添付が必要です。",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxFileSizeMB: 10,
  },
  IMAGE_WITH_GEOLOCATION: {
    key: "IMAGE_WITH_GEOLOCATION",
    displayName: "画像および位置情報",
    prompt: "画像の添付と位置情報の設定が必要です。",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxFileSizeMB: 10,
  },
  REFERRAL: {
    key: "REFERRAL",
    displayName: "紹介クエスト",
    prompt: "このクエストでは紹介が完了すると自動で達成されます。",
  },
  REFERRED: {
    key: "REFERRED",
    displayName: "紹介されて開始",
    prompt: "紹介URLから登録すると自動で達成になります。",
  },
  POSTING: {
    key: "POSTING",
    displayName: "ポスティング",
    prompt: "ポスティングした枚数と場所を入力してください。",
  },
  POSTER: {
    key: "POSTER",
    displayName: "選挙区ポスター",
    prompt: "選挙区ポスターを貼った枚数を入力してください。",
  },
  QUIZ: {
    key: "QUIZ",
    displayName: "クイズ",
    prompt: "クイズに正解してクエストを達成しましょう。",
  },
  LINK_ACCESS: {
    key: "LINK_ACCESS",
    displayName: "リンクアクセス",
    prompt: "リンクをクリックするとクエストが達成されます。",
  },
  LINE_FRIEND: {
    key: "LINE_FRIEND",
    displayName: "公式LINE友だち追加",
    prompt:
      "公式LINEを友だち追加すると達成になります。追加後に「追加を確認する」を押してください。",
  },
  QR: {
    key: "QR",
    displayName: "QRスポット",
    prompt: "現地のQRコードを読み取ると達成になります。",
  },
  GEO_CHECKIN: {
    key: "GEO_CHECKIN",
    displayName: "位置情報チェックイン",
    prompt:
      "現地に着いたら「イベントに来た」ボタンを押すと、位置情報を判定して達成になります。",
  },
  RESIDENTIAL_POSTER: {
    key: "RESIDENTIAL_POSTER",
    displayName: "私有地ポスター",
    prompt: "私有地ポスターを掲示した枚数と郵便番号を入力してください。",
  },
  NONE: {
    key: "NONE",
    displayName: "添付データ不要",
    prompt: "このクエストでは添付データの投稿は不要です。",
  },
} as const;

/**
 * 提出物を保存しない達成の種類。
 *
 * 達成の記録とXP付与だけを行い、mission_artifacts には何も入れない。
 * mission_artifacts には「link_url / text_content / image_storage_path の
 * いずれかが必須」というCHECK制約があるため、ここに入れ忘れると
 * 達成しようとした瞬間に制約違反で失敗する。
 */
export const ARTIFACT_TYPES_WITHOUT_SUBMISSION: ReadonlySet<string> = new Set([
  ARTIFACT_TYPES.NONE.key,
  ARTIFACT_TYPES.LINK_ACCESS.key,
  ARTIFACT_TYPES.LINE_FRIEND.key,
  ARTIFACT_TYPES.QR.key,
  ARTIFACT_TYPES.GEO_CHECKIN.key,
]);

export type ArtifactTypeKey = keyof typeof ARTIFACT_TYPES;

export type ArtifactConfig = (typeof ARTIFACT_TYPES)[ArtifactTypeKey];

export function getArtifactConfig(
  typeKey: ArtifactTypeKey | string | undefined | null,
): ArtifactConfig | undefined {
  if (!typeKey || !Object.keys(ARTIFACT_TYPES).includes(typeKey)) {
    // 不明なタイプやNONEの場合は、NONEの設定を返すか、undefinedを返す
    // ここではNONEをデフォルトとして扱う
    return ARTIFACT_TYPES.NONE;
  }
  return ARTIFACT_TYPES[typeKey as ArtifactTypeKey];
}

// ミッションの required_artifact_type に保存する値の型
export type MissionRequiredArtifactType =
  | ArtifactTypeKey
  | "LINK"
  | "TEXT"
  | "EMAIL"
  | "IMAGE"
  | "IMAGE_WITH_GEOLOCATION"
  | "REFERRAL"
  | "REFERRED"
  | "POSTING"
  | "POSTER"
  | "LINE_FRIEND"
  | "QR"
  | "GEO_CHECKIN"
  | "RESIDENTIAL_POSTER"
  | "NONE";
