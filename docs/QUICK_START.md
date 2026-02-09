# クイックスタートガイド - テストアカウントでログイン

このガイドでは、最小限の手順でアプリケーションを起動し、テストアカウントでログインする方法を説明します。

## 前提条件

- Node.js 20+ インストール済み
- pnpm 8+ インストール済み
- Docker & Docker Compose インストール済み

## 起動手順（5分）

### 1. データベース起動

```bash
# プロジェクトルートで実行
docker-compose up -d postgres

# 起動確認（STATUSが"Up"になるまで待つ）
docker-compose ps postgres
```

### 2. データベーススキーマ適用

```bash
# プロジェクトルートで実行
docker exec -i groovy-knowledge-search-db psql -U postgres -d groovy_knowledge_search < database/schema.sql
```

期待される出力:
```
CREATE TABLE
CREATE TABLE
CREATE INDEX
...
NOTICE:  Schema created successfully
```

### 3. 環境変数設定

backend/.env を確認（既に存在する場合はスキップ）:

```bash
cat backend/.env
```

存在しない場合は作成:

```bash
cp backend/.env.example backend/.env
```

### 4. バックエンド起動

```bash
# ターミナル1（プロジェクトルートで実行）
pnpm --filter backend dev
```

起動確認:
```bash
# 別のターミナルで実行
curl http://localhost:3000/health
# 期待される出力: {"status":"ok"}
```

### 5. フロントエンド起動

```bash
# ターミナル2（プロジェクトルートで実行）
pnpm --filter frontend dev
```

起動すると、以下のようなメッセージが表示されます:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## テストアカウントでログイン

### 1. ブラウザでアクセス

http://localhost:5173 を開く

### 2. ログインページでユーザー登録

以下の情報を入力して「ログイン」ボタンをクリック:

```
ユーザー名: test_user
メールアドレス: test@example.com
Qiita Teamトークン: test_token_dummy
```

### 3. 検索ページにリダイレクト

ログイン成功後、自動的に検索ページが表示されます。

画面右上にユーザーメニュー（ユーザー名とログアウトボタン）が表示されます。

## トラブルシューティング

### バックエンドが起動しない

**エラー**: `Error: ENCRYPTION_KEY is not set`

**解決方法**: backend/.env に以下を追加

```bash
# 暗号化キーを生成
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# 出力された値をbackend/.envに追加
```

**エラー**: `Error: SESSION_SECRET is not set`

**解決方法**: backend/.env に以下を追加

```bash
# セッションシークレットを生成
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# 出力された値をbackend/.envに追加
```

**エラー**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**解決方法**: PostgreSQLが起動していません

```bash
docker-compose up -d postgres
```

### フロントエンドが起動しない

**エラー**: `EADDRINUSE: address already in use :::5173`

**解決方法**: ポート5173が既に使用されています

```bash
# 既存のプロセスを停止
lsof -ti:5173 | xargs kill -9

# 再度起動
pnpm --filter frontend dev
```

### ログインできない

**症状**: 「ログイン」ボタンをクリックしてもエラーが表示される

**確認項目**:

1. バックエンドが起動しているか
   ```bash
   curl http://localhost:3000/health
   ```

2. データベーススキーマが適用されているか
   ```bash
   docker exec -i groovy-knowledge-search-db psql -U postgres -d groovy_knowledge_search -c "\d users"
   ```

3. ブラウザの開発者ツール（F12）でエラーメッセージを確認

## 便利なコマンド

### すべてのサービスを一度に起動

```bash
# プロジェクトルートで実行
pnpm dev
```

このコマンドは、バックエンドとフロントエンドを同時に起動します。

### データベースの中身を確認

```bash
# ユーザー一覧
docker exec -i groovy-knowledge-search-db psql -U postgres -d groovy_knowledge_search -c "SELECT id, username, email FROM users;"

# ドキュメント件数
docker exec -i groovy-knowledge-search-db psql -U postgres -d groovy_knowledge_search -c "SELECT COUNT(*) FROM documents;"
```

### ログの確認

```bash
# バックエンドログ（ターミナル1で確認）
# フロントエンドログ（ターミナル2で確認）

# PostgreSQLログ
docker-compose logs postgres
```

## 次のステップ

1. [TEST_ACCOUNT.md](./TEST_ACCOUNT.md) - テストアカウントの詳細情報
2. [README.md](../README.md) - プロジェクト全体の概要
3. Qiita Team記事を同期する: `pnpm --filter sync-worker sync`（有効なQiitaトークンが必要）

## セキュリティに関する注意

⚠️ テストアカウントは開発環境でのみ使用してください

- 本番環境では有効なメールアドレスとQiitaトークンを使用
- SESSION_SECRETとENCRYPTION_KEYは本番環境で必ず変更
- .envファイルは絶対にGitにコミットしない
