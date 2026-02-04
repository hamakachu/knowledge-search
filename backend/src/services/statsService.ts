export interface DocumentStats {
  totalDocuments: number;
  lastUpdated: string;
}

export async function getDocumentStats(): Promise<DocumentStats> {
  // TODO: データベース接続後、実際の統計情報を取得する
  // 現時点ではモックデータを返す
  return {
    totalDocuments: 100,
    lastUpdated: new Date().toISOString(),
  };
}
