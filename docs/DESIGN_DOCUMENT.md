# Groovy Knowledge Search - システム設計書

## 1. システム概要

### 1.1 目的

社内ナレッジ（Qiita Team記事）を統合的に検索できるWebアプリケーション。
セマンティック検索（意味検索）とキーワード検索を組み合わせたハイブリッド検索により、
関連性の高い記事を効率的に発見できる。

### 1.2 主要機能

| 機能 | 説明 |
|------|------|
| ハイブリッド検索 | セマンティック検索 + キーワード検索の組み合わせ |
| 権限ベースフィルタリング | ユーザーのQiita Team権限に基づく検索結果のフィルタリング |
| 自動同期 | Qiita Team記事の日次自動同期（cron） |
| ベクトル検索 | AI（Gemini API）によるテキストのベクトル化と類似度検索 |

---

## 2. システムアーキテクチャ

### 2.1 全体構成図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Groovy Knowledge Search                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │     Frontend     │    │     Backend      │    │   Sync Worker    │       │
│  │   (React + TS)   │◄──►│  (Express + TS)  │    │   (Node.js)      │       │
│  │   Port: 5173     │    │   Port: 3000     │    │   cron: 毎日2時  │       │
│  └──────────────────┘    └────────┬─────────┘    └────────┬─────────┘       │
│           │                       │                       │                  │
│           │                       │                       │                  │
│           │              ┌────────▼─────────┐             │                  │
│           │              │    PostgreSQL    │◄────────────┘                  │
│           │              │  (pgvector拡張)  │                                │
│           │              │   Port: 5432     │                                │
│           │              └──────────────────┘                                │
│           │                                                                  │
└───────────┼──────────────────────────────────────────────────────────────────┘
            │
            │ 外部サービス連携
            ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           External Services                                    │
│                                                                                │
│  ┌─────────────────────────┐         ┌─────────────────────────┐             │
│  │      Qiita Team API     │         │    Google Gemini API    │             │
│  │  ・記事取得（同期用）    │         │  ・テキスト→ベクトル変換 │             │
│  │  ・権限確認（検索時）    │         │  ・768次元ベクトル生成   │             │
│  └─────────────────────────┘         └─────────────────────────┘             │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| フロントエンド | React + TypeScript + Tailwind CSS | React 18, TS 5.x |
| バックエンド | Express.js + TypeScript | Express 4.x, TS 5.x |
| データベース | PostgreSQL + pgvector | PostgreSQL 16 |
| ランタイム | Node.js | 20 LTS |
| パッケージ管理 | pnpm | 8.x |
| コンテナ | Docker Compose | - |

---

## 3. 外部サービス連携と必要権限

### 3.1 Qiita Team API

#### 3.1.1 概要

