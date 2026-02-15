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
 * バッチupsertの結果型
 */
export interface BatchUpsertResult {
  /** 処理が成功したかどうか */
  success: boolean;
  /** upsertされたドキュメント数 */
  insertedCount: number;
  /** 失敗したドキュメント数 */
  failedCount: number;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
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

/**
 * 複数ドキュメントをトランザクションで一括upsertする
 * すべての操作が成功した場合のみコミット、一部でも失敗した場合はロールバック
 * @param documents upsertするドキュメントの配列
 * @returns バッチ処理の結果
 */
export async function batchUpsertDocuments(documents: DocumentInput[]): Promise<BatchUpsertResult> {
  // 空配列の場合は何もせずに成功を返す
  if (documents.length === 0) {
    return {
      success: true,
      insertedCount: 0,
      failedCount: 0,
    };
  }

  const client = await dbClient.connect();

  try {
    // トランザクション開始
    await client.query('BEGIN');

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

    // すべてのドキュメントを順次upsert
    for (const document of documents) {
      const embeddingValue = document.embedding != null
        ? `[${document.embedding.join(',')}]`
        : null;

      await client.query(upsertSQL, [
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
    }

    // すべて成功したらコミット
    await client.query('COMMIT');

    return {
      success: true,
      insertedCount: documents.length,
      failedCount: 0,
    };
  } catch (error) {
    // エラー発生時はロールバック
    await client.query('ROLLBACK');
    console.error('Batch upsert failed, rolled back:', error);

    return {
      success: false,
      insertedCount: 0,
      failedCount: documents.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    client.release();
  }
}
