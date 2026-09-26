/**
 * アプリで使う色の定義元カタログ。
 *
 * 実際の値は `src/app/globals.css` の `:root` にある CSS 変数が持ち、
 * このファイルはそれに対するメタデータ（表示名・グループ・既定値・変更可否）だけを持つ。
 * 両者のズレは `color-tokens.test.ts` が globals.css をパースして検証する。
 *
 * `/dev` の「デザイン差し替え」タブは、ここに列挙された変数を
 * `document.documentElement.style` で上書きしてプレビューする。
 */

export interface ColorToken {
  /** CSS カスタムプロパティ名（先頭の `--` を含む） */
  cssVar: string;
  /** UI 上の表示名 */
  label: string;
  /** globals.css に書かれている既定値 */
  defaultValue: string;
  /**
   * 色の表現形式。
   * - `hex`: `#30baa7`
   * - `hsl-triplet`: `168 59% 41%`（shadcn/ui 形式。`hsl(var(--x))` として使われる）
   */
  format: "hex" | "hsl-triplet";
  /** 変更を許可しない色（外部サービスのブランド色など） */
  locked?: boolean;
  /** 補足説明 */
  note?: string;
}

export interface ColorTokenGroup {
  id: string;
  label: string;
  description: string;
  tokens: ColorToken[];
}

const hex = (
  cssVar: string,
  label: string,
  defaultValue: string,
  extra?: Partial<ColorToken>,
): ColorToken => ({
  cssVar,
  label,
  defaultValue,
  format: "hex",
  ...extra,
});

const hsl = (
  cssVar: string,
  label: string,
  defaultValue: string,
): ColorToken => ({ cssVar, label, defaultValue, format: "hsl-triplet" });

/**
 * shadcn/ui のセマンティックトークン。
 * `hsl(var(--primary))` の形で Tailwind の色名（bg-primary 等）に割り当てられている。
 */
export const SEMANTIC_TOKEN_GROUP: ColorTokenGroup = {
  id: "semantic",
  label: "セマンティックトークン",
  description:
    "shadcn/ui のデザイントークン。bg-primary / text-muted-foreground などのクラスがこれを参照する。UI 全体の基調色はここで決まる。",
  tokens: [
    hsl("--background", "背景", "48 38% 97%"),
    hsl("--foreground", "前景（本文）", "13 25% 11%"),
    hsl("--card", "カード背景", "0 0% 100%"),
    hsl("--card-foreground", "カード前景", "13 25% 11%"),
    hsl("--popover", "ポップオーバー背景", "0 0% 100%"),
    hsl("--popover-foreground", "ポップオーバー前景", "13 25% 11%"),
    hsl("--primary", "プライマリ", "55 100% 50%"),
    hsl("--primary-foreground", "プライマリ前景", "13 25% 11%"),
    hsl("--secondary", "セカンダリ", "48 20% 95%"),
    hsl("--secondary-foreground", "セカンダリ前景", "13 25% 11%"),
    hsl("--muted", "ミュート", "48 20% 95%"),
    hsl("--muted-foreground", "ミュート前景", "0 0% 40%"),
    hsl("--accent", "アクセント", "55 100% 82%"),
    hsl("--accent-foreground", "アクセント前景", "13 25% 11%"),
    hsl("--destructive", "破壊的操作", "0 84% 60%"),
    hsl("--destructive-foreground", "破壊的操作の前景", "0 0% 98%"),
    hsl("--border", "境界線", "0 0% 90%"),
    hsl("--input", "入力欄の枠", "0 0% 90%"),
    hsl("--ring", "フォーカスリング", "13 25% 11%"),
    hsl("--chart-1", "グラフ 1", "12 76% 61%"),
    hsl("--chart-2", "グラフ 2", "173 58% 39%"),
    hsl("--chart-3", "グラフ 3", "197 37% 24%"),
    hsl("--chart-4", "グラフ 4", "43 74% 66%"),
    hsl("--chart-5", "グラフ 5", "27 87% 67%"),
  ],
};