| 項目 | 内容 |
|------|------|
| サービス名 | Qiita Team |
| API Base URL | `https://qiita.com/api/v2` |
| 認証方式 | Bearer Token (Personal Access Token) |
| トークン形式 | `qiita_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (41文字) |

#### 3.1.2 必要な権限（スコープ）

| 権限名 | 必須/任意 | 用途 |
|--------|---------|------|
| **read_qiita** | **必須** | 記事の読み取り、記事一覧の取得 |
| write_qiita | 不要 | 本システムでは記事の書き込みは行わない |

#### 3.1.3 使用するAPIエンドポイント

| エンドポイント | メソッド | 用途 | 呼び出し元 |
|---------------|---------|------|-----------|
| `GET /items` | GET | 記事一覧の取得（同期用） | Sync Worker |
| `GET /items/{id}` | GET | 記事詳細の取得（権限確認用） | Backend |

#### 3.1.4 トークン取得方法

1. Qiita Team にログイン
2. 設定 → アプリケーション → 「個人用アクセストークン」
3. 「新しいトークンを発行する」をクリック
4. スコープ「read_qiita」にチェック
5. 発行されたトークンを安全に保管

**トークン取得URL**: https://qiita.com/settings/tokens

---

### 3.2 Google Gemini API

#### 3.2.1 概要

| 項目 | 内容 |
|------|------|
| サービス名 | Google Gemini API (Generative AI) |
| 用途 | テキストのベクトル化（Embedding生成） |
| モデル名 | `text-embedding-004` |
| 出力次元 | 768次元ベクトル |

#### 3.2.2 必要な権限

| 権限/API | 必須/任意 | 用途 |
|---------|---------|------|
| **Generative Language API** | **必須** | Embedding生成 |

#### 3.2.3 APIキー取得方法

1. Google Cloud Console にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「ライブラリ」
4. 「Generative Language API」を検索して有効化
5. 「認証情報」→「認証情報を作成」→「APIキー」
6. 発行されたAPIキーを安全に保管

**Google Cloud Console**: https://console.cloud.google.com/

#### 3.2.4 料金について

| 項目 | 内容 |
|------|------|
| 無料枠 | 月間60クエリ/分 (RPM) |
| 課金体系 | 従量課金（入力トークン数に基づく） |
| 参考URL | https://ai.google.dev/pricing |

---

## 4. セキュリティ設計

### 4.1 認証・セッション管理

#### 4.1.1 認証フロー

```
┌─────────────┐     POST /api/auth/login      ┌─────────────┐
│  Frontend   │ ─────────────────────────────► │   Backend   │
│  (ブラウザ)  │     username, email,          │  (Express)  │
└─────────────┘     qiitaToken                 └──────┬──────┘
                                                       │
                                                       ▼
                                               ┌──────────────┐
                                               │ 入力検証     │
                                               │ ・email形式  │
                                               │ ・token形式  │
                                               └──────┬───────┘
                                                       │
                                                       ▼
                                               ┌──────────────┐
                                               │ ユーザー処理  │
                                               │ ・新規登録    │
                                               │ ・既存更新    │
                                               └──────┬───────┘
                                                       │
                                                       ▼
                                               ┌──────────────┐
                                               │ トークン暗号化│
                                               │ (AES-256-GCM)│
                                               └──────┬───────┘
                                                       │
                                                       ▼
                                               ┌──────────────┐
                                               │ セッション作成│
                                               │ (PostgreSQL) │
                                               └──────┬───────┘
                                                       │
┌─────────────┐     Set-Cookie: connect.sid    ◄───────┘
│  Frontend   │ ◄─────────────────────────────
└─────────────┘     (HttpOnly, Secure, SameSite)
```

#### 4.1.2 セッション設定

| 設定項目 | 値 | 目的 |
|---------|-----|------|
| `HttpOnly` | `true` | JavaScriptからのCookieアクセスを禁止（XSS対策） |
| `Secure` | `true` (本番環境) | HTTPS通信時のみCookie送信 |
| `SameSite` | `lax` | クロスサイトリクエスト制限（CSRF対策） |
| `maxAge` | 7日間 | セッション有効期限 |
| ストレージ | PostgreSQL | サーバーサイドでセッション管理 |

### 4.2 機密データの暗号化

#### 4.2.1 Qiitaトークンの暗号化

ユーザーのQiita Team APIトークンは、データベースに保存する前に暗号化される。

| 項目 | 内容 |
|------|------|
| アルゴリズム | AES-256-GCM |
| キー長 | 256ビット (32バイト) |
| IV (初期化ベクトル) | 128ビット、毎回ランダム生成 |
| 認証タグ | 128ビット（改ざん検知機能） |
| 保存形式 | `{IV}:{AuthTag}:{EncryptedData}` (HEX) |

**暗号化キー管理**:
- 環境変数 `ENCRYPTION_KEY` で管理
- 64文字のHEX文字列（32バイト）
- 生成コマンド: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

#### 4.2.2 暗号化フロー

```
┌─────────────────┐
│  平文トークン    │
│  qiita_xxxxx... │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AES-256-GCM    │
│  暗号化処理      │
│  ・IV生成       │
│  ・暗号化       │
│  ・認証タグ生成  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  暗号化データ    │
│  iv:tag:cipher  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  usersテーブル   │
└─────────────────┘
```

### 4.3 CORS設定

| 環境 | 許可オリジン | 説明 |
|------|------------|------|
| 開発環境 | `http://localhost:5173` | フロントエンド開発サーバー |
| 本番環境 | 環境変数 `CORS_ORIGIN` で指定 | デプロイ先ドメインのみ許可 |

**設定内容**:
```typescript
cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true  // Cookie送信を許可
})
```

### 4.4 入力検証

| 検証項目 | 内容 | エラー時 |
|---------|------|---------|
| メールアドレス形式 | 正規表現によるフォーマットチェック | 400 Bad Request |
| Qiitaトークン形式 | `qiita_` プレフィックスの確認 | 400 Bad Request |
| 検索クエリ | 必須パラメータチェック | 400 Bad Request |
| 検索モード | ホワイトリスト検証 (`hybrid`, `keyword`, `semantic`) | 400 Bad Request |

