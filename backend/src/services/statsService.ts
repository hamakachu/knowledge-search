import { dbClient } from '../db/client';

export interface DocumentStats {
  totalDocuments: number;
  lastUpdated: string | null;
}

interface CountResult {
  count: string;
}

interface LastUpdatedResult {
  max: Date | null;
}

/**
 * ドキュメント統計情報を取得する
 * @returns DocumentStats 総ドキュメント数と最終更新日時
 * @throws Error データベース接続エラーまたはクエリ実行エラー
 */
export async function getDocumentStats(): Promise<DocumentStats> {
  try {
    // 総ドキュメント数を取得
    const countResult = await dbClient.query<CountResult>(
      'SELECT COUNT(*) FROM documents'
    );
    const totalDocuments = parseInt(countResult.rows[0].count, 10);

    // 最終更新日時を取得（MAX(updated_at)）
    const lastUpdatedResult = await dbClient.query<LastUpdatedResult>(
      'SELECT MAX(updated_at) FROM documents'
    );
    const lastUpdatedDate = lastUpdatedResult.rows[0].max;
    const lastUpdated = lastUpdatedDate ? lastUpdatedDate.toISOString() : null;

    return {
      totalDocuments,
      lastUpdated,
    };
  } catch (error) {
    // データベースエラーをログに記録
    console.error('Failed to fetch document stats:', error);
    throw new Error('Failed to fetch document stats from database');
  }
}
