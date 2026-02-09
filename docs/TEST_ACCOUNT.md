# テストアカウント登録手順

## 概要

フロントエンドにアクセスしてテストアカウントを作成する手順を説明します。

## 前提条件

- PostgreSQLデータベースが起動していること（`docker-compose up -d postgres`）
- データベーススキーマが適用されていること
- バックエンドAPIが起動していること（`pnpm --filter backend dev`）
- フロントエンドが起動していること（`pnpm --filter frontend dev`）

## テストアカウント登録手順

### 1. フロントエンドにアクセス

ブラウザで http://localhost:5173 にアクセスします。

### 2. ログインページで新規ユーザーを登録

ログインフォームに以下の情報を入力します：

#### テストユーザー 1（推奨）

```
ユーザー名: test_user
メールアドレス: test@example.com
Qiita Teamトークン: test_token_dummy
```

#### テストユーザー 2

```
ユーザー名: demo_user
メールアドレス: demo@example.com
Qiita Teamトークン: demo_token_dummy
```

**注意**: Qiitaトークンはダミー値で構いません。実際のQiita Team APIを呼び出す場合は、有効なトークンを入力してください。

### 3. ログインボタンをクリック

「ログイン」ボタンをクリックすると、以下が自動的に実行されます：

1. 新規ユーザーの場合: ユーザーが登録され、セッションが作成されます
2. 既存ユーザーの場合: Qiitaトークンが更新され、セッションが作成されます

### 4. トップページ（検索ページ）にアクセス

ログイン成功後、自動的に検索ページにリダイレクトされます。

## トラブルシューティング

### ログインできない場合

1. **バックエンドが起動しているか確認**
   ```bash
   curl http://localhost:3000/health
   # 期待される出力: {"status":"ok"}
   ```

2. **データベースが起動しているか確認**
   ```bash
   docker-compose ps postgres
   # STATUSが"Up"であることを確認
   ```

3. **データベーススキーマが適用されているか確認**
   ```bash
   docker exec -i groovy-knowledge-search-db psql -U postgres -d groovy_knowledge_search -c "\d users"
   # usersテーブルの構造が表示されることを確認
   ```

4. **ブラウザの開発者ツールでネットワークエラーを確認**
   - F12キーを押して開発者ツールを開く
   - Networkタブで `/api/auth/login` リクエストを確認
   - エラーメッセージを確認

### セッションが維持されない場合

1. **環境変数が設定されているか確認**
   ```bash
   cat backend/.env | grep SESSION_SECRET
   # SESSION_SECRETが設定されていることを確認
   ```

2. **Cookieが有効になっているか確認**
   - ブラウザのCookie設定で、localhostのCookieが許可されていることを確認

## 開発時の注意事項

- テストアカウントのQiitaトークンはダミー値のため、実際のQiita Team APIは呼び出せません
- 実際のQiita Team記事を取得するには、有効なPersonal Access Tokenを入力してください
- トークンの取得方法は [README.md](../README.md) の「2-2. Qiita Team Personal Access Token の取得」を参照

## セキュリティに関する注意

- 本番環境では、必ず有効なメールアドレスとセキュアなQiitaトークンを使用してください
- テストアカウントは開発環境でのみ使用し、本番環境では削除してください
- SESSION_SECRETとENCRYPTION_KEYは、本番環境では必ず変更してください

## データベースの確認

登録されたユーザーを確認するには：

```bash
docker exec -i groovy-knowledge-search-db psql -U postgres -d groovy_knowledge_search -c "SELECT id, username, email, created_at FROM users;"
```

期待される出力：
```
 id |  username  |       email        |          created_at
----+------------+--------------------+-------------------------------
  1 | test_user  | test@example.com   | 2026-02-09 10:15:30.123456+00
```

## 次のステップ

1. 検索機能を試す
2. ドキュメントを追加する（sync-workerを使用）
3. ログアウト機能を試す（画面右上のユーザーメニュー）