### 4.5 SQLインジェクション対策

すべてのデータベースクエリはパラメータ化クエリを使用。

```typescript
// 安全な実装例
const sql = `SELECT * FROM documents WHERE title ILIKE $1`;
const result = await pool.query(sql, [`%${searchQuery}%`]);
```

### 4.6 権限チェック（検索結果フィルタリング）

検索結果は、ユーザーのQiita Team権限でフィルタリングされる。

```
検索実行
    │
    ▼
┌─────────────────────┐
│  検索結果取得        │
│  (DB全体から検索)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  トークン復号化      │
│  (AES-256-GCM)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Qiita API呼び出し   │
│  各記事の権限確認    │
│  GET /items/{id}    │
└──────────┬──────────┘
           │
           ├─ 200 OK → アクセス可能
           ├─ 404 → 権限なし（除外）
           └─ エラー → 安全側で除外
           │
           ▼
┌─────────────────────┐
│  フィルタリング済み   │
│  検索結果を返却      │
└─────────────────────┘
```

### 4.7 セキュリティチェックリスト

| 項目 | 対策 | 状態 |
|------|------|------|
| XSS対策 | HttpOnly Cookie | ✅ 実装済み |
| CSRF対策 | SameSite Cookie | ✅ 実装済み |
| セッションハイジャック | Secure Cookie (本番) | ✅ 実装済み |
| 機密データ保護 | AES-256-GCM暗号化 | ✅ 実装済み |
| SQLインジェクション | パラメータ化クエリ | ✅ 実装済み |
| CORS | ホワイトリスト制御 | ✅ 実装済み |
| 権限チェック | APIベースの権限確認 | ✅ 実装済み |
| 入力検証 | サーバーサイドバリデーション | ✅ 実装済み |

---

## 5. データベース設計

### 5.1 ER図

```
┌─────────────────────┐
│       users         │
├─────────────────────┤
│ id (PK)             │
│ username (UNIQUE)   │
│ email (UNIQUE)      │
│ encrypted_qiita_token │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │
           │ 1:N (セッション)
           ▼
┌─────────────────────┐
│      session        │
├─────────────────────┤
│ sid (PK)            │
│ sess (JSON)         │──► { userId: number }
│ expire              │
└─────────────────────┘

┌─────────────────────┐
│     documents       │
├─────────────────────┤
│ id (PK)             │
│ title               │
│ body                │
│ url                 │
│ author              │
│ source              │
│ embedding (vector)  │──► 768次元ベクトル
│ created_at          │
│ updated_at          │
│ synced_at           │
└─────────────────────┘
```

### 5.2 テーブル定義

#### usersテーブル

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | SERIAL | PRIMARY KEY | ユーザーID |
| username | VARCHAR(255) | NOT NULL, UNIQUE | ユーザー名 |
| email | VARCHAR(255) | NOT NULL, UNIQUE | メールアドレス |
| encrypted_qiita_token | TEXT | NOT NULL | 暗号化されたQiitaトークン |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 更新日時 |

#### sessionテーブル

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| sid | VARCHAR | PRIMARY KEY | セッションID |
| sess | JSON | NOT NULL | セッションデータ |
| expire | TIMESTAMP(6) | NOT NULL | 有効期限 |

#### documentsテーブル

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | VARCHAR(255) | PRIMARY KEY | 記事ID (Qiita記事ID) |
| title | TEXT | NOT NULL | 記事タイトル |
| body | TEXT | NOT NULL | 記事本文 |
| url | TEXT | NOT NULL | 記事URL |
| author | VARCHAR(255) | NOT NULL | 作成者ID |
| source | VARCHAR(50) | NOT NULL | データソース ('qiita_team') |
| embedding | vector(768) | NULLABLE | Embeddingベクトル |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | 記事作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | 記事更新日時 |
| synced_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 同期日時 |

### 5.3 インデックス

| テーブル | インデックス名 | 種類 | 対象カラム | 用途 |
|---------|--------------|------|-----------|------|
| documents | idx_documents_embedding | IVFFlat | embedding | ベクトル類似度検索 |
| documents | idx_documents_title_trgm | GIN | title | 全文検索（タイトル） |
| documents | idx_documents_body_trgm | GIN | body | 全文検索（本文） |
| documents | idx_documents_source | B-tree | source | ソースフィルタリング |
| documents | idx_documents_updated_at | B-tree | updated_at | 更新日時ソート |
| session | IDX_session_expire | B-tree | expire | 期限切れセッション検索 |

