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
  /** エンベディングベクトル（オプション）。未指定の場合はNULLで保存 */
  embedding?: number[];
}

/**
 * 単一ドキュメントをupsertする
 * embeddingが指定された場合はpgvectorのvector型でDBに保存する。
 * embeddingが未指定の場合はNULLで保存する（後から一括更新可能）。
 * @param document upsertするドキュメント
 * @throws Error データベース操作が失敗した場合
 */
export async function upsertDocument(document: DocumentInput): Promise<void> {
  const upsertSQL = `
    INSERT INTO documents (id, title, body, url, author, source, created_at, updated_at, embedding)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
    ON CONFLICT (id)
    DO UPDATE SET
      title = EXCLUDED.title,
      body = EXCLUDED.body,
      url = EXCLUDED.url,
      author = EXCLUDED.author,
      updated_at = EXCLUDED.updated_at,
      embedding = EXCLUDED.embedding,
      synced_at = CURRENT_TIMESTAMP
  `;

  // embeddingがある場合はpgvector形式の文字列に変換する。ない場合はNULL。
  const embeddingValue = document.embedding != null
    ? `[${document.embedding.join(',')}]`
    : null;

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
      embeddingValue,
    ]);
  } catch (error) {
    console.error('Failed to upsert document:', error);
    throw new Error(`Failed to upsert document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
