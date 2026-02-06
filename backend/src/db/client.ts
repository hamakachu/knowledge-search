import pg from 'pg';

const { Pool } = pg;

export const dbClient = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * データベースクエリを実行
 * @param text - SQLクエリ文字列
 * @param params - クエリパラメータ
 * @returns クエリ結果
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return dbClient.query<T>(text, params);
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = await dbClient.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}