### 5.4 PostgreSQL拡張機能

| 拡張機能 | 用途 |
|---------|------|
| pgvector | ベクトル類似度検索（コサイン類似度） |
| pg_trgm | トライグラムによる全文検索 |

---

## 6. 環境変数一覧

### 6.1 Backend

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `DATABASE_URL` | ✅ | PostgreSQL接続URL | `postgresql://user:pass@localhost:5432/db` |
| `PORT` | - | サーバーポート (デフォルト: 3000) | `3000` |
| `NODE_ENV` | - | 環境 (`development` / `production`) | `production` |
| `CORS_ORIGIN` | ✅ (本番) | 許可するオリジン | `https://app.example.com` |
| `SESSION_SECRET` | ✅ | セッション暗号化キー (64文字HEX) | `b9287535ea7f...` |
| `ENCRYPTION_KEY` | ✅ | トークン暗号化キー (64文字HEX) | `0d736f21c169...` |

### 6.2 Frontend

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `VITE_API_URL` | ✅ | バックエンドAPIのURL | `http://localhost:3000` |
| `VITE_APP_TITLE` | - | アプリケーションタイトル | `Groovy Knowledge Search` |

### 6.3 Sync Worker

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `DATABASE_URL` | ✅ | PostgreSQL接続URL | `postgresql://user:pass@localhost:5432/db` |
| `QIITA_TEAM_TOKEN` | ✅ (本番) | Qiita Team APIトークン | `qiita_xxxxx...` |
| `QIITA_TEAM_NAME` | ✅ (本番) | Qiita Teamの名前 | `your-company` |
| `GEMINI_API_KEY` | ✅ (本番) | Google Gemini APIキー | `AIzaSy...` |
| `USE_MOCK_QIITA` | - | モックモード (`true` / `false`) | `false` |
| `USE_MOCK_GEMINI` | - | モックモード (`true` / `false`) | `false` |
| `SYNC_CRON_SCHEDULE` | - | 同期スケジュール (cron形式) | `0 2 * * *` |

---

## 7. デプロイメント

### 7.1 Docker Compose構成

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
```

### 7.2 本番環境チェックリスト

| 項目 | 確認事項 |
|------|---------|
| NODE_ENV | `production` に設定 |
| SESSION_SECRET | 強力なランダム値を設定 |
| ENCRYPTION_KEY | 強力なランダム値を設定 |
| CORS_ORIGIN | 本番ドメインを指定 |
| USE_MOCK_* | すべて `false` に設定 |
| HTTPS | 本番環境ではHTTPSを使用 |
| バックアップ | データベースバックアップ戦略を策定 |

---

## 8. 運用・監視

### 8.1 自動同期スケジュール

| 項目 | 設定 |
|------|------|
| スケジュール | 毎日午前2時 (JST) |
| cron式 | `0 2 * * *` |
| タイムゾーン | Asia/Tokyo |

### 8.2 エラー時の動作

| シナリオ | 動作 |
|---------|------|
| Qiita API接続失敗 | エラーログ出力、次回同期まで待機 |
| Gemini API接続失敗 | エンベディングなしで記事同期を継続 |
| DB接続失敗 | 同期処理を中断、次回同期まで待機 |
| 権限確認失敗 | 安全側に倒し、該当記事をフィルタリング |

### 8.3 今後の監視検討項目

- 構造化ログ導入（winston等）
- Prometheusメトリクス連携
- アラート設定（エラー率、レスポンスタイム）

---

## 9. 改訂履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-02-19 | 1.0 | 初版作成 |

---

## 付録A: 権限一覧サマリー

### 外部サービスに必要な権限

| サービス | 必要な権限/スコープ | 取得方法 |
|---------|------------------|---------|
| **Qiita Team API** | `read_qiita` スコープ | Qiita設定画面でトークン発行 |
| **Google Gemini API** | Generative Language API有効化 | Google Cloud ConsoleでAPI有効化 + APIキー発行 |

### システム内部の権限モデル

| リソース | 権限チェック方法 |
|---------|----------------|
| 検索API | セッション認証（ログイン必須） |
| 検索結果 | Qiita Team APIで記事単位の権限確認 |
| ユーザー情報 | 本人のセッションのみアクセス可 |
