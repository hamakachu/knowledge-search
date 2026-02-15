# Groovy Knowledge Search 仕様書

## 1. アプリケーション概要

### 1.1 目的
Qiita Team の記事をセマンティック検索・キーワード検索できるナレッジ検索アプリケーション。

### 1.2 機能概要
- **対応ソース**: Qiita Team
- **検索方式**: キーワード検索・セマンティック検索（ベクトル検索）・ハイブリッド検索

### 1.3 技術スタック

| レイヤー | 技術 |
|---|---|
| 言語 | TypeScript 5.x |
| ランタイム | Node.js 20 LTS |
| パッケージマネージャー | pnpm 8.x（モノレポ） |
| フロントエンド | React 18 + Tailwind CSS 3.x + Vite 5.x |
| バックエンド | Express.js 4.x |
| データベース | PostgreSQL 16 + pgvector + pg_trgm |
| 外部API | Qiita Team API, Gemini API（エンベディング生成） |
| テスト | Vitest |

---

## 2. システム構成

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│    Backend      │────▶│   PostgreSQL    │
│  (React + Vite) │     │   (Express.js)  │     │   + pgvector    │
│     :5173       │     │     :3000       │     │     :5432       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        ▲
                                                        │
                        ┌─────────────────┐             │
                        │   sync-worker   │─────────────┘
                        │  (バッチ処理)    │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   Qiita Team    │
                        │      API        │
                        └─────────────────┘
