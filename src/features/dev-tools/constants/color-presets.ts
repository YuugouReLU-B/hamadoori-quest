import {
  APP_COLOR_TOKEN_GROUPS,
  SEMANTIC_TOKEN_GROUP,
} from "@/lib/design/color-tokens";
import { hslTripletToHex } from "../utils/color-format";

/**
 * `/dev` のデザイン差し替えで一括適用するカラープリセット。
 *
 * 値は全て hex で持ち、適用時にトークンの format（hex / hsl-triplet）へ
 * 変換する。手で HSL を計算しないことで定義ミスを避ける。
 *
 * ## 対象範囲
 * ブランド色とセマンティックトークンだけを差し替える。
 * 地図のステータス色・戸別ポスター密度・都道府県ランキング配色は
 * 「色そのものが意味を持つ」ため、プリセットでは触らない。
 * 外部サービスのブランド色も同様に対象外（そもそもロックされている）。
 */

export interface ColorPreset {
  id: string;
  label: string;
  description: string;
  /** 出典サイト */
  source?: { label: string; url: string };
  /** UI に並べる代表色（左から順に表示） */
  swatches: string[];
  /** CSS 変数名 -> hex 値 */
  values: Record<string, string>;
  /**
   * WCAG AA（4.5:1）を満たさないと分かっている組み合わせ。
   * テストはここに載っているペアだけ基準を緩め、記録値より悪化したら失敗する。
   * 新しく作るプリセットでは空にすること。
   */
  knownContrastIssues?: Array<{ pair: string; ratio: number; reason: string }>;
}

/** プリセットが触ってよいトークンかどうか */
const PRESET_TARGET_GROUP_IDS = new Set([
  "brand",
  "onboarding",
  "palette-remap",
]);

/**
 * セマンティックトークンのうちプリセットで扱わないもの。
 * 破壊的操作の赤とグラフの系列色は、色自体が意味を持つため据え置く。
 */
const SEMANTIC_PRESET_EXCLUDED = new Set([
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
]);

/**
 * カタログの既定値から「元の配色」プリセットを組み立てる。
 * ハードコードせず生成することで globals.css との乖離を防ぐ。
 */
function buildDefaultPreset(): ColorPreset {
  const values: Record<string, string> = {};

  for (const group of APP_COLOR_TOKEN_GROUPS) {
    if (!PRESET_TARGET_GROUP_IDS.has(group.id)) continue;
    for (const token of group.tokens) {
      values[token.cssVar] = token.defaultValue;
    }
  }

  // セマンティックトークンの既定値は hsl-triplet。
  // ここで hex に直して持つことで、globals.css を唯一の定義元に保つ。
  for (const token of SEMANTIC_TOKEN_GROUP.tokens) {
    if (SEMANTIC_PRESET_EXCLUDED.has(token.cssVar)) continue;

    const hex = hslTripletToHex(token.defaultValue);
    if (hex) values[token.cssVar] = hex;
  }

  return {
    id: "default",
    label: "既定（黄色・白基調）",
    description:
      "浜通りサークル由来の黄色を主役にし、大面積を白へ振り替えた配色。globals.css に書かれている値そのもので、リロード直後の状態。",
    swatches: ["#ffea00", "#fffbe6", "#fbfaf6", "#ffffff", "#231815"],
    values,
  };
}

/** カタログに載っているパレット写像（金系）の既定値 */
function goldPaletteValues(): Record<string, string> {
  const group = APP_COLOR_TOKEN_GROUPS.find(
    (item) => item.id === "palette-remap",
  );
  return Object.fromEntries(
    (group?.tokens ?? []).map((token) => [token.cssVar, token.defaultValue]),
  );
}

/**
 * 浜通りサークルの配色をそのまま再現した版。
 *
 * 実サイトを描画して計測した値（body 背景 #ffea00 / カード #ffffff /
 * 本文 #231815 / 淡黄 #fff8a3）をそのまま使う。既定はこれを白基調へ
 * 寄せたものなので、こちらは「元サイトに忠実な、黄色が支配的な版」。
 *
 * 実サイトの補足色 #777777 は黄背景で 3.63:1 と AA 未達のため #666666 に、
 * 黄色に載る文字は #231815 に置き換えている。
 */
