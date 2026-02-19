# Groovy Knowledge Search - システム設計書

## 1. システム概要

### 1.1 目的

社内ナレッジ（Qiita Team記事）を統合的に検索できるWebアプリケーション。
セマンティック検索とキーワード検索を組み合わせたハイブリッド検索により、関連性の高い記事を効率的に発見できる。

### 1.2 主要機能

| 機能 | 説明 |
|------|------|
| ハイブリッド検索 | セマンティック検索 + キーワード検索の組み合わせ |
| 権限ベースフィルタリング | ユーザーのQiita Team権限に基づく検索結果のフィルタリング |
| 自動同期 | Qiita Team記事の日次自動同期（毎日午前2時） |
| ベクトル検索 | AI Embedding APIによるテキストのベクトル化と類似度検索 |

---

## 2. システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                    Groovy Knowledge Search                       │
│                                                                  │
│  Frontend (React)  ◄──►  Backend (Express)  ◄──►  PostgreSQL    │
│     :5173                   :3000                 (pgvector)     │
│                                                      ▲           │
│                                               Sync Worker        │
│                                               (cron: 毎日2時)    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │ Qiita Team  │     │ Gemini API  │     │ OpenAI API  │
    │    API      │     │  (現在)     │     │ (移行予定)  │
    └─────────────┘     └─────────────┘     └─────────────┘
