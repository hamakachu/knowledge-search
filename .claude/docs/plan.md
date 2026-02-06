# 権限管理実装計画ログ（2026-02-06）

## 背景と質問

**質問**: 「ユーザーによって、記事の閲覧権限が違ってくる。データベースに全ての記事を同期して保存しておく方針では、データベースにアクセスすることで権限外の記事を閲覧できてしまう。権限外の記事を検索にかからなくするためには、どのような方法がある？」

**採用アプローチ**: 「DB検索 + API権限チェック」

---

## 実装アプローチ

1. PostgreSQL全文検索で候補記事を高速抽出
2. ユーザー認証とQiita Teamトークン管理（暗号化保存）
3. 検索結果をユーザーのトークンでQiita Team APIに権限確認（並列処理）
4. 権限のある記事のみをフィルタリングして返却

**推定実装期間**: MVP 2週間、完全版 4-5週間

---

## システムフロー

```
[ユーザー]
  ↓ (1) ログイン（Qiita Teamトークン入力）
[Frontend] → [Backend: POST /api/auth/login]
  ↓ (2) トークン暗号化保存、セッション作成
[Backend] → PostgreSQL users テーブル
  ↓ (3) 検索リクエスト
[Frontend] → [Backend: GET /api/search?q=keyword]
  ↓ (4) DB全文検索（pg_trgm）
[Backend] → PostgreSQL documents テーブル（候補記事抽出）
  ↓ (5) 権限チェック（並列API呼び出し）
[Backend] → Qiita Team API (GET /items/:id)
  ↓ (6) 200 OK → アクセス可 / 404 → 権限なし
[Backend] → フィルタリング
  ↓ (7) 権限のある記事のみ
[Frontend] ← 検索結果表示
```

---

## 段階的実装計画

### Phase 1: 基本認証とトークン管理（Week 1-2）
- DBスキーマ拡張（users, sessionsテーブル）
- トークン暗号化（AES-256-GCM）
- 認証サービス（authService.ts）
- セッション管理（express-session + PostgreSQL）
- 認証エンドポイント（POST /login, GET /me, POST /logout）
- 認証ミドルウェア（requireAuth）
- ログインUI（LoginForm.tsx）

### Phase 2: PostgreSQL全文検索実装（Week 2）
- searchService.ts実装（pg_trgm + LIKE検索）
- 検索エンドポイントの認証保護

### Phase 3: API権限チェック実装（Week 3）
- QiitaClient拡張（checkArticleAccess, checkBatchAccessメソッド）
- permissionService.ts（権限フィルタリング）
- 検索エンドポイントへの統合

### Phase 4: パフォーマンス最適化（Week 4）
- インメモリキャッシュ（node-cache、5分TTL）
- レート制限（express-rate-limit、60req/min/user）
- バッチサイズ最適化（10並列API呼び出し）

### Phase 5: セキュリティとログ強化（Week 4-5）
- Helmet.js（セキュリティヘッダ）
- 構造化ログ（winston）
- グローバルエラーハンドラ
- E2Eテスト

---

## セキュリティ対策

### トークン保護
- AES-256-GCM暗号化（認証付き暗号化）
- ランダムIV（初期化ベクター）
- 環境変数ENCRYPTION_KEYで鍵管理
- DBから取得時のみ復号化
- APIレスポンスにトークンを含めない

### セッション管理
- PostgreSQLバックエンドストレージ
- Secure cookies（HTTPS環境）
- HttpOnly cookies（XSS対策）
- SameSite=Lax（CSRF対策）
- 7日間の有効期限

### 入力検証
- 検索クエリ最大長チェック（1000文字）
- SQLインジェクション対策（パラメータ化クエリ）
- XSS対策（エスケープ処理）

### レート制限
- 検索: 60リクエスト/分/ユーザー
- ログイン: 5リクエスト/15分/IP
- Qiita Team API: 10並列制限

---

## パフォーマンス戦略

### DB検索最適化
- GINインデックス（pg_trgm）活用
- LIMIT 100件で結果数制限
- similarity()関数で関連度スコアリング

### API権限チェック最適化
- Promise.all()で並列API呼び出し
- バッチサイズ: 10件/バッチ
- インメモリキャッシュ（5分TTL）
- キャッシュヒット率目標: 70%以上

### 推定パフォーマンス
- DB検索（1000件）: < 100ms
- 権限チェック（10件、キャッシュなし）: < 1秒
- 権限チェック（10件、キャッシュあり）: < 50ms
- 権限チェック（100件、キャッシュなし）: < 3秒

