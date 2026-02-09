import pg from 'pg';

const { Pool } = pg;

// DATABASE_URLをパースして個別のオプションに変換
function parseDatabaseUrl(url: string | undefined): pg.PoolConfig {
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432', 10),
      database: parsed.pathname.slice(1), // Remove leading slash
      user: parsed.username,
      password: parsed.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  } catch (error) {
    throw new Error(`Failed to parse DATABASE_URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const dbClient = new Pool(parseDatabaseUrl(process.env.DATABASE_URL));

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
