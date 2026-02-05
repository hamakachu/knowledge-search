import { dbClient } from './client';

/**
 * ドキュメントの入力データ型
 */
export interface DocumentInput {
  id: string;
  title: string;
  body: string;
  url: string;
  author: string;
  source: 'qiita_team' | 'google_drive' | 'onedrive';
  created_at: Date;
  updated_at: Date;
}

/**
 * 単一ドキュメントをupsertする
 * @param document upsertするドキュメント
 * @throws Error データベース操作が失敗した場合
 */
export async function upsertDocument(document: DocumentInput): Promise<void> {
  const upsertSQL = `
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
  `;

  try {
    await dbClient.query(upsertSQL, [
      document.id,
      document.title,
      document.body,
      document.url,
      document.author,
      document.source,
      document.created_at,
      document.updated_at,
    ]);
  } catch (error) {
    console.error('Failed to upsert document:', error);
    throw new Error(`Failed to upsert document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
