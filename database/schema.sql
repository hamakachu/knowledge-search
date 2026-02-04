-- ============================================
-- データベーススキーマ定義
-- ============================================
--
-- このファイルは以下のコマンドで適用します:
--   psql $DATABASE_URL -f database/schema.sql
--

-- データベース接続
\c groovy_knowledge_search;

-- ============================================
-- テーブル: documents
-- ============================================
-- 社内ドキュメント（Qiita Team / Google Drive / OneDrive）を保存
--
CREATE TABLE IF NOT EXISTS documents (
  -- 主キー（ソース元のID）
  id VARCHAR(255) PRIMARY KEY,

  -- 記事情報
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT NOT NULL,
  author VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'qiita_team', 'google_drive', 'onedrive'

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- 重複防止（同じソースから同じURLの記事は1つのみ）
  CONSTRAINT unique_source_url UNIQUE(source, url)
);

-- ============================================
-- インデックス: 全文検索用（pg_trgm使用）
-- ============================================
-- タイトル検索用GINインデックス
CREATE INDEX IF NOT EXISTS idx_documents_title_trgm
  ON documents USING gin (title gin_trgm_ops);

-- 本文検索用GINインデックス
CREATE INDEX IF NOT EXISTS idx_documents_body_trgm
  ON documents USING gin (body gin_trgm_ops);

-- ============================================
-- インデックス: パフォーマンス最適化用
-- ============================================
-- ソース別フィルタリング用
CREATE INDEX IF NOT EXISTS idx_documents_source
  ON documents (source);

-- 更新日時降順ソート用
CREATE INDEX IF NOT EXISTS idx_documents_updated_at
  ON documents (updated_at DESC);

-- ============================================
-- 完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Schema created successfully';
  RAISE NOTICE 'Tables: documents';
  RAISE NOTICE 'Indexes: title_trgm, body_trgm, source, updated_at';
END $$;
