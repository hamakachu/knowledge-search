#!/usr/bin/env ts-node
/**
 * テストユーザー作成スクリプト
 *
 * 使用方法:
 * 1. backend/.env にENCRYPTION_KEYを設定
 * 2. このスクリプトを実行してSQL文を生成
 * 3. 生成されたSQLをデータベースで実行
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// backend/.envを読み込む
config({ path: resolve(__dirname, '../backend/.env') });

// encryption.tsから暗号化関数をインポート
import { encrypt } from '../backend/src/utils/encryption';

/**
 * テストユーザー情報
 */
const testUsers = [
  {
    username: 'test_user',
    email: 'test@example.com',
    qiitaToken: 'test_qiita_token_dummy_value_for_development'
  },
  {
    username: 'demo_user',
    email: 'demo@example.com',
    qiitaToken: 'demo_qiita_token_dummy_value_for_development'
  }
];

/**
 * テストユーザーを作成するSQL文を生成
 */
function generateInsertSQL() {
  console.log('-- ============================================');
  console.log('-- テストユーザー作成SQL');
  console.log('-- ============================================');
  console.log('-- 生成日時:', new Date().toISOString());
  console.log('-- ');
  console.log('-- このSQLを実行してテストユーザーを作成してください:');
  console.log('--   docker exec -i groovy-knowledge-search-db psql -U postgres -d groovy_knowledge_search < database/test-users.sql');
  console.log('-- ');
  console.log('-- または:');
  console.log('--   psql $DATABASE_URL -f database/test-users.sql');
  console.log('-- ============================================\n');

  console.log('-- データベース接続');
  console.log('\\c groovy_knowledge_search;\n');

  testUsers.forEach((user, index) => {
    const encryptedToken = encrypt(user.qiitaToken);

    console.log(`-- テストユーザー ${index + 1}: ${user.username}`);
    console.log(`INSERT INTO users (username, email, encrypted_qiita_token)`);
    console.log(`VALUES ('${user.username}', '${user.email}', '${encryptedToken}')`);
    console.log(`ON CONFLICT (username) DO UPDATE`);
    console.log(`  SET email = EXCLUDED.email,`);
    console.log(`      encrypted_qiita_token = EXCLUDED.encrypted_qiita_token,`);
    console.log(`      updated_at = CURRENT_TIMESTAMP;`);
    console.log();
  });

  console.log('-- 作成されたユーザーを確認');
  console.log('SELECT id, username, email, created_at, updated_at FROM users;');
  console.log();
  console.log('-- ============================================');
  console.log('-- テストユーザー作成完了');
  console.log('-- ============================================');
  console.log('-- ');
  console.log('-- ログイン情報:');
  testUsers.forEach((user, index) => {
    console.log(`-- ${index + 1}. username: ${user.username}, email: ${user.email}`);
  });
  console.log('-- ');
  console.log('-- Qiitaトークン: ダミー値（実際のQiita Team APIは呼び出せません）');
  console.log('-- ============================================');
}

try {
  generateInsertSQL();
} catch (error) {
  console.error('エラーが発生しました:');
  console.error(error);
  console.error('\nENCRYPTION_KEYが設定されているか確認してください:');
  console.error('  cat backend/.env | grep ENCRYPTION_KEY');
  process.exit(1);
}