const HAMADOORI_CIRCLE_VIVID_PRESET: ColorPreset = {
  id: "hamadoori-circle-vivid",
  label: "浜通りサークル（黄色ベタ）",
  description:
    "ページ背景まで #ffea00 にした、元サイトに忠実な版。カードの少ないページは黄色一色になる。",
  source: {
    label: "hamadoori-circle.com",
    url: "https://hamadoori-circle.com/",
  },
  swatches: ["#ffea00", "#fff8a3", "#ffffff", "#231815", "#666666"],
  values: {
    ...goldPaletteValues(),

    // --- ブランド ---
    "--app-brand-primary": "#ffea00",
    "--app-brand-ink": "#736000",
    "--app-brand-primary-strong": "#b38f00",
    "--app-brand-deep": "#8a7300",
    "--app-brand-link-hover": "#6b5900",
    "--app-brand-light": "#ffea00",
    "--app-brand-pale": "#fff8a3",
    "--app-brand-progress-end": "#ffd400",
    "--app-brand-surface": "#fff8a3",

    // --- オンボーディング ---
    "--app-onboarding-from": "#ffea00",
    "--app-onboarding-to": "#fff8a3",

    // --- セマンティック ---
    "--background": "#ffea00",
    "--foreground": "#231815",
    "--card": "#ffffff",
    "--card-foreground": "#231815",
    "--popover": "#ffffff",
    "--popover-foreground": "#231815",
    "--primary": "#ffea00",
    "--primary-foreground": "#231815",
    "--secondary": "#f9f9f9",
    "--secondary-foreground": "#231815",
    "--muted": "#f9f9f9",
    "--muted-foreground": "#666666",
    "--accent": "#fff8a3",
    "--accent-foreground": "#231815",
    "--ring": "#231815",
  },
};

/**
 * 派生元 team-mirai-volunteer/action-board のティール配色。
 *
 * 黄色へ切り替える前の状態を復元できるように残している。
 * Tailwind パレットの emerald / teal も元の緑に戻す。
 *
 * この配色は WCAG AA を満たさない組み合わせを3つ含む。派生元から
 * 引き継いだ状態をそのまま保存する目的なので、値は変更していない。
 */
const TEAM_MIRAI_PRESET: ColorPreset = {
  id: "team-mirai",
  label: "派生元（ティール）",
  description:
    "team-mirai-volunteer/action-board から引き継いだ元の配色。黄色へ切り替える前の状態を確認したいときに使う。",
  swatches: ["#30baa7", "#64d8c6", "#bcecd3", "#f6f3ef", "#ffffff"],
  values: {
    // Tailwind パレットを元の緑系へ戻す
    "--color-emerald-50": "#ecfdf5",
    "--color-emerald-100": "#d0fae5",
    "--color-emerald-200": "#a4f4cf",
    "--color-emerald-500": "#00bb7f",
    "--color-emerald-600": "#009767",
    "--color-emerald-700": "#007956",
    "--color-emerald-800": "#005f46",
    "--color-teal-50": "#f0fdfa",
    "--color-teal-200": "#96f7e4",
    "--color-teal-400": "#00d3bd",
    "--color-teal-500": "#00baa7",
    "--color-teal-600": "#009588",
    "--color-teal-700": "#00776e",
    "--color-teal-800": "#005f5a",

    // --- ブランド ---
    "--app-brand-primary": "#30baa7",
    "--app-brand-ink": "#2aa88f",
    "--app-brand-primary-strong": "#2aa693",
    "--app-brand-deep": "#0d9488",
    "--app-brand-link-hover": "#0d6b5e",
    "--app-brand-light": "#64d8c6",
    "--app-brand-pale": "#bcecd3",
    "--app-brand-progress-end": "#47c991",
    "--app-brand-surface": "#e2f6f3",

    // --- オンボーディング ---
    "--app-onboarding-from": "#a8e6cf",
    "--app-onboarding-to": "#7fcdcd",

    // --- セマンティック ---
    "--background": "#f6f3ef",
    "--foreground": "#0a0a0a",
    "--card": "#ffffff",
    "--card-foreground": "#0a0a0a",
    "--popover": "#ffffff",
    "--popover-foreground": "#0a0a0a",
    "--primary": "#2ba68e",
    "--primary-foreground": "#fafafa",
    "--secondary": "#f5f5f5",
    "--secondary-foreground": "#171717",
    "--muted": "#f5f5f5",
    "--muted-foreground": "#737373",
    "--accent": "#f5f5f5",
    "--accent-foreground": "#171717",
    "--ring": "#a1a1a1",
  },
  knownContrastIssues: [
    {
      pair: "プライマリ前景 / プライマリ",
      ratio: 2.89,
      reason: "ティールのボタン上のほぼ白い文字。派生元から引き継いだ状態。",
    },
    {
      pair: "ミュート前景 / ミュート",
      ratio: 4.34,
      reason: "補足テキスト。AA まで 0.16 足りない。派生元から引き継いだ状態。",
    },
    {
      pair: "ミュート前景 / 背景",
      ratio: 4.28,
      reason: "ページ背景に直接載る補足テキスト。派生元から引き継いだ状態。",
    },
    {
      pair: "インク / 背景",
      ratio: 2.67,
      reason: "ティールのリンク文字。派生元から引き継いだ状態。",
    },
    {
      pair: "インク / カード",
      ratio: 2.95,
      reason: "同上。カード内のリンク文字。",
    },
  ],
};