/** アプリ固有のカラートークン（旧ハードコード hex の移行先） */
export const APP_COLOR_TOKEN_GROUPS: ColorTokenGroup[] = [
  {
    id: "brand",
    label: "ブランド",
    description:
      "ヒーロー・フッターのグラデーション、進捗バー、リンクなどに使う基幹色。見た目の印象を最も左右する。",
    tokens: [
      hex("--app-brand-primary", "プライマリ", "#ffea00"),
      hex("--app-brand-ink", "インク（リンク・強調文字）", "#736000", {
        note: "text-brand-ink。--primary はボタンの塗りも兼ねるため文字用途を分離している",
      }),
      hex("--app-brand-primary-strong", "プライマリ（濃）", "#b38f00", {
        note: "ページ遷移時のトップローダー",
      }),
      hex("--app-brand-deep", "ディープ", "#8a7300", {
        note: "カレンダーのアクセント、OG画像の見出し",
      }),
      hex("--app-brand-link-hover", "リンクホバー", "#6b5900"),
      hex("--app-brand-light", "ライト", "#ffea00", {
        note: "グラデーション開始色",
      }),
      hex("--app-brand-pale", "ペール", "#fffbe6", {
        note: "グラデーション終了色",
      }),
      hex("--app-brand-progress-end", "進捗バー終端", "#ffd400"),
      hex("--app-brand-surface", "サーフェス", "#fff8a3", {
        note: "進捗サークルの下地",
      }),
    ],
  },
  {
    id: "onboarding",
    label: "オンボーディング",
    description: "初回チュートリアルのモーダル背景グラデーション。",
    tokens: [
      hex("--app-onboarding-from", "グラデーション開始", "#ffea00"),
      hex("--app-onboarding-to", "グラデーション終了", "#fffbe6"),
    ],
  },
  {
    id: "map-common",
    label: "地図共通",
    description: "現在地マーカーやクラスタ表示など、地図機能で共通の色。",
    tokens: [
      hex("--app-map-location-stroke", "現在地マーカー枠", "#2563eb"),
      hex("--app-map-location-fill", "現在地マーカー塗り", "#60a5fa"),
      hex("--app-map-spider-leg", "クラスタ展開線", "#222222"),
    ],
  },
  {
    id: "spot-map",
    label: "スポットマップ",
    description:
      "スポットマップのピン色。未達成を目立たせ、達成済みは落ち着かせる。",
    tokens: [
      hex("--app-map-spot-todo", "未達成のスポット", "#ef4444"),
      hex("--app-map-spot-done", "達成済みのスポット", "#10b981"),
    ],
  },
  {
    id: "poster-status",
    label: "ポスター掲示板ステータス",
    description:
      "ポスターマップのピン色。ステータスの意味と結びついているため、区別しやすさを保つこと。",
    tokens: [
      hex("--app-poster-not-yet", "未貼付", "#6b7280"),
      hex("--app-poster-reserved", "予約済み", "#f59e0b"),
      hex("--app-poster-done", "完了", "#10b981"),
      hex("--app-poster-error", "エラー", "#ef4444"),
      hex("--app-poster-other", "その他", "#8b5cf6"),
    ],
  },
  {
    id: "posting-status",
    label: "ポスティングステータス",
    description:
      "ポスティングマップで描いたエリアの枠線と塗りつぶし。枠線が濃色、塗りが淡色。",
    tokens: [
      hex("--app-posting-planned", "計画中（枠）", "#3b82f6"),
      hex("--app-posting-planned-fill", "計画中（塗り）", "#93c5fd"),
      hex("--app-posting-completed", "完了（枠）", "#10b981"),
      hex("--app-posting-completed-fill", "完了（塗り）", "#6ee7b7"),
      hex("--app-posting-unavailable", "配布不可（枠）", "#ef4444"),
      hex("--app-posting-unavailable-fill", "配布不可（塗り）", "#fca5a5"),
      hex("--app-posting-other", "その他（枠）", "#8b5cf6"),
      hex("--app-posting-other-fill", "その他（塗り）", "#c4b5fd"),
    ],
  },
  {
    id: "density",
    label: "戸別ポスター密度",
    description: "市区町村ごとの件数を4段階で色分けする。",
    tokens: [
      hex("--app-density-low", "少（5件未満）", "#60a5fa"),
      hex("--app-density-mid", "中（20件未満）", "#34d399"),
      hex("--app-density-high", "多（100件未満）", "#fbbf24"),
      hex("--app-density-very-high", "非常に多（100件以上）", "#f87171"),
    ],
  },
  {
    id: "rank-scale",
    label: "都道府県ランキング配色",
    description:
      "順位に応じた9段階のグラデーション（1が最上位＝最も濃い）。連続的に変化するよう並べること。",
    tokens: [
      hex("--app-rank-scale-1", "1〜5位", "#08306b"),
      hex("--app-rank-scale-2", "6〜10位", "#08519c"),
      hex("--app-rank-scale-3", "11〜15位", "#2171b5"),
      hex("--app-rank-scale-4", "16〜20位", "#4292c6"),
      hex("--app-rank-scale-5", "21〜25位", "#6baed6"),
      hex("--app-rank-scale-6", "26〜30位", "#9ecae1"),
      hex("--app-rank-scale-7", "31〜35位", "#c6dbef"),
      hex("--app-rank-scale-8", "36〜40位", "#deebf7"),
      hex("--app-rank-scale-9", "41〜47位", "#f7fbff"),
      hex("--app-rank-no-data", "データなし", "#e5e7eb"),
    ],
  },
  {
    id: "prefecture-ui",
    label: "都道府県マップUI",
    description: "地図に重なるツールチップや凡例のテキスト色。",
    tokens: [
      hex("--app-prefecture-title", "見出し", "#1f2937"),
      hex("--app-prefecture-value", "数値", "#059669"),
      hex("--app-prefecture-muted", "補足テキスト", "#6b7280"),
      hex("--app-prefecture-label", "ラベル", "#374151"),
      hex("--app-prefecture-spinner-track", "スピナー軌道", "#e5e7eb"),
      hex("--app-prefecture-spinner-head", "スピナー先端", "#3b82f6"),
    ],
  },
  {
    id: "panel",
    label: "地図操作パネル",
    description:
      "ポスティングマップの操作パネル。インラインスタイルで書かれていた無彩色群。",
    tokens: [
      hex("--app-panel-text", "テキスト", "#333333"),
      hex("--app-panel-text-muted", "テキスト（弱）", "#666666"),
      hex("--app-panel-text-disabled", "テキスト（無効）", "#999999"),
      hex("--app-panel-divider", "区切り線", "#eeeeee"),
      hex("--app-panel-hover-bg", "ホバー背景", "#f3f4f6"),
      hex("--app-panel-active", "選択中", "#2563eb"),
    ],
  },
  {
    id: "print",
    label: "印刷",
    description: "ポスティングマップの印刷用スタイル。",
    tokens: [
      hex("--app-print-text", "本文", "#000000"),
      hex("--app-print-border", "枠線", "#cccccc"),
      hex("--app-print-label", "ラベル", "#333333"),
    ],
  },
  {
    id: "scrollbar",
    label: "スクロールバー",
    description: "ポスターマップのフィルタ内スクロールバー。",
    tokens: [
      hex("--app-scrollbar-track", "軌道", "#f1f1f1"),
      hex("--app-scrollbar-thumb", "つまみ", "#888888"),
      hex("--app-scrollbar-thumb-hover", "つまみ（ホバー）", "#555555"),
    ],
  },
  {
    id: "effects",
    label: "演出エフェクト",
    description:
      "canvas で描画される演出。JS から CSS 変数を読むため、反映にはリロードが必要な場合がある。",
    tokens: [hex("--app-fireworks-text", "花火テキスト", "#ffffff")],
  },
  {
    id: "palette-remap",
    label: "Tailwind パレットの写像",
    description:
      "コード中でブランドトークンを経由せず text-emerald-700 のように Tailwind パレットを直接指定した約180箇所のための色。元のティールと同じ相対輝度の金系に置き換えているため、既存のコントラスト比はほぼ保たれる。成功表示の green 系は意味を持つ色なので対象外。",
    tokens: [
      hex("--color-emerald-50", "emerald-50", "#fdfae8"),
      hex("--color-emerald-100", "emerald-100", "#faf2c5"),
      hex("--color-emerald-200", "emerald-200", "#f6e58e"),
      hex("--color-emerald-500", "emerald-500", "#c2a100"),
      hex("--color-emerald-600", "emerald-600", "#9c8200"),
      hex("--color-emerald-700", "emerald-700", "#7d6900"),
      hex("--color-emerald-800", "emerald-800", "#625100"),
      hex("--color-teal-50", "teal-50", "#fdfbec"),
      hex("--color-teal-200", "teal-200", "#f7e796"),
      hex("--color-teal-400", "teal-400", "#deb900"),
      hex("--color-teal-500", "teal-500", "#c3a300"),
      hex("--color-teal-600", "teal-600", "#9d8200"),
      hex("--color-teal-700", "teal-700", "#7d6900"),
      hex("--color-teal-800", "teal-800", "#645400"),
    ],
  },
  {
    id: "vendor",
    label: "外部サービスのブランド色",
    description:
      "Google / LINE のブランドガイドラインにより色の改変が認められていないため変更できない。定義元の一元化のためだけに変数化している。",
    tokens: [
      hex("--app-vendor-google-blue", "Google 青", "#4285f4", {
        locked: true,
      }),
      hex("--app-vendor-google-green", "Google 緑", "#34a853", {
        locked: true,
      }),
      hex("--app-vendor-google-yellow", "Google 黄", "#fbbc05", {
        locked: true,
      }),
      hex("--app-vendor-google-red", "Google 赤", "#ea4335", { locked: true }),
      hex("--app-vendor-google-border", "Google ボタン枠", "#747775", {
        locked: true,
      }),
      hex("--app-vendor-google-text", "Google ボタン文字", "#1f1f1f", {
        locked: true,
      }),
      hex("--app-vendor-line-green", "LINE 緑", "#00b900", { locked: true }),
      hex("--app-vendor-line-green-hover", "LINE 緑（ホバー）", "#00a000", {
        locked: true,
      }),
    ],
  },
];

