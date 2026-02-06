# Knowledge Search

社内ドキュメント(Qiita Team / Google Drive / OneDrive)を横断検索できるアプリケーション

## 概要

社内に分散しているドキュメントを一元的に検索できるシステム。
MVP段階では **Qiita Team** のみに対応

## 主な機能

- Qiita Team 記事の横断検索
- キーワード検索(全文検索)
- 検索結果表示(タイトル、更新日、作成者、元URL)
- 日次自動データ同期

## システム構成

```
knowledge-search/          # pnpm workspace (monorepo)
├── backend/                      # Express.js API サーバー (TypeScript)
├── frontend/                     # React + Vite UI (TypeScript)
├── sync-worker/                  # Qiita Team データ同期バッチ (TypeScript)
├── database/                     # PostgreSQL マイグレーション・スキーマ
├── docker-compose.yml            # ローカル開発環境
├── pnpm-workspace.yaml           # pnpm workspace 設定
├── package.json                  # ルート package.json
└── tsconfig.base.json            # 共通 TypeScript 設定
```

## 技術スタック

### 共通
- **言語**: TypeScript 5.x (全モジュール共通)
- **ランタイム**: Node.js 20 LTS
- **パッケージマネージャー**: pnpm 8.x
- **ビルドツール**: Vite 5.x
- **Linter/Formatter**: ESLint + Prettier
- **テストフレームワーク**: Vitest

### Frontend
- React 18 + TypeScript
- Vite 5.x
- Tailwind CSS 3.x

### Backend
- Express.js 4.x + TypeScript
- Vite (Node.js ビルド用)
- PostgreSQL クライアント (pg)

### Database
- PostgreSQL 15+
- pg_bigm (日本語全文検索拡張)

## セットアップ

### 前提条件

- Node.js 20+ インストール済み
- pnpm 8+ インストール済み (`npm install -g pnpm`)
- Docker & Docker Compose インストール済み
- Qiita Team Personal Access Token 取得済み

### 1. リポジトリクローン

```bash
cd groovy-knowledge-search
```

### 2. 環境変数設定

#### 2-1. 環境変数ファイルのコピー

各サブプロジェクトの `.env.example` をコピーして `.env` ファイルを作成します。

```bash
# ルートディレクトリで
cp .env.example .env

# 各サブプロジェクトで
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp sync-worker/.env.example sync-worker/.env
```

#### 2-2. Qiita Team Personal Access Token の取得

Qiita Team連携機能を使用する場合、Personal Access Tokenが必要です。

**取得手順:**

1. Qiita Teamにログインします
2. https://qiita.com/settings/tokens にアクセス
3. 「新しいトークンを発行する」ボタンをクリック
4. トークンの説明を入力（例: `knowledge-search`）
5. スコープで **`read_qiita`** を選択
6. 「発行する」ボタンをクリック
7. 表示されたトークンをコピー（⚠️ この画面を閉じると二度と表示されません）

**設定方法:**

取得したトークンを以下のファイルに設定します:

```bash
# .env
QIITA_TEAM_TOKEN=qiita_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# sync-worker/.env
QIITA_TEAM_TOKEN=qiita_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 2-3. Qiita Team名の設定

あなたの組織のQiita Team名を設定します。

例: 組織のURLが `https://your-company.qiita.com` の場合

```bash
# .env
QIITA_TEAM_NAME=your-company

# sync-worker/.env
QIITA_TEAM_NAME=your-company
```

#### 2-4. 環境変数一覧

| 変数名 | 説明 | 設定例 | 必須 |
|--------|------|--------|------|
| `DATABASE_URL` | PostgreSQL接続URL | `postgresql://postgres:postgres@localhost:5432/knowledge_search` | ✅ |
| `PORT` | Backend APIポート番号 | `3000` | ✅ |
| `NODE_ENV` | 実行環境 | `development` / `production` | ✅ |
| `QIITA_TEAM_TOKEN` | Qiita Team APIトークン | `qiita_xxxxx...` | ✅ |
| `QIITA_TEAM_NAME` | Qiita Team組織名 | `your-company` | ✅ |
| `CORS_ORIGIN` | CORS許可オリジン | `http://localhost:5173` | ✅ |
| `VITE_API_URL` | Frontend→Backend接続先 | `http://localhost:3000` | ✅ |
| `SYNC_CRON_SCHEDULE` | 同期スケジュール（cron形式） | `0 2 * * *`（毎日午前2時） | ❌ |

