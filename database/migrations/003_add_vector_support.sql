-- ============================================
-- マイグレーション: 003_add_vector_support
-- ============================================
-- 目的: pgvector拡張を有効化し、documentsテーブルにembeddingカラムを追加
-- 適用方法:
--   1. docker-compose.ymlでpgvector/pgvector:pg16イメージを使用
--   2. docker compose down && docker compose up -d
--   3. docker exec groovy-knowledge-search-db psql -U postgres -d groovy_knowledge_search -f /docker-entrypoint-initdb.d/../migrations/003_add_vector_support.sql
--
-- または、Dockerコンテナ内で直接実行:
--   docker exec -i groovy-knowledge-search-db psql -U postgres -d groovy_knowledge_search < database/migrations/003_add_vector_support.sql
--

-- データベース接続
\c groovy_knowledge_search;

-- ============================================
-- pgvector拡張の有効化
-- ============================================
-- pgvector拡張を有効化（ベクトル検索用）
-- 注意: pgvector/pgvector:pg16イメージが必要
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- documentsテーブルにembeddingカラムを追加
-- ============================================
-- embedding: 768次元のベクトル（OpenAI text-embedding-ada-002の次元数）
-- NULL許可（既存レコードへの影響を最小化）
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- ============================================
-- インデックス作成: ベクトル類似度検索用
-- ============================================
-- IVFFlat インデックス（Inverted File with Flat compression）
-- - vector_cosine_ops: コサイン類似度用の演算子クラス
-- - lists = 100: クラスタ数（データ量に応じて調整、推奨値: sqrt(rows)）
--
-- 注意: インデックス作成前にデータが存在する場合、時間がかかる可能性があります
CREATE INDEX IF NOT EXISTS idx_documents_embedding
  ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================
-- 完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 003 applied successfully';
  RAISE NOTICE 'Extension: vector';
  RAISE NOTICE 'Column added: documents.embedding (vector(768))';
  RAISE NOTICE 'Index created: idx_documents_embedding (ivfflat, vector_cosine_ops)';
END $$;
