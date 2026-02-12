/**
 * Gemini APIクライアント（バックエンド用）
 *
 * sync-workerのgeminiClientをbackendから利用するためのラッパー。
 * エンベディング生成に使用する。
 * USE_MOCK_GEMINI=true でモックデータを返す（テスト・開発環境用）。
 */

// 動的インポートにより、sync-workerのgeminiClientを使用する
// TypeScriptのrootDir制約を回避するためランタイムでインポートする

/**
 * テキストのエンベディングを生成する
 *
 * @param text - エンベディングを生成するテキスト
 * @returns 768次元のエンベディングベクトル
 * @throws テキストが空の場合、またはAPI呼び出しが失敗した場合
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // 入力バリデーション
  if (!text || text.trim().length === 0) {
    throw new Error('テキストが空です');
  }

  // sync-workerのgeminiClientを動的インポートして使用する
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geminiClientModule = await import('../../../sync-worker/src/clients/geminiClient') as any;
  return geminiClientModule.generateEmbedding(text);
}
