# Qiita Team sync-worker DB Upsert処理実装計画

## 概要

**目的**: Qiita Teamから取得した記事をPostgreSQLのdocumentsテーブルにupsert（挿入・更新）する処理を実装する

**実装箇所**: `sync-worker/src/sync-qiita.ts` の行12（TODO部分）

**技術要件**:
- PostgreSQLクライアント（pg）を使用
- トランザクション処理によるデータ一貫性の保証
- 詳細なエラーハンドリング
- TDD（Test-Driven Development）の徹底

---

## 実装アプローチ

### Repository パターンの採用

**理由**:
1. **関心の分離**: 同期ロジックとDB操作を分離
2. **テスタビリティ**: Repository単体でテスト可能
3. **再利用性**: 将来的に他のソース（Google Drive、OneDrive）でも同じRepositoryを使用可能
4. **保守性**: DB操作の変更が同期ロジックに影響しない

**ファイル構成**:
```
sync-worker/src/
  ├── db/
  │   ├── client.ts              (既存)
  │   └── documentRepository.ts  (新規作成)
  ├── sync-qiita.ts              (TODO部分を実装)
  └── __tests__/
      ├── sync-qiita.test.ts      (テスト追加)
      └── documentRepository.test.ts (新規作成)
```

---

## 実装の詳細

### 1. documentRepository.ts の実装

**責務**: documentsテーブルへのupsert処理を提供

**主要な型定義**:
```typescript
interface DocumentInput {
  id: string;
  title: string;
  body: string;
  url: string;
  author: string;
  source: 'qiita_team' | 'google_drive' | 'onedrive';
  created_at: Date;
  updated_at: Date;
}

interface UpsertResult {
  upsertedCount: number;
  errors: string[];
}
```

**主要メソッド**:
```typescript
// 単一記事のupsert
async upsertDocument(document: DocumentInput): Promise<void>

// 複数記事の一括upsert（トランザクション使用）
async upsertQiitaArticles(documents: DocumentInput[]): Promise<UpsertResult>
```

**Upsert SQL（主キー判定）**:
```sql
INSERT INTO documents (id, title, body, url, author, source, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (id)
DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  url = EXCLUDED.url,
  author = EXCLUDED.author,
  updated_at = EXCLUDED.updated_at,
  synced_at = CURRENT_TIMESTAMP
```

**トランザクション処理**:
```typescript
const client = await dbClient.connect();
try {
  await client.query('BEGIN');

  for (const doc of documents) {
    await client.query(upsertSQL, [params]);
  }

  await client.query('COMMIT');
  return { upsertedCount: documents.length, errors: [] };
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### 2. sync-qiita.ts の実装

**TODO部分（行12）の実装内容**:
```typescript
// QiitaArticle[] → DocumentInput[] への変換
const documentsToUpsert: DocumentInput[] = articles.map(article => ({
  id: article.id,
  title: article.title,
  body: article.body,
  url: article.url,
  author: article.user.id,
  source: 'qiita_team' as const,
  created_at: new Date(article.created_at),
  updated_at: new Date(article.updated_at),
}));

// Repository経由でupsert
const result = await documentRepository.upsertQiitaArticles(documentsToUpsert);
console.log(`Upserted ${result.upsertedCount} articles`);

