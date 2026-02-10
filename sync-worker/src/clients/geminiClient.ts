import { GoogleGenerativeAI } from '@google/generative-ai';

// レート制限対策: リクエスト間の待機時間（ミリ秒）
const RATE_LIMIT_DELAY_MS = 4000;

// リトライ設定
const MAX_RETRY_COUNT = 3;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * 指定ミリ秒待機するユーティリティ関数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 指数バックオフによるリトライ待機時間を計算する
 * @param retryCount - 現在のリトライ回数（0始まり）
 * @returns 待機時間（ミリ秒）
 */
function calculateBackoffDelay(retryCount: number): number {
  return RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
}

/**
 * Gemini APIを使用してテキストのエンベディングを生成する
 *
 * @param text - エンベディングを生成するテキスト
 * @returns 768次元のエンベディングベクトル
 * @throws テキストが空の場合、またはAPI呼び出しが最大リトライ回数を超えた場合
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // 入力バリデーション
  if (!text || text.trim().length === 0) {
    throw new Error('テキストが空です');
  }

  // モックモードの場合はフィクスチャデータを返す
  if (process.env.USE_MOCK_GEMINI === 'true') {
    const fixtureData = await import('../__fixtures__/gemini-embeddings.json');
    return fixtureData.default.embedding as number[];
  }

  // 実際のGemini API呼び出し
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  let lastError: Error | undefined;

  for (let retryCount = 0; retryCount < MAX_RETRY_COUNT; retryCount++) {
    try {
      // レート制限対策: 最初のリクエスト以外は待機
      if (retryCount > 0) {
        const backoffDelay = calculateBackoffDelay(retryCount - 1);
        await sleep(backoffDelay);
      }

      const result = await model.embedContent(text);
      const embedding = result.embedding.values;

      // レート制限対策: 次のリクエストのために待機
      await sleep(RATE_LIMIT_DELAY_MS);

      return embedding;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `Gemini API エラー (リトライ ${retryCount + 1}/${MAX_RETRY_COUNT}):`,
        lastError.message
      );

      // 最後のリトライの場合はループを抜ける
      if (retryCount === MAX_RETRY_COUNT - 1) {
        break;
      }
    }
  }

  throw lastError ?? new Error('Gemini API の呼び出しに失敗しました');
}
