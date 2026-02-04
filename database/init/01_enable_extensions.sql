-- ============================================
-- PostgreSQL 初期化スクリプト
-- ============================================
--
-- このファイルはコンテナ初回起動時に自動的に実行されます
--

-- データベース接続
\c groovy_knowledge_search;

-- pg_bigm拡張を有効化（日本語全文検索用）
-- 注意: pg_bigm拡張はPostgreSQL標準イメージに含まれていないため、
--       現時点ではコメントアウトしています。
--       将来的にpg_bigmが必要になった場合は、カスタムDockerイメージを作成します。

-- CREATE EXTENSION IF NOT EXISTS pg_bigm;

-- 現時点では標準のPostgreSQLの全文検索機能を使用します
-- PostgreSQL標準の全文検索機能を有効化
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- タイムゾーン設定
SET timezone = 'Asia/Tokyo';

-- 初期化完了メッセージ
DO $$
BEGIN
  RAISE NOTICE 'Database initialization completed successfully';
END $$;
