-- ============================================
-- マイグレーション: 002_add_users_and_sessions
-- ============================================
-- 目的: ユーザー認証とセッション管理テーブルを追加
-- 適用方法: psql $DATABASE_URL -f database/migrations/002_add_users_and_sessions.sql
--

-- データベース接続
\c groovy_knowledge_search;

-- ============================================
-- テーブル: users
-- ============================================
-- ユーザー情報とQiita Teamトークン（暗号化）を保存
--
CREATE TABLE IF NOT EXISTS users (
  -- 主キー
  id SERIAL PRIMARY KEY,

  -- ユーザー情報
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,

  -- Qiita Teamトークン（AES-256-GCM暗号化）
  -- 形式: <iv>:<authTag>:<encryptedData> (すべてHEX文字列)
  encrypted_qiita_token TEXT NOT NULL,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- テーブル: session
-- ============================================
-- express-session + connect-pg-simple用のセッションストレージ
-- 注意: テーブル名は "session" 固定（connect-pg-simpleの仕様）
--
CREATE TABLE IF NOT EXISTS "session" (
  -- セッションID（主キー）
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,

  -- セッションデータ（JSON形式）
  sess JSON NOT NULL,

  -- セッション有効期限
  expire TIMESTAMP(6) NOT NULL
);

-- ============================================
-- インデックス: セッションテーブル
-- ============================================
-- 有効期限でのフィルタリング用（期限切れセッションのクリーンアップ）
CREATE INDEX IF NOT EXISTS "IDX_session_expire"
  ON "session" (expire);

-- ============================================
-- トリガー: updated_atの自動更新
-- ============================================
-- usersテーブルのupdated_atを自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- usersテーブルにトリガーを設定
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 002 applied successfully';
  RAISE NOTICE 'Tables: users, session';
  RAISE NOTICE 'Indexes: IDX_session_expire';
  RAISE NOTICE 'Triggers: update_users_updated_at';
END $$;