---

## Critical Files（実装の重要ファイル）

### 最優先（Week 1-2）
1. `database/migrations/002_add_users_and_sessions.sql` - DBスキーマ基盤
2. `backend/src/utils/encryption.ts` - トークン暗号化の要
3. `backend/src/services/authService.ts` - 認証ロジックの中核
4. `backend/src/middleware/session.ts` - セッション管理
5. `backend/src/middleware/auth.ts` - 認証ミドルウェア
6. `backend/src/routes/auth.ts` - 認証エンドポイント

### 次に優先（Week 2-3）
7. `backend/src/services/searchService.ts` - 全文検索実装
8. `sync-worker/src/clients/qiitaClient.ts` - 権限チェックメソッド追加
9. `backend/src/services/permissionService.ts` - 権限フィルタリングの中核
10. `backend/src/routes/search.ts` - 検索エンドポイント修正

### フロントエンド
11. `frontend/src/hooks/useAuth.ts` - 認証状態管理
12. `frontend/src/components/LoginForm.tsx` - ログインUI

---

## 環境変数

```bash
# backend/.env に追加
SESSION_SECRET=<32文字以上のランダム文字列>
ENCRYPTION_KEY=<32バイトのHEX文字列（64文字）>

# 生成方法
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 依存パッケージ

### Backend新規追加
```bash
pnpm add express-session connect-pg-simple node-cache express-rate-limit helmet winston
pnpm add -D @types/express-session @types/connect-pg-simple @types/node-cache
```

### Frontend新規追加
```bash
pnpm add react-router-dom
pnpm add -D @types/react-router-dom
```

---

## リスクと軽減策

### リスク1: Qiita Team APIのレート制限
- **軽減策**: キャッシュ（5分TTL）、バッチサイズ制限（10並列）、検索結果上限（100件）

### リスク2: パフォーマンス劣化
- **軽減策**: 並列API呼び出し、キャッシュレイヤー、GINインデックス活用

### リスク3: トークン漏洩
- **軽減策**: AES-256-GCM暗号化、環境変数管理、セキュアなセッション管理

### リスク4: セッションストレージ肥大化
- **軽減策**: 7日自動期限切れ、定期クリーンアップジョブ、モニタリング

---

## 検証方法

### E2Eテストシナリオ
1. ログイン → Qiita Teamトークン入力 → セッション作成確認
2. 検索実行 → DB全文検索動作 → 権限チェック実行確認
3. 権限フィルタリング → 権限のある記事のみ返却確認
4. ログアウト → セッション削除 → 再検索時に401エラー確認

### パフォーマンステスト
- DB検索: 1000件で < 100ms
- 権限チェック（キャッシュなし）: 10件 < 1秒、100件 < 3秒
- 権限チェック（キャッシュあり）: < 50ms

### セキュリティチェック
- [ ] トークンがDBで暗号化されている
- [ ] セッションがSecure/HttpOnly/SameSiteクッキー
- [ ] SQLインジェクション対策（パラメータ化クエリ）
- [ ] レート制限が動作
- [ ] 未認証時に401エラー

---

## 次のステップ

### 実装開始前の準備
1. 環境変数生成（SESSION_SECRET, ENCRYPTION_KEY）
2. 依存パッケージインストール
3. DBマイグレーション実行
4. Qiita Team API確認（read_qiita_teamスコープのトークン準備）

### 実装順序（TDD徹底）
- Week 1: Phase 1（認証基盤）
- Week 2: Phase 2-3（検索と権限）
- Week 3: 統合テストとバグ修正
- Week 4-5: Phase 4-5（最適化とセキュリティ）

---

## ステータス

**状態**: プラン作成完了、実装待ち
**作成日**: 2026-02-06
**詳細プラン**: `/Users/hiroaki/.claude/plans/memoized-sniffing-hopcroft.md`
**次のアクション**: ユーザーの承認待ち（実装するかどうか）

---

## まとめ

この計画により、**ユーザーが閲覧権限を持つQiita Team記事のみ**を検索結果で表示できるようになります。

**重要原則**:
- TDD徹底（Red → Green → Refactor）
- セキュリティファースト（トークン暗号化、セッション管理）
- パフォーマンス意識（キャッシュ、並列処理、GINインデックス）
- 段階的実装（MVP → v1.0）

**検証済み設計**:
- Qiita Team API仕様準拠（200 OK = アクセス可、404 = 権限なし）
- 既存のdocumentRepositoryパターンを踏襲
- PostgreSQL全文検索インデックス活用（pg_trgm）