#### 2-5. セキュリティに関する重要な注意点

⚠️ **`.env` ファイルは絶対にGitにコミットしないでください**

- `.env` ファイルには機密情報（APIトークン、データベースパスワード等）が含まれます
- このプロジェクトでは `.gitignore` に `.env` が含まれており、自動的に除外されます
- `.env.example` は設定例として管理されており、実際の値は含まれていません

**チーム開発時の推奨運用:**

1. `.env.example` をバージョン管理に含める（実際の値は含めない）
2. 各開発者が `.env.example` をコピーして `.env` を作成
3. 実際の値は社内のセキュアな場所（1Password、AWS Secrets Manager等）で共有
4. 本番環境では環境変数を直接設定（`.env` ファイルを使わない）

#### 2-6. トラブルシューティング

**Q. Qiita Team APIトークンが正しく設定されているか確認したい**

```bash
# sync-worker/.envの内容を確認
cat sync-worker/.env | grep QIITA_TEAM_TOKEN
```

**Q. データベース接続URLが間違っている可能性がある**

```bash
# PostgreSQLが起動しているか確認
docker-compose ps

# 接続テスト
psql postgresql://postgres:postgres@localhost:5432/knowledge_search -c "SELECT 1"
```

**Q. 環境変数が読み込まれない**

- `.env` ファイルがルートディレクトリではなく、各サブプロジェクトのディレクトリにあるか確認
- ファイル名が `.env`（先頭にドット）になっているか確認
- アプリケーションを再起動

### 3. 依存関係インストール

```bash
# ルートディレクトリで一括インストール (monorepo構成)
pnpm install
```

### 4. データベース起動

```bash
docker-compose up -d postgres
```

### 5. データベースマイグレーション

```bash
# Dockerコンテナ経由で実行
docker exec -i knowledge-search-db psql -U postgres -d knowledge_search < database/schema.sql
```

### 6. 初回データ同期

```bash
# ルートディレクトリから実行
pnpm --filter sync-worker sync
```

**注意:** 初回データ同期を実行する前に、必ず `QIITA_TEAM_TOKEN` と `QIITA_TEAM_NAME` を設定してください。

### 7. アプリケーション起動

```bash
# すべて同時起動 (ルートディレクトリから)
pnpm dev

# または個別起動
# Backend (ターミナル1)
pnpm --filter backend dev

# Frontend (ターミナル2)
pnpm --filter frontend dev
```

ブラウザで http://localhost:5173 にアクセス

## 開発ステータス

### Phase 1: 基盤構築 ⏳
- [ ] リポジトリ・プロジェクト構成
- [ ] pnpm workspace 設定
- [ ] TypeScript 共通設定 (tsconfig.base.json)
- [ ] ESLint + Prettier 設定
- [ ] PostgreSQL セットアップ (Docker Compose)
- [ ] Backend API 雛形 (TypeScript + Vite)
- [ ] Frontend 雛形 (React + TypeScript + Vite)

### Phase 2: Qiita Team 連携
- [ ] Qiita Team API 疎通確認
- [ ] Sync Worker 実装
- [ ] DB upsert 処理
- [ ] 初回データ投入

### Phase 3: 検索機能
- [ ] PostgreSQL FTS セットアップ
- [ ] 検索 API 実装
- [ ] 検索結果 JSON 整形
- [ ] API 動作テスト

### Phase 4: UI実装
- [ ] 検索ボックスコンポーネント
- [ ] 検索結果リストコンポーネント
- [ ] API連携処理
- [ ] 基本スタイリング

### Phase 5: 統合・デプロイ
- [ ] 結合テスト
- [ ] 本番環境セットアップ
- [ ] Sync Worker cron 設定
- [ ] 初回リリース

## MVP完成の定義

- Qiita Team の記事が検索できる
- キーワードでマッチした記事が表示される
- 元記事へのリンクが機能する
- 日次で自動的にデータが更新される
- 社内ネットワークからアクセス可能

## Next Steps (Phase 2以降)

- Google Drive 連携
- OneDrive 連携
- ユーザー認証・権限制御
- 検索精度改善
- セマンティック検索(RAG)の検証

## ライセンス

Internal Use Only