export const COLOR_PRESETS: ColorPreset[] = [
  buildDefaultPreset(),
  HAMADOORI_CIRCLE_VIVID_PRESET,
  TEAM_MIRAI_PRESET,
];

/**
 * 可読性を検証すべき「前景 / 背景」の組み合わせ。
 * テストがこの全ペアで WCAG AA（4.5:1）を満たすか確認する。
 */
export const CONTRAST_PAIRS: Array<{
  label: string;
  foreground: string;
  background: string;
}> = [
  {
    label: "本文 / 背景",
    foreground: "--foreground",
    background: "--background",
  },
  {
    label: "カード本文 / カード",
    foreground: "--card-foreground",
    background: "--card",
  },
  {
    label: "ポップオーバー本文 / ポップオーバー",
    foreground: "--popover-foreground",
    background: "--popover",
  },
  {
    label: "プライマリ前景 / プライマリ",
    foreground: "--primary-foreground",
    background: "--primary",
  },
  {
    label: "セカンダリ前景 / セカンダリ",
    foreground: "--secondary-foreground",
    background: "--secondary",
  },
  {
    label: "ミュート前景 / ミュート",
    foreground: "--muted-foreground",
    background: "--muted",
  },
  {
    label: "アクセント前景 / アクセント",
    foreground: "--accent-foreground",
    background: "--accent",
  },
  // 補足テキストは薄いミュート面だけでなくページ背景に直接載る箇所がある
  // （区切り線の「または」やフッターの著作権表示など）
  {
    label: "ミュート前景 / 背景",
    foreground: "--muted-foreground",
    background: "--background",
  },
  {
    label: "ミュート前景 / カード",
    foreground: "--muted-foreground",
    background: "--card",
  },
  // インクはリンクや強調文字として背景・カードの上に直接載る
  {
    label: "インク / 背景",
    foreground: "--app-brand-ink",
    background: "--background",
  },
  {
    label: "インク / カード",
    foreground: "--app-brand-ink",
    background: "--card",
  },
];

/** プリセットが指定しうる全 CSS 変数（カタログ側の存在確認に使う） */
export function listPresetTargetVars(): string[] {
  const appVars = APP_COLOR_TOKEN_GROUPS.filter((group) =>
    PRESET_TARGET_GROUP_IDS.has(group.id),
  ).flatMap((group) => group.tokens.map((token) => token.cssVar));

  const semanticVars = SEMANTIC_TOKEN_GROUP.tokens
    .map((token) => token.cssVar)
    .filter((cssVar) => !SEMANTIC_PRESET_EXCLUDED.has(cssVar));

  return [...appVars, ...semanticVars];
}
