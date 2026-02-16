# 認証方式変更計画

**作成日**: 2026-02-16
**状態**: 計画完了、実装待ち

---

## 現状の問題

- ログイン時にQiita Team Tokenを入力させる方式は一般的ではない
- ユーザー体験が悪い（トークン取得方法が複雑）
- 各ユーザーが個別にトークンを持つ必要がある

---

## 採用方針: ID/パスワード + 管理者トークン

### 概要

- **ログイン**: ユーザー名 + パスワード（bcryptハッシュ）
- **権限チェック**: 環境変数 `QIITA_TEAM_TOKEN` で統一
- **特徴**: 全ユーザーが同じ権限（管理者トークンの権限）

### メリット

- 一般的なID/パスワード認証（ユーザーに馴染みがある）
- 各ユーザーがQiita Tokenを持つ必要なし
- シンプルな実装

### デメリット

- 全ユーザーが同じ権限（管理者トークンの権限）
- ユーザー個別の権限差異を反映できない

---

## 実装Phase一覧

| Phase | 内容 | 主な変更 |
|-------|------|---------|
| 1 | DBマイグレーション | `password_hash`カラム追加、`encrypted_qiita_token`削除 |
| 2 | authService変更 | bcryptによるパスワードハッシュ化 |
| 3 | 認証エンドポイント | `/register`と`/login`を分離 |
| 4 | 権限チェック変更 | 環境変数`QIITA_TEAM_TOKEN`を使用 |
| 5 | フロントエンド型定義 | `LoginCredentials`、`RegisterCredentials` |
| 6 | UI変更 | ログイン/新規登録を別画面に |
| 7 | クリーンアップ | 不要コード削除 |

---

## 修正対象ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `database/migrations/004_update_users_auth.sql` | 新規作成 |
| `backend/package.json` | bcrypt追加 |
| `backend/src/services/authService.ts` | パスワード認証に変更 |
| `backend/src/routes/auth.ts` | register/loginエンドポイント変更 |
| `backend/src/services/permissionService.ts` | 管理者トークン使用に変更 |
| `frontend/src/components/LoginForm.tsx` | パスワード入力に変更 |
| `frontend/src/components/RegisterForm.tsx` | **新規作成** |
| `frontend/src/pages/RegisterPage.tsx` | **新規作成** |
| `frontend/src/contexts/AuthContext.tsx` | 認証関数の引数変更 |
| `frontend/src/types/auth.ts` | 型定義更新 |

---

## 詳細実装計画

### Phase 1: データベースマイグレーション

**ファイル**: `database/migrations/004_update_users_auth.sql`

```sql
-- パスワード認証への移行
\c groovy_knowledge_search;

-- 既存ユーザーを削除（開発環境のみ）
TRUNCATE TABLE users CASCADE;

-- カラム変更
ALTER TABLE users DROP COLUMN IF EXISTS encrypted_qiita_token;
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL;
```

### Phase 2: バックエンド - authService.ts

```typescript
import bcrypt from 'bcrypt';

interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

// 新規ユーザー登録
async function createUser(params: {
  username: string;
  email: string;
  password: string;
}): Promise<User> {
  const passwordHash = await bcrypt.hash(params.password, 10);
  // INSERT INTO users (username, email, password_hash) ...
}

// パスワード検証
async function verifyPassword(
  username: string,
  password: string
): Promise<User | null> {
  const user = await findUserByUsername(username);
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password_hash);
  return isValid ? user : null;
}
```

### Phase 3: バックエンド - auth.ts（ルート）

```typescript
// POST /api/auth/register - 新規ユーザー登録
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  // バリデーション → createUser → セッション作成
});

// POST /api/auth/login - ログイン
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await verifyPassword(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // セッション作成
});
```

### Phase 4: バックエンド - permissionService.ts

```typescript
export async function filterByPermissions(
  userId: number,
  searchResults: SearchResult[]
): Promise<SearchResult[]> {
  // 管理者トークンを環境変数から取得
  const token = process.env.QIITA_TEAM_TOKEN;

  if (!token) {
    // トークン未設定時は権限チェックスキップ（全記事返却）
    console.warn('QIITA_TEAM_TOKEN not set, skipping permission check');
    return searchResults;
  }

  // 既存ロジック（共通トークン使用）
  const qiitaClient = new QiitaClient(token);
  const accessibleIds = await qiitaClient.checkBatchAccess(articleIds);
  return searchResults.filter(r => accessibleIds.has(r.id));
}
```

### Phase 5: フロントエンド - types/auth.ts

```typescript
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
```

### Phase 6: フロントエンド - UI変更

**決定事項**: ログインと新規登録は**別画面**

**UI構成**:
```
/login     → LoginPage（ユーザー名 + パスワード）
              └─ 「アカウントをお持ちでない方はこちら」→ /register へリンク

/register  → RegisterPage（ユーザー名 + メール + パスワード）
              └─ 「すでにアカウントをお持ちの方はこちら」→ /login へリンク
```

### Phase 7: クリーンアップ

**削除可能ファイル**:
- `backend/src/utils/encryption.ts`

**削除する環境変数**:
- `ENCRYPTION_KEY`

---

## 環境変数

```bash
# backend/.env
SESSION_SECRET=<32文字以上のランダム文字列>
QIITA_TEAM_TOKEN=<管理者のQiita Team Token>  # 権限チェック用

# ENCRYPTION_KEY は不要に
```

---

## 検証方法

1. **ユーザー登録**: POST /api/auth/register でユーザー作成
2. **ログイン**: POST /api/auth/login でセッション作成
3. **検索**: 管理者トークンで権限チェック実行
4. **ログアウト**: POST /api/auth/logout でセッション破棄

---

## 実装順序（TDDサイクル）

1. **Phase 1**: マイグレーションSQL作成・実行
2. **Phase 2**: authService.ts のテスト作成 → 実装
3. **Phase 3**: auth.ts（ルート）のテスト作成 → 実装
4. **Phase 4**: permissionService.ts のテスト更新 → 実装
5. **Phase 5-6**: フロントエンドのテスト作成 → 実装
6. **Phase 7**: 不要コード削除、統合テスト

---

## 検討した代替案

### 案A: Qiita Team OAuth 2.0

- **結論**: 2020年6月以降非推奨のため却下
- OAuthアプリ登録が必要、SSO限定チームでは使用不可の可能性

### 案C: ID/パスワード認証 + 権限チェックなし

- **概要**: 権限チェックをスキップし、全記事を検索対象
- **却下理由**: 権限管理機能がなくなる

### 案D: ハイブリッド方式

- **概要**: Qiita Tokenは設定画面で任意登録
- **却下理由**: UI/UXが複雑になる

---

## 次のアクション

ユーザーの承認後、Phase 1から順次実装開始