```

### 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 18 + TypeScript + Tailwind CSS |
| バックエンド | Express.js + TypeScript |
| データベース | PostgreSQL 16 + pgvector |
| ランタイム | Node.js 20 LTS |

---

## 3. 外部サービス連携と必要権限

### 3.1 Qiita Team API

| 項目 | 内容 |
|------|------|
| 認証方式 | Bearer Token (Personal Access Token) |
| **必要スコープ** | **`read_qiita`**（記事の読み取り） |
| 使用エンドポイント | `GET /items`（記事一覧）、`GET /items/{id}`（権限確認） |
| トークン取得URL | https://qiita.com/settings/tokens |

---

### 3.2 Embedding API（Gemini / OpenAI）

#### API比較表

| 項目 | Google Gemini API（現在） | OpenAI API（移行予定） |
|------|--------------------------|----------------------|
| モデル | `text-embedding-004` | `text-embedding-3-small` |
| 出力次元 | 768次元 | 1536次元 |
| **必要な権限** | Generative Language API有効化 | APIキー発行のみ |
| APIキー取得URL | https://console.cloud.google.com/ | https://platform.openai.com/api-keys |

#### 料金

| 項目 | Gemini API | OpenAI API |
|------|-----------|-----------|
| 無料枠 | あり（60 RPM） | なし |
| 従量課金 | 入力トークン数ベース | **$0.02 / 1M tokens** |
| レート制限 | 60 RPM | 3,000 RPM |

**月額料金の目安（OpenAI API）**:
- 記事1000件 × 平均2000トークン = 2Mトークン/月
- 月額約 **$0.04**（初回同期時のみ、以降は差分のみ）

#### データプライバシー・学習利用ポリシー

| 項目 | Gemini API | OpenAI API |
|------|-----------|-----------|
| **モデル学習への利用** | **されない** ※1 | **されない** ※2 |
| データ保持期間 | リクエスト処理後に削除 | 30日間（不正利用監視目的） |
| 根拠 | Google Cloud データ処理規約 | OpenAI API Data Usage Policy |

**※1 Gemini API**: Google Cloud Platform経由のAPI利用では、顧客データはモデルのトレーニングに使用されない。
- 参考: https://cloud.google.com/terms/data-processing-addendum

**※2 OpenAI API**: 2023年3月以降、APIを通じて送信されたデータはモデルのトレーニングに使用されない（デフォルト）。
- 参考: https://openai.com/policies/api-data-usage-policies
- 明示的なオプトイン設定をしない限り、学習には使用されない

> **重要**: 両APIとも、**社内記事データがAIモデルの学習に使用されることはありません**。

---

## 4. セキュリティ設計

### 4.1 認証・セッション管理

| 項目 | 実装 |
|------|------|
| 認証方式 | セッションベース認証（express-session） |
| セッションストレージ | PostgreSQL（connect-pg-simple） |
| Cookie設定 | `HttpOnly`, `Secure`(本番), `SameSite=lax` |
| セッション有効期限 | 7日間 |

### 4.2 機密データの暗号化

| 対象 | 暗号化方式 | 保存先 |
|------|----------|-------|
| Qiita APIトークン | AES-256-GCM | PostgreSQL（usersテーブル） |
| セッションID | ランダム生成 | Cookie + PostgreSQL |

**暗号化キー管理**: 環境変数 `ENCRYPTION_KEY`（64文字HEX）

### 4.3 セキュリティ対策一覧

| 脅威 | 対策 | 状態 |
|------|------|------|
| XSS | HttpOnly Cookie | ✅ |
| CSRF | SameSite Cookie | ✅ |
| SQLインジェクション | パラメータ化クエリ | ✅ |
| 不正アクセス | CORS + セッション認証 | ✅ |
| トークン漏洩 | AES-256-GCM暗号化 | ✅ |
| 権限昇格 | Qiita APIによる記事単位の権限確認 | ✅ |

---

## 5. データベース設計

### 主要テーブル

| テーブル | 用途 | 主要カラム |
|---------|------|-----------|
| `users` | ユーザー情報 | id, username, email, encrypted_qiita_token |
| `session` | セッション管理 | sid, sess (JSON), expire |
| `documents` | 記事データ | id, title, body, url, author, embedding |

### PostgreSQL拡張機能

| 拡張 | 用途 |
|------|------|
| pgvector | ベクトル類似度検索（コサイン類似度） |
| pg_trgm | 日本語対応全文検索 |

---

## 6. 環境変数一覧

### 必須環境変数

| 変数名 | 用途 | 設定先 |
|--------|------|-------|
| `DATABASE_URL` | PostgreSQL接続URL | Backend, Sync Worker |
| `SESSION_SECRET` | セッション暗号化キー（64文字HEX） | Backend |
| `ENCRYPTION_KEY` | トークン暗号化キー（64文字HEX） | Backend |
| `CORS_ORIGIN` | 許可オリジン（本番のみ） | Backend |
| `QIITA_TEAM_TOKEN` | Qiita Team APIトークン | Sync Worker |
| `GEMINI_API_KEY` or `OPENAI_API_KEY` | Embedding APIキー | Sync Worker |

---

## 7. 外部サービス権限サマリー

### 必要な権限・設定の一覧

| サービス | 必要な権限/設定 | 取得手順 |
|---------|---------------|---------|
| **Qiita Team** | `read_qiita` スコープ | 設定→アプリケーション→トークン発行 |
| **Google Cloud** | Generative Language API有効化 | Cloud Console→API→有効化 |
| **OpenAI** | APIキー発行 | Platform→API Keys→Create |

### データ利用に関する保証

| 確認事項 | Gemini API | OpenAI API |
|---------|-----------|-----------|
| 送信データの学習利用 | **なし** | **なし** |
| 第三者へのデータ共有 | なし | なし |
| GDPR準拠 | 準拠 | 準拠 |

---

## 8. 運用

### 自動同期

| 項目 | 設定 |
|------|------|
| スケジュール | 毎日午前2時（JST） |
| 処理内容 | Qiita Team記事取得 → Embedding生成 → DB保存 |

### エラー時の動作

| シナリオ | 動作 |
|---------|------|
| Qiita API失敗 | 次回同期まで待機 |
| Embedding API失敗 | エンベディングなしで記事同期を継続 |
| DB接続失敗 | 同期中断、次回同期まで待機 |

---

## 9. 改訂履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-02-19 | 1.0 | 初版作成 |
| 2026-02-19 | 1.1 | OpenAI API追記、簡略化、データプライバシーポリシー追加 |
