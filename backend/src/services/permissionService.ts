import { getDecryptedQiitaToken } from './authService';
import type { SearchResult } from './searchService';

// QiitaClientの型定義
interface QiitaClientInterface {
  checkBatchAccess(articleIds: string[]): Promise<Set<string>>;
}

/**
 * ユーザーの権限に基づいて検索結果をフィルタリング
 *
 * @param userId - ユーザーID
 * @param searchResults - 検索結果の配列
 * @returns 権限のある記事のみをフィルタリングした配列
 * @throws {Error} ユーザーが見つからない場合
 */
export async function filterByPermissions(
  userId: number,
  searchResults: SearchResult[]
): Promise<SearchResult[]> {
  try {
    // 1. ユーザーのトークンを取得して復号化
    const token = await getDecryptedQiitaToken(userId);

    if (!token) {
      throw new Error('User not found or token not available');
    }

    // 2. 検索結果が空の場合は空配列を返す
    if (searchResults.length === 0) {
      return [];
    }

    // 3. QiitaClientを動的にインポートして作成
    // TypeScriptのrootDir制約を回避するため、ランタイムで動的インポート
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qiitaClientModule = await import('../../../sync-worker/src/clients/qiitaClient') as any;
    const qiitaClient: QiitaClientInterface = new qiitaClientModule.QiitaClient(token);

    // 4. 記事IDの配列を抽出
    const articleIds = searchResults.map(result => result.id);

    // 5. 並列で権限チェック
    const accessibleIds = await qiitaClient.checkBatchAccess(articleIds);

    // 6. アクセス可能な記事のみをフィルタリング
    const filteredResults = searchResults.filter(result =>
      accessibleIds.has(result.id)
    );

    return filteredResults;
  } catch (error) {
    // エラー時はログ出力して空配列を返す（安全側に倒す）
    console.error('Permission filtering error:', error);

    // ユーザーが見つからない場合は明示的にエラーをスロー
    if (error instanceof Error && error.message.includes('User not found')) {
      throw error;
    }

    // その他のエラー（APIエラー等）は空配列を返す
    return [];
  }
}
