# 浜通りクエスト

福島県浜通り地域をめぐる「クエスト」に参加し、ポイントやランキングで楽しむ Web アプリです。
LINE でログインし、現地での位置情報チェックインや QR コード読み取り、友だち紹介などでポイントを獲得します。

## 本リポジトリについて

本リポジトリは [team-mirai-volunteer/action-board](https://github.com/team-mirai-volunteer/action-board) から派生した独立プロジェクトです。

- **ライセンス**: 派生元と同じ [GNU Affero General Public License v3.0](./LICENSE)（AGPL-3.0）
- **派生元**: team-mirai-volunteer/action-board — Copyright (c) チームみらい およびコントリビューターの皆さま
- **派生時点**: commit [`8f5cd6c0`](https://github.com/team-mirai-volunteer/action-board/commit/8f5cd6c022d877b872969f9ec5eba674ca72a19d)（2026-08-08）
- 本リポジトリでの変更点は、派生時点以降のコミット履歴（`git log 8f5cd6c0..`）をご参照ください。

AGPL-3.0 第13条に基づき、本ソフトウェアの改変版をネットワーク経由で提供する場合は、利用者に対して改変版の完全なソースコードを提供する必要があります。

### 派生元の名称・ロゴ・コンテンツについて

AGPL-3.0 が許諾するのはソースコードの利用であり、商標権は含まれません（AGPL-3.0 第7条）。
「チームみらい」の名称・ロゴ・アイコン類・ミッションコンテンツ等は派生元に帰属するものであり、
本リポジトリを利用したサービスを公開する際は、これらを自身のものへ差し替える必要があります。

---

## 主な機能

| 機能 | 概要 | 主な場所 |
|---|---|---|
| クエスト | 位置情報チェックイン・LINE友だち追加・紹介などのクエストを達成してポイント獲得 | `/`、`/missions/[slug]` |
| QRスポット | 現地の QR コードを読み取ってクエストを達成 | `/scan`、`/q/[code]`、`/map` |
| ランキング・シーズン | 期間別ランキング、シーズンごとの成績 | `/ranking`、`/seasons/[slug]/...` |
| 抽選 | 一定ポイント到達で抽選に応募 | `/admin/lottery` で設定 |
| 管理画面 | クエスト編集・CSV取込・ユーザー/ポイント管理・アクセス分析 | `/admin` |

## 技術スタック

- Next.js 16（App Router）/ React 19 / TypeScript（strict）
- Supabase（PostgreSQL・Auth・Storage）
- Tailwind CSS / shadcn/ui
- Biome（lint・format）/ Jest / Playwright
- ホスティング: Vercel（手動デプロイ）

コードの構成方針は [アーキテクチャガイドライン](docs/nextjs_architecture_guidelines.md)、
DB・認証などの全体像は [プロジェクト概要](docs/プロジェクト概要.md) を参照してください。

## 必要な環境

- Node.js 20.9 以上（22 推奨）
- pnpm 9（`corepack enable` で `package.json` の `packageManager` に合わせて使えます）
- Docker
- Supabase CLI（`brew install supabase/tap/supabase`）

## ローカル開発

1. 依存パッケージをインストール

   ```bash
   pnpm install
   ```

2. Supabase のローカル環境を起動

   ```bash
   supabase start
   ```

   - Studio: http://127.0.0.1:54323
   - メール確認（Inbucket）: http://127.0.0.1:54324

3. 環境変数ファイルを作成

   ```bash
   cp .env.example .env
   ```

   `supabase start` の出力にあるキーを `.env` に設定します。

   ```
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key>
   SUPABASE_SERVICE_ROLE_KEY=<Secret key>
   ```

   LINE ログインを試す場合は、LINE Developers で作成したチャネルの値を
   `NEXT_PUBLIC_LINE_CLIENT_ID` / `LINE_CLIENT_SECRET` に設定してください。
   その他の項目は `.env.example` のコメントを参照してください（未設定でも起動はします）。

4. データベースを初期化

   ```bash
   pnpm run db:reset
   ```

   マイグレーション適用・`supabase/seed.sql` の投入・型定義の生成・クエストの種データ投入（`mission:sync`）をまとめて行います。

5. 開発サーバーを起動

   ```bash
   pnpm run dev
   ```

   http://localhost:3000 で開けます。終わったら `supabase stop` で停止してください。

### ログインと管理者権限

本番のログイン手段は LINE ログインのみです。
ローカルの seed には、Supabase のメール+パスワードで作られた管理者ユーザー
（`admin@example.com` / `admin123456`）が含まれており、E2E テストはこの方式でセッションを作っています。

既存ユーザーを管理者にするには、Supabase Studio で次の SQL を実行します。

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"roles": ["admin"]}'::jsonb
WHERE id = '<対象ユーザーのID>';
```

## データの管理

| データ | 正となる場所 | 反映方法 |
|---|---|---|
| クエスト（`missions`） | **DB**（管理画面 `/admin` で編集） | `mission_data/missions.yaml` は新環境用の種データ。`pnpm run mission:sync` は既存クエストを上書きしない |
| カテゴリ・紐付け・クイズ | `mission_data/*.yaml` | `pnpm run mission:sync` |
| シーズン | `season_data/seasons.yaml` | `main` への push 時に `season:sync` で自動同期 |

DB スキーマの変更は `supabase/migrations/` にマイグレーションを追加して行います。

```bash
npx supabase migration new <name>   # 空のマイグレーションを作成
pnpm run db:migrate                 # ローカルに適用して型定義を再生成
```

詳しくは [開発ワークフロー](docs/開発ワークフロー.md) を参照してください。

## テスト

```bash
pnpm run test:unit          # ユニットテスト（Jest）
pnpm run test:supabase      # RLS・DB関数のテスト（ローカル Supabase が必要）
pnpm run test:integration   # 統合テスト（ローカル Supabase が必要）
pnpm run test:e2e           # E2Eテスト（Playwright）
```

push 前には `pnpm run biome:check:write` / `pnpm run typecheck` / `pnpm run test:unit` を通してください。
テストの書き方は [テストガイドライン](docs/20260210_1000_テストガイドライン.md) を参照してください。

## ブランチとデプロイ

- 作業ブランチは `develop` から切り、`develop` へ PR を出します。
- `develop` → `main` のマージで GitHub Actions（`.github/workflows/deploy.yml`）が動き、
  本番 Supabase へのマイグレーション適用とシーズン同期を行います。
- Vercel へのデプロイは手動です（`vercel.json` で Git 連携を無効化）。
  手順は [本番デプロイ手順メモ](docs/20260913_1618_本番デプロイ手順メモ.md) を参照してください。

コマンドの一覧は [開発コマンドリファレンス](docs/開発コマンドリファレンス.md) にあります。
