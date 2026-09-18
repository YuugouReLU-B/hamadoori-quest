/**
 * 画像アセットの差し替えカタログ。
 *
 * 派生元（アクションボード）から引き継いだ画像のうち、何を作り直す必要があるかを
 * デザイン担当に渡せる形で一覧化するための定義。
 *
 * ここは「意味」だけを持つ。実際にどのファイルが存在するかはファイルシステムを
 * 走査して突き合わせる（services/image-assets.ts）。カタログに載っていない画像は
 * 「未分類」として表示されるので、追加された画像を取りこぼさない。
 */

/** 差し替えの要否 */
export type ImageAssetStatus =
  | "replace" // 作り直しが必要。派生元のロゴ・世界観そのもの
  | "recolor" // 構図は流用できる。焼き込まれた色をブランドカラーに変える
  | "keep" // 差し替え不要。他社ロゴや汎用UIアイコン
  | "undecided"; // 次回MTGで判断

export const STATUS_LABEL: Record<ImageAssetStatus, string> = {
  replace: "要差し替え",
  recolor: "色の調整",
  keep: "そのまま",
  undecided: "MTGで判断",
};

/** 画面上のまとまり。表示順もこの順 */
export const ASSET_GROUPS = [
  { key: "brand", title: "ブランド", note: "ロゴ・ファビコン・OGP" },
  { key: "top", title: "トップページ", note: "ヒーローのイラスト" },
  {
    key: "onboarding",
    title: "オンボーディング",
    note: "アクション仙人と背景",
  },
  {
    key: "mission-icon",
    title: "クエストアイコン",
    note: "クエスト一覧・詳細に出るアイコン",
  },
  { key: "ui", title: "UI・その他", note: "共有ボタンや演出" },
] as const;

export type ImageAssetGroupKey = (typeof ASSET_GROUPS)[number]["key"];

export type ImageAssetEntry = {
  /** public/ からの絶対パス。src/app 配下のアイコンは特別扱いで別途注記する */
  path: string;
  /** 何の画像か */
  label: string;
  group: ImageAssetGroupKey;
  status: ImageAssetStatus;
  /** どこに出るか。実際に参照しているファイルではなく、人が見て分かる場所で書く */
  usedIn: string[];
  note?: string;
};