/**
 * コードベースで実際に使われている Tailwind パレット色。
 * Tailwind v4 が `:root` に `--color-{name}-{shade}` として出力し、
 * `text-gray-500` などのユーティリティが `var()` 経由で参照する。
 * 既定値は Tailwind 側が持つためここには持たない（実行時に読む）。
 */
export const USED_TAILWIND_PALETTE: Record<string, string[]> = {
  gray: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"],
  // emerald / teal は「Tailwind パレットの写像」グループで管理しているため
  // ここには載せない（同じ変数のピッカーが2つ出るのを避ける）
  green: ["50", "200", "500", "600", "700", "800"],
  blue: ["50", "200", "500", "600", "700", "800"],
  red: ["50", "200", "400", "500", "600", "700", "800"],
  amber: ["50", "200", "500", "600", "700", "800"],
  yellow: ["50", "200", "300", "500", "900"],
  orange: ["400", "500"],
  purple: ["500"],
  neutral: ["950"],
};

/** `--color-gray-500` 形式の変数名を列挙する */
export function listTailwindPaletteVars(): string[] {
  return Object.entries(USED_TAILWIND_PALETTE).flatMap(([name, shades]) =>
    shades.map((shade) => `--color-${name}-${shade}`),
  );
}

/** アプリ固有トークンを平坦化したもの */
export const APP_COLOR_TOKENS: ColorToken[] = APP_COLOR_TOKEN_GROUPS.flatMap(
  (group) => group.tokens,
);

/** 変数名から既定値を引く */
export function getTokenDefault(cssVar: string): string | undefined {
  return [...APP_COLOR_TOKENS, ...SEMANTIC_TOKEN_GROUP.tokens].find(
    (token) => token.cssVar === cssVar,
  )?.defaultValue;
}

/**
 * 実行時に CSS 変数の現在値を読む（クライアント専用）。
 *
 * canvas 描画や Leaflet のオプションなど、CSS で色を指定できない箇所から使う。
 * `/dev` で色を上書きした場合もこの関数経由なら追従する。
 * サーバー側では `document` がないため fallback をそのまま返す。
 *
 * @param cssVar `--app-brand-primary` のような変数名
 * @param fallback 取得できなかった場合の値。省略時はカタログの既定値
 */
export function readTokenColor(cssVar: string, fallback?: string): string {
  const resolved = fallback ?? getTokenDefault(cssVar) ?? "#000000";

  if (typeof document === "undefined") {
    return resolved;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();

  return value || resolved;
}