if (result.errors.length > 0) {
  console.error('Some articles failed to upsert:', result.errors);
  throw new Error(`Failed to upsert ${result.errors.length} articles`);
}
```

---

## TDD実装フロー（Red → Green → Refactor）

### Phase 1: documentRepository.test.ts の実装

**Test 1**: `upsertDocument_新規記事_正常に挿入される`
- 新規記事をupsertし、DBに正しく保存されることを確認

**Test 2**: `upsertDocument_既存記事_正常に更新される`
- 既存記事をupsertし、title、body、updated_atが更新されることを確認

**Test 3**: `upsertQiitaArticles_複数記事_トランザクション成功`
- 複数記事を一括upsertし、すべてが正しく保存されることを確認

**Test 4**: `upsertDocument_DB接続エラー_例外をスローする`
- 不正なデータ（NOT NULL制約違反）を渡し、例外がスローされることを確認

**Test 5**: `upsertDocument_synced_atが自動更新される`
- upsert時にsynced_atが現在時刻に更新されることを確認

### Phase 2: documentRepository.ts の実装（Green）

1. DocumentInput型、UpsertResult型を定義
2. upsertDocument()メソッドを実装（単一記事のupsert）
3. テスト1,2,4,5をパス
4. upsertQiitaArticles()メソッドを実装（トランザクション使用）
5. テスト3をパス

### Phase 3: sync-qiita.test.ts の実装

**Test 6**: `syncQiitaTeam_正常系_記事がDBにupsertされる`
- syncQiitaTeam()を実行し、フィクスチャデータがDBに保存されることを確認

**Test 7**: `syncQiitaTeam_重複実行_冪等性が保証される`
- 2回実行しても記事数が変わらないことを確認（重複挿入されない）

**Test 8**: `syncQiitaTeam_記事更新_synced_atが更新される`
- 再度同期を実行し、synced_atが更新されることを確認

### Phase 4: sync-qiita.ts の実装（Green）

1. documentRepositoryをインポート
2. QiitaArticle → DocumentInput への変換ロジックを実装
3. upsertQiitaArticles()呼び出し
4. 結果のログ出力とエラーハンドリング

### Phase 5: Refactor

- テストヘルパー関数の抽出（例: getDocumentCount）
- 共通エラーハンドリングの整理
- マジックナンバーの定数化

---

## エラーハンドリング

### 1. DB接続エラー
```typescript
catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.error('Database connection refused. Is PostgreSQL running?');
    throw new Error('Database connection failed');
  }
}
```

### 2. クエリ実行エラー
```typescript
catch (error) {
  if (error.code === '23505') {  // unique_violation
    console.error('Duplicate document detected');
  }
  if (error.code === '23502') {  // not_null_violation
    console.error('Required field is missing');
  }
  throw new Error(`Database query failed: ${error.message}`);
}
```

### 3. トランザクションエラー
```typescript
catch (error) {
  await client.query('ROLLBACK');
  console.error('Transaction rolled back due to error:', error);
  return {
    upsertedCount: 0,
    errors: [error.message],
  };
}
```

### 4. Date型の変換エラー
```typescript
try {
  created_at: new Date(article.created_at),
} catch (error) {
  console.error('Invalid date format:', article.created_at);
  // デフォルト値を使用またはスキップ
}
```

---

## 実装の優先順位

### 優先度1: 最小限の動作実装（MVP）
1. documentRepository.ts の基本実装（upsertDocument単体）
2. documentRepository.test.ts のテスト1,2,4
3. sync-qiita.ts の TODO部分実装（単純なループ処理）
4. sync-qiita.test.ts のテスト6

**目標**: 1記事ずつupsertできる状態にする

### 優先度2: トランザクション実装
1. upsertQiitaArticles()メソッドの実装
2. documentRepository.test.ts のテスト3
3. sync-qiita.ts のリファクタリング（一括upsert使用）
4. sync-qiita.test.ts のテスト7,8

**目標**: 複数記事を一括でトランザクション処理できる

### 優先度3: エラーハンドリング強化
1. 詳細なエラーメッセージ
2. 部分的な成功の処理（一部の記事だけ失敗した場合）
3. リトライロジック（オプション）

---

## Critical Files

実装に最も重要な3ファイル:

### 1. sync-worker/src/db/documentRepository.ts（新規作成）
- documentsテーブルへのupsert処理を実装する中核ファイル
- トランザクション管理、エラーハンドリング、型定義を含む

### 2. sync-worker/src/sync-qiita.ts（行12を実装）
- QiitaArticleをDocumentInputに変換
- documentRepositoryを呼び出す同期ロジックを追加

### 3. sync-worker/src/__tests__/documentRepository.test.ts（新規作成）
- upsertDocument, upsertQiitaArticlesの単体テスト
- TDDのRedフェーズで先に作成し、Greenフェーズで実装をパスさせる

**参考ファイル**:
- backend/src/services/statsService.ts（DBクエリパターン、エラーハンドリングの参考）
- backend/src/__tests__/stats.test.ts（テストパターンの参考）

---

## Verification（検証手順）

### 1. テスト実行
```bash
cd sync-worker
pnpm test
```
**期待結果**: すべてのテストがパス

### 2. テストカバレッジ確認
```bash
pnpm test:coverage
```
**期待結果**:
- documentRepository.ts: 90%以上
- sync-qiita.ts: 80%以上

### 3. 型チェック
```bash
pnpm typecheck
```
**期待結果**: 型エラーなし

### 4. Lint
```bash
pnpm lint
```
**期待結果**: Lintエラーなし

### 5. 実際の同期実行（モックデータ）
```bash
USE_MOCK_QIITA=true pnpm sync
```
**期待結果**:
- コンソールに `Fetched 3 articles` と表示
- コンソールに `Upserted 3 articles` と表示
- エラーなし

### 6. DB確認
```bash
psql -U postgres -d groovy_knowledge_search
```
```sql
SELECT COUNT(*) FROM documents WHERE source = 'qiita_team';
-- 期待結果: 3件

SELECT id, title, author, synced_at FROM documents WHERE source = 'qiita_team';
-- 期待結果: フィクスチャデータの3件が表示される
```

### 7. 冪等性の確認
```bash
# 2回実行
USE_MOCK_QIITA=true pnpm sync
USE_MOCK_QIITA=true pnpm sync
```
**期待結果**:
- 2回目も `Upserted 3 articles` と表示
- DBの件数は3件のまま（重複挿入されない）
- synced_atが更新されている

### 8. エンドツーエンドの動作確認
1. sync-workerでデータを同期
2. backendのAPIで統計情報を取得: `GET http://localhost:5001/api/stats`
3. 統計情報にQiita Teamの記事数が反映されていることを確認

---

## 実装後のコミットメッセージ（参考）

```
Implement DB upsert logic for Qiita Team sync-worker

- Add documentRepository.ts with upsert methods
- Implement transaction-based batch upsert
- Add comprehensive tests for repository and sync logic
- Use TDD approach (Red → Green → Refactor)
- Ensure idempotency with ON CONFLICT handling
- Add error handling for DB operations

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## まとめ

- **TDD徹底**: Red → Green → Refactor サイクルを守る
- **Repository パターン**: 関心の分離、テスタビリティ、再利用性
- **トランザクション使用**: データ一貫性の保証
- **主キー(id)でCONFLICT判定**: シンプルで高速
- **詳細なエラーハンドリング**: 本番運用を見据えた実装
- **既存パターンの踏襲**: dbClient.query、テストパターン、エージェント連携（dashboard.md）