export const IMAGE_ASSETS: ImageAssetEntry[] = [
  // ── ブランド ──────────────────────────────────────────
  {
    path: "/img/logo.png",
    label: "ロゴ（浜通りクエスト）",
    group: "brand",
    status: "keep",
    usedIn: [
      "トップページのヒーロー",
      "ヘッダー",
      "フッター",
      "ログイン・新規登録・パスワード再設定",
      "オンボーディングの1枚目",
      "花火の演出",
    ],
    note: "浜通りクエストの円形エンブレム。背景は透過済み。ロゴ内に「浜通りクエスト」「歩いて、見つけて、集めよう！」の文字が入っているため、隣に同じ文字を置かないこと。ヘッダーの48pxでは文字が読めないので、小サイズ専用のマークは別途検討。",
  },
  {
    path: "/img/logo_shiro.png",
    label: "ロゴ（白抜き・旧）",
    group: "brand",
    status: "replace",
    usedIn: [],
    note: "HAMADORI CIRCLE PROJECT の白抜き版。参照はすべて logo.png に移したため未使用。濃色の上に置く用途が出たら白抜き版を作り直す。",
  },
  {
    path: "/img/footer_logo.webp",
    label: "ロゴ（フッター・旧）",
    group: "brand",
    status: "replace",
    usedIn: [],
    note: "logo.png に置き換えたため未使用。",
  },
  {
    path: "/img/ogp-default.png",
    label: "OGP画像（既定）",
    group: "brand",
    status: "replace",
    usedIn: ["SNSでURLを共有したときのサムネイル（全ページ共通）"],
    note: "1200×630。派生元のまま。X・LINEに貼ったときに最初に見られる画像なので優先度が高い。",
  },

  // ── トップページ ──────────────────────────────────────
  {
    path: "/img/hero.webp",
    label: "ヒーローの風景",
    group: "top",
    status: "keep",
    usedIn: ["トップページ（未ログイン）", "フッター上部"],
    note: "浜通りの海・国道・道の駅を描いた低ポリ調の1枚（1742×903）。object-cover で敷いているので、狭い画面では左右が切れる。人物も描き込まれているため人物レイヤーは廃止。",
  },
  {
    path: "/img/hero-background.svg",
    label: "街並みのイラスト（OGPの背景）",
    group: "brand",
    status: "keep",
    usedIn: ["クエスト詳細・達成報告のOGPを動的生成するときの背景"],
    note: "トップのヒーローは hero.webp に置き換わったが、OGPの背景として使っている。青緑 #30bca7 が72箇所に焼き込まれた派生元のイラスト。",
  },
  {
    path: "/img/hero-people.svg",
    label: "ヒーローの人物イラスト（旧）",
    group: "top",
    status: "replace",
    usedIn: [],
    note: "#30bca7 / #0f8472 / #bcecd3 が焼き込まれている。hero.webp に置き換えたため未使用。",
  },

  // ── オンボーディング ──────────────────────────────────
  {
    path: "/img/onboarding/character.svg",
    label: "アクション仙人",
    group: "onboarding",
    status: "replace",
    usedIn: ["オンボーディングの全ページ"],
    note: "羽織の「み」が派生元のマーク。パスとして描かれているので文字の置換では消せない。色より先にここを直す必要がある。",
  },
  {
    path: "/img/onboarding/welcome_master.svg",
    label: "アクション仙人（登場カット）",
    group: "onboarding",
    status: "replace",
    usedIn: ["オンボーディングの1枚目"],
  },
  {
    path: "/img/onboarding/background.svg",
    label: "オンボーディング背景",
    group: "onboarding",
    status: "recolor",
    usedIn: ["オンボーディングの2枚目以降"],
    note: "#64d8c6 → #bcecd3 のグラデーション。この画像がCSSのグラデーションを覆い隠しているため、配色を変えても反映されない。",
  },
  {
    path: "/img/onboarding/background-only.svg",
    label: "オンボーディング背景（1枚目用）",
    group: "onboarding",
    status: "recolor",
    usedIn: ["オンボーディングの1枚目"],
  },

  // ── UI・その他 ────────────────────────────────────────
  {
    path: "/img/mission_fallback.svg",
    label: "クエストアイコンの代替画像",
    group: "ui",
    status: "recolor",
    usedIn: ["アイコンが未設定のクエストカード"],
  },
  {
    path: "/img/level-up-particle.png",
    label: "レベルアップの粒子",
    group: "ui",
    status: "keep",
    usedIn: ["レベルアップのダイアログ"],
  },
  {
    path: "/img/icon-Shere2x.png",
    label: "共有アイコン",
    group: "ui",
    status: "keep",
    usedIn: ["クエスト詳細の共有ボタン"],
  },
  {
    path: "/img/icon-Copy2x.png",
    label: "URLコピーアイコン",
    group: "ui",
    status: "keep",
    usedIn: ["クエスト詳細の共有ボタン"],
  },
  {
    path: "/img/icon-X2x.png",
    label: "Xの共有アイコン",
    group: "ui",
    status: "keep",
    usedIn: ["クエスト詳細の共有ボタン"],
    note: "他社ロゴなので差し替え不可。",
  },
  {
    path: "/img/icon-line2x.png",
    label: "LINEの共有アイコン",
    group: "ui",
    status: "keep",
    usedIn: ["クエスト詳細の共有ボタン"],
    note: "他社ロゴなので差し替え不可。",
  },
  {
    path: "/img/icon-facebook2x.png",
    label: "Facebookの共有アイコン",
    group: "ui",
    status: "keep",
    usedIn: ["クエスト詳細の共有ボタン"],
    note: "他社ロゴなので差し替え不可。",
  },
  {
    path: "/img/x_logo.png",
    label: "Xのロゴ",
    group: "ui",
    status: "keep",
    usedIn: ["プロフィールのSNSバッジ"],
    note: "他社ロゴなので差し替え不可。",
  },
  {
    path: "/img/github-logo.png",
    label: "GitHubのロゴ",
    group: "ui",
    status: "keep",
    usedIn: ["プロフィールのSNSバッジ"],
    note: "他社ロゴなので差し替え不可。",
  },
];

/**
 * public/ の外にあるため一覧のサムネイルには出せないが、差し替えが必要なもの。
 *
 * Next.js の App Router は src/app 直下の icon.png / apple-icon.png / favicon.ico を
 * 自動でファビコンとして配信する。public/ 配下ではないので同じ扱いにできない。
 */
export const APP_ICON_ASSETS = [
  {
    file: "src/app/favicon.ico",
    label: "ファビコン",
    usedIn: "ブラウザのタブ・ブックマーク",
  },
  {
    file: "src/app/icon.png",
    label: "アイコン（PNG）",
    usedIn: "Androidのホーム画面・タブ",
  },
  {
    file: "src/app/apple-icon.png",
    label: "アイコン（Apple）",
    usedIn: "iOSのホーム画面に追加したとき",
  },
] as const;
