import { dbClient } from '../src/db/client';

async function checkDatabase() {
  try {
    // Qiita Teamの記事数を確認
    const countResult = await dbClient.query(
      "SELECT COUNT(*) FROM documents WHERE source = 'qiita_team'"
    );
    console.log('Qiita Team articles count:', countResult.rows[0].count);

    // 記事のサンプルを表示
    const articlesResult = await dbClient.query(
      "SELECT id, title, author, source, updated_at FROM documents WHERE source = 'qiita_team' ORDER BY updated_at DESC LIMIT 5"
    );
    console.log('\nRecent articles:');
    articlesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.title}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Author: ${row.author}`);
      console.log(`   Updated: ${row.updated_at}`);
      console.log('');
    });

    await dbClient.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDatabase();
