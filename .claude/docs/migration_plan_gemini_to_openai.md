# Gemini API → OpenAI API 移行計画

## 概要

現在のGemini APIによるエンベディング生成機能を、OpenAI APIに置き換える。
次元数を768から1536に変更し、検索精度向上を目指す。

## 現状

| 項目 | 現在の実装 |
|------|-----------|
| パッケージ | `@google/generative-ai` (v0.24.1) |
| モデル | `text-embedding-004` |
| 次元数 | 768次元 |
| 環境変数 | `GEMINI_API_KEY`, `USE_MOCK_GEMINI` |

## 移行後

| 項目 | 移行後 |
|------|--------|
| パッケージ | `openai` (v4.x) |
| モデル | `text-embedding-3-small` |
| 次元数 | **1536次元** |
| 環境変数 | `OPENAI_API_KEY`, `USE_MOCK_EMBEDDING` |

---

## 修正対象ファイル

### 1. データベース: 新規マイグレーション
- `database/migrations/004_update_vector_dimension.sql` (新規)
  - embeddingカラムを `vector(768)` → `vector(1536)` に変更
  - IVFFlatインデックスを再作成

### 2. sync-worker/package.json
- `@google/generative-ai` を削除
- `openai` を追加

### 3. sync-worker/src/clients/openaiClient.ts（新規作成）
- `generateEmbedding(text: string): Promise<number[]>` 関数を実装
- OpenAI APIでエンベディング生成（model: `text-embedding-3-small`）
- **1536次元**（デフォルト、dimensionsパラメータ不要）
- レート制限を1秒に短縮（OpenAIは制限が緩い）

### 4. sync-worker/src/__fixtures__/embeddings.json（リネーム・更新）
- `gemini-embeddings.json` → `embeddings.json`
- 768次元 → **1536次元**のモックデータに更新

### 5. sync-worker/src/sync-qiita.ts
- インポート変更: `./clients/geminiClient` → `./clients/openaiClient`

### 6. backend/src/utils/openaiClient.ts（リネーム）
- `geminiClient.ts` → `openaiClient.ts`
- 動的インポートパスを変更

### 7. backend/src/services/searchService.ts
- インポート変更: `../utils/geminiClient` → `../utils/openaiClient`

### 8. 環境変数ファイル更新
- `sync-worker/.env.example`
- `backend/.env.example`

### 9. テストファイル
- `sync-worker/src/clients/__tests__/openaiClient.test.ts`（新規作成）
- 既存テストのインポートパスを更新

### 10. 旧ファイル削除
- `sync-worker/src/clients/geminiClient.ts`
- `sync-worker/src/clients/__tests__/geminiClient.test.ts`
- `sync-worker/src/__fixtures__/gemini-embeddings.json`

---

## 実装手順

### Phase 1: データベースマイグレーション
1. `004_update_vector_dimension.sql` を作成
2. マイグレーション実行

```sql
-- インデックス削除
DROP INDEX IF EXISTS idx_documents_embedding;

-- カラム変更（既存データはNULLにリセット）
ALTER TABLE documents DROP COLUMN IF EXISTS embedding;
ALTER TABLE documents ADD COLUMN embedding vector(1536);

-- インデックス再作成
CREATE INDEX idx_documents_embedding
  ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### Phase 2: 依存関係更新
```bash
cd sync-worker
pnpm remove @google/generative-ai
pnpm add openai
```

### Phase 3: 新クライアント実装（TDD）
1. `openaiClient.test.ts` を作成（テスト先行）
2. `openaiClient.ts` を実装
3. フィクスチャファイルをリネーム・更新（1536次元）

### Phase 4: 利用箇所の更新
1. `sync-qiita.ts` のインポート変更
2. `backend/utils/openaiClient.ts` にリネーム・修正
3. `searchService.ts` のインポート変更

### Phase 5: 環境変数更新
1. `.env.example` ファイル群を更新

### Phase 6: テスト実行・確認
```bash
pnpm test          # sync-worker
cd ../backend && pnpm test  # backend
```

### Phase 7: エンベディング再生成
既存ドキュメントのエンベディングを再生成（sync処理の再実行）

### Phase 8: クリーンアップ
1. 旧ファイル削除
2. CLAUDE.md更新

---

## 検証方法

1. **単体テスト**: `pnpm test` ですべてのテストがパス
2. **Lintチェック**: `pnpm lint` でエラーなし
3. **型チェック**: `pnpm typecheck` でエラーなし
4. **DB確認**: `SELECT embedding FROM documents LIMIT 1;` で1536次元を確認
5. **モック動作確認**: `USE_MOCK_EMBEDDING=true` でエンベディング生成
6. **検索テスト**: セマンティック検索の動作確認

---

## リスクと対策

| リスク | 対策 |
|-------|------|
| 既存エンベディングの無効化 | マイグレーション後にsync処理を再実行 |
| 検索精度の変化 | 移行後にテスト検索で品質確認 |
| APIコスト | 使用量モニタリングを推奨 |

---

## 備考

- OpenAI `text-embedding-3-small` のデフォルト次元数は1536
- `dimensions` パラメータ不要（デフォルト値を使用）
- 料金: $0.02/1M tokens

---

実装は未着手。
