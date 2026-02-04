import { useStats } from '../hooks/useStats';

export function DocumentStats() {
  const { stats, isLoading, error } = useStats();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  /**
   * ISO8601形式の日時を人間が読みやすい形式に変換
   * @param isoString ISO8601形式の日時文字列
   * @returns 'YYYY/MM/DD HH:mm' 形式の日本語ロケール日時
   */
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * 最終更新日時の表示テキストを取得
   * データベースが空の場合はnullが返されるため、適切なメッセージを表示
   */
  const getLastUpdatedText = (): string => {
    return stats.lastUpdated ? formatDate(stats.lastUpdated) : 'データがありません';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">総ドキュメント数</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalDocuments}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">最終更新</h3>
          <p className="mt-2 text-lg font-semibold text-gray-700">
            {getLastUpdatedText()}
          </p>
        </div>
      </div>
    </div>
  );
}