```

### 2.1 パッケージ構成

| パッケージ | 役割 |
|---|---|
| `frontend/` | React UI（ログイン・検索画面） |
| `backend/` | Express API サーバー |
| `sync-worker/` | Qiita Team 記事同期バッチ |
| `database/` | PostgreSQL スキーマ・マイグレーション |

---

## 3. データベース仕様

### 3.1 テーブル構成

#### documents テーブル
```sql
CREATE TABLE documents (
  id VARCHAR(255) PRIMARY KEY,           -- ソース元ID
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT NOT NULL,
  author VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL,           -- 'qiita_team'
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE,
  embedding vector(768)                  -- pgvector 768次元ベクトル
);
```

**インデックス**:
- `idx_documents_title_trgm`: GINインデックス（全文検索用）
- `idx_documents_body_trgm`: GINインデックス（全文検索用）
- `idx_documents_embedding`: IVFFlatインデックス（ベクトル検索用）

#### users テーブル
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  encrypted_qiita_token TEXT NOT NULL,   -- AES-256-GCM暗号化
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### session テーブル
```sql
CREATE TABLE "session" (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
```

---

## 4. API 仕様

### 4.1 認証 API

#### POST /api/auth/login
ログイン/ユーザー登録

**リクエスト**:
```json
{
  "username": "string",
  "email": "string",
  "qiitaToken": "string"
}
```

**レスポンス** (200 OK):
```json
{
  "id": 1,
  "username": "string",
  "email": "string"
}
```

#### GET /api/auth/me
認証済みユーザー情報取得（要認証）

**レスポンス** (200 OK):
```json
{
  "id": 1,
  "username": "string",
  "email": "string"
}
```

#### POST /api/auth/logout
ログアウト

**レスポンス** (200 OK):
```json
{ "message": "Logged out" }
```

### 4.2 検索 API

#### GET /api/search
ドキュメント検索（要認証）

**クエリパラメータ**:
| パラメータ | 必須 | 説明 |
|---|---|---|
| `q` | ○ | 検索キーワード |
| `mode` | × | 検索モード（`hybrid` / `keyword` / `semantic`）デフォルト: `hybrid` |

**レスポンス** (200 OK):
```json
{
  "results": [
    {
      "id": "article123",
      "title": "記事タイトル",
      "url": "https://example.qiita.com/...",
      "author": "著者名",
      "updatedAt": "2026-01-15T10:30:00Z",
      "source": "qiita_team",
      "score": 0.85
    }
  ]
}
```

**エラーレスポンス**:
- `400 Bad Request`: 無効な mode パラメータ
- `401 Unauthorized`: 未認証

### 4.3 統計 API

#### GET /api/stats
ドキュメント統計情報（要認証）

**レスポンス** (200 OK):
```json
{
  "totalDocuments": 150,
  "lastSyncedAt": "2026-02-14T12:00:00Z"
}
```

### 4.4 ヘルスチェック

#### GET /health
サーバー稼働確認（認証不要）

**レスポンス** (200 OK):
```json
{ "status": "ok" }
```

---

## 5. 検索アルゴリズム

### 5.1 検索モード

| モード | 説明 |
|---|---|
| `hybrid` | セマンティック + キーワードの組み合わせ（デフォルト） |
| `keyword` | pg_trgm による全文検索のみ |
| `semantic` | pgvector によるベクトル検索のみ |

### 5.2 ハイブリッド検索の仕組み

1. **並列実行**: semanticSearch() と keywordSearch() を Promise.all で同時実行
2. **スコアリング**:
   - セマンティックのみにヒット: 0.6
   - キーワードのみにヒット: 0.4
   - 両方にヒット: 0.6 + 0.4 = 1.0
3. **重複排除**: ID ベースでマージ
4. **ソート**: スコア降順

### 5.3 セマンティック検索

- Gemini API でクエリを 768 次元ベクトルに変換
- pgvector のコサイン類似度演算子 (`<=>`) で近似最近傍探索
- スコア = 1 - コサイン距離

### 5.4 キーワード検索

- pg_trgm の `similarity()` 関数でタイトル・本文の類似度を計算
- `ILIKE` で部分一致検索
- スコア = similarity(title) + similarity(body)

---

## 6. フロントエンド仕様

### 6.1 ページ構成

| ページ | パス | 説明 |
|---|---|---|
| LoginPage | `/` | 未認証時に表示。ログインフォーム |
| SearchPage | `/` | 認証済み時に表示。検索画面 |

### 6.2 コンポーネント構成

```
App.tsx
├── AuthProvider (認証状態管理)
│   ├── LoginPage (未認証時)
│   │   └── LoginForm
│   └── SearchPage (認証済み時)
│       ├── UserMenu
│       ├── SearchBox
│       ├── SearchResults
│       └── DocumentStats
```

### 6.3 認証フロー

1. アプリ起動時に `GET /api/auth/me` で認証状態確認
2. 未認証の場合 → LoginPage 表示
3. ログイン成功 → SearchPage へ遷移
4. 401 エラー発生時 → 自動ログアウト → LoginPage へ遷移

---

## 7. sync-worker 仕様

### 7.1 同期処理フロー

1. Qiita Team API から記事一覧を取得
2. 各記事に対して:
   - Gemini API でエンベディング生成（768次元）
   - documents テーブルへ UPSERT
3. エンベディング生成失敗時も記事同期は継続（エラー耐性設計）

### 7.2 環境変数による制御

| 環境変数 | 説明 |
|---|---|
| `USE_MOCK_QIITA=true` | フィクスチャデータを使用 |
| `USE_MOCK_GEMINI=true` | モックエンベディングを使用 |

### 7.3 レート制限対策

- Gemini API: 4秒/リクエストの待機
- リトライ: 指数バックオフ（最大3回）

---

## 8. セキュリティ仕様

### 8.1 認証・セッション

- セッション管理: express-session + connect-pg-simple
- セッションストア: PostgreSQL session テーブル
- クッキー: HttpOnly, SameSite=Lax

### 8.2 トークン暗号化

- Qiita Token は AES-256-GCM で暗号化して保存
- 形式: `<IV>:<authTag>:<encryptedData>`（HEX文字列）

### 8.3 権限チェック

- 検索結果は permissionService でフィルタリング
- ユーザーがアクセス権を持つ記事のみ返却

---

## 9. 実装済み機能

| Phase | 機能 | 状態 |
|---|---|---|
| Phase 0 | pgvector 基盤構築 | ✅ |
| Phase 1 | Gemini API クライアント | ✅ |
| Phase 2 | 同期時エンベディング生成 | ✅ |
| Phase 3 | ハイブリッド検索ロジック | ✅ |
| Phase 4 | ルーティング統合 | ✅ |
| Phase 4 | 検索API mode パラメータ対応 | ✅ |
| Phase 5 | 既存API呼び出し修正 | ✅ |

---

## 10. 今後の実装候補

1. sync-worker トランザクション実装（一括 upsert）
2. Sync Worker cron 設定（日次自動同期）
3. 検索機能の E2E テスト
4. 検索拡張（フィルタリング、ソート、ページネーション）

---

## 11. 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# テスト実行
pnpm test

# 品質チェック
pnpm typecheck && pnpm lint

# ビルド
pnpm build

# Docker（PostgreSQL）起動
docker compose up -d

# Qiita Team 同期実行
cd sync-worker && pnpm sync
```

---

## 12. 環境変数

### 12.1 必須環境変数

| 変数名 | 説明 |
|---|---|
| `DATABASE_URL` | PostgreSQL接続文字列 |
| `QIITA_TEAM_TOKEN` | Qiita Team APIトークン |
| `QIITA_TEAM_NAME` | Qiita Teamチーム名 |
| `ENCRYPTION_KEY` | トークン暗号化キー（32バイト） |
| `SESSION_SECRET` | セッション署名シークレット |

### 12.2 オプション環境変数

| 変数名 | デフォルト | 説明 |
|---|---|---|
| `PORT` | 3000 | バックエンドポート |
| `NODE_ENV` | development | 実行環境 |
| `USE_MOCK_QIITA` | false | Qiita APIモック使用 |
| `USE_MOCK_GEMINI` | false | Gemini APIモック使用 |
| `GEMINI_API_KEY` | - | Gemini APIキー |

---

*最終更新: 2026-02-15*
