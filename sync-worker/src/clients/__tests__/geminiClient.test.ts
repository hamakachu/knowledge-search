import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// @google/generative-ai をモジュールレベルでモック
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      embedContent: vi.fn().mockResolvedValue({
        embedding: { values: Array(768).fill(0.1) },
      }),
    }),
  })),
}));

import { generateEmbedding } from '../geminiClient';
import { GoogleGenerativeAI } from '@google/generative-ai';

describe('generateEmbedding', () => {
  let originalEnvMock: string | undefined;
  let originalEnvApiKey: string | undefined;

  beforeEach(() => {
    // 環境変数を保存
    originalEnvMock = process.env.USE_MOCK_GEMINI;
    originalEnvApiKey = process.env.GEMINI_API_KEY;
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env.USE_MOCK_GEMINI = originalEnvMock;
    process.env.GEMINI_API_KEY = originalEnvApiKey;
  });

  describe('USE_MOCK_GEMINI=true の場合', () => {
    it('generateEmbedding_USE_MOCK_GEMINI=trueでモックデータを返す', async () => {
      // Arrange
      process.env.USE_MOCK_GEMINI = 'true';
      const text = 'テストテキスト';

      // Act
      const embedding = await generateEmbedding(text);

      // Assert
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(768);
      embedding.forEach((value) => {
        expect(typeof value).toBe('number');
      });
    });

    it('generateEmbedding_USE_MOCK_GEMINI=trueで同じテキストに同じ結果を返す', async () => {
      // Arrange
      process.env.USE_MOCK_GEMINI = 'true';
      const text = '同じテキスト';

      // Act
      const embedding1 = await generateEmbedding(text);
      const embedding2 = await generateEmbedding(text);

      // Assert
      expect(embedding1).toEqual(embedding2);
    });

    it('generateEmbedding_正常なテキストでエンベディングを生成する', async () => {
      // Arrange
      process.env.USE_MOCK_GEMINI = 'true';
      const text = 'TypeScriptで型安全なAPIを設計する方法';

      // Act
      const embedding = await generateEmbedding(text);

      // Assert
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(768);
    });
  });

  describe('エラーハンドリング', () => {
    it('generateEmbedding_空文字列を渡すとエラーになる', async () => {
      // Arrange
      process.env.USE_MOCK_GEMINI = 'true';

      // Act & Assert
      await expect(generateEmbedding('')).rejects.toThrow('テキストが空です');
    });

    it('generateEmbedding_空白のみの文字列を渡すとエラーになる', async () => {
      // Arrange
      process.env.USE_MOCK_GEMINI = 'true';

      // Act & Assert
      await expect(generateEmbedding('   ')).rejects.toThrow('テキストが空です');
    });
  });

  describe('USE_MOCK_GEMINI=false の場合（実API処理）', () => {
    it('generateEmbedding_GEMINI_API_KEYが未設定の場合エラーになる', async () => {
      // Arrange
      process.env.USE_MOCK_GEMINI = 'false';
      delete process.env.GEMINI_API_KEY;

      // Act & Assert
      await expect(generateEmbedding('APIキーなしテスト')).rejects.toThrow(
        'GEMINI_API_KEY が設定されていません'
      );
    });

    it('generateEmbedding_APIエラー時にリトライする', async () => {
      // Arrange
      process.env.USE_MOCK_GEMINI = 'false';
      process.env.GEMINI_API_KEY = 'test_api_key';

      // モックを設定: 2回失敗してから成功する
      const mockEmbedContent = vi.fn()
        .mockRejectedValueOnce(new Error('API Error 1'))
        .mockRejectedValueOnce(new Error('API Error 2'))
        .mockResolvedValueOnce({ embedding: { values: Array(768).fill(0.1) } });

      const mockGetGenerativeModel = vi.fn().mockReturnValue({
        embedContent: mockEmbedContent,
      });

      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: mockGetGenerativeModel,
      }) as unknown as InstanceType<typeof GoogleGenerativeAI>);

      // フェイクタイマーを使用してリトライの待機を短縮
      vi.useFakeTimers();

      const embeddingPromise = generateEmbedding('リトライテスト');

      // タイマーを進める（指数バックオフ: 1秒 + 2秒 + レート制限: 4秒）
      await vi.runAllTimersAsync();

      const embedding = await embeddingPromise;

      // Assert
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(768);
      // 3回試行されたことを確認（2回失敗 + 1回成功）
      expect(mockEmbedContent).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('generateEmbedding_レート制限エラー時に待機してリトライする', async () => {
      // Arrange
      process.env.USE_MOCK_GEMINI = 'false';
      process.env.GEMINI_API_KEY = 'test_api_key';

      // レート制限エラーをシミュレート
      const rateLimitError = new Error('429 Too Many Requests');
      const mockEmbedContent = vi.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ embedding: { values: Array(768).fill(0.05) } });

      const mockGetGenerativeModel = vi.fn().mockReturnValue({
        embedContent: mockEmbedContent,
      });

      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: mockGetGenerativeModel,
      }) as unknown as InstanceType<typeof GoogleGenerativeAI>);

      vi.useFakeTimers();

      const embeddingPromise = generateEmbedding('レート制限テスト');
      await vi.runAllTimersAsync();
      const embedding = await embeddingPromise;

      // Assert
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(768);
      // 2回試行されたことを確認（1回失敗 + 1回成功）
      expect(mockEmbedContent).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('generateEmbedding_最大リトライ回数を超えるとエラーになる', async () => {
      // Arrange
      process.env.USE_MOCK_GEMINI = 'false';
      process.env.GEMINI_API_KEY = 'test_api_key';

      // MAX_RETRY_COUNT(3)回すべて失敗するモック（明示的にOnceを3回）
      const mockEmbedContent = vi.fn()
        .mockRejectedValueOnce(new Error('Persistent API Error'))
        .mockRejectedValueOnce(new Error('Persistent API Error'))
        .mockRejectedValueOnce(new Error('Persistent API Error'));

      const mockGetGenerativeModel = vi.fn().mockReturnValue({
        embedContent: mockEmbedContent,
      });

      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: mockGetGenerativeModel,
      }) as unknown as InstanceType<typeof GoogleGenerativeAI>);

      vi.useFakeTimers();

      // rejectsをPromiseとして先にセットし、タイマーを進めて解決させる
      const assertion = expect(generateEmbedding('エラーテスト')).rejects.toThrow('Persistent API Error');
      await vi.runAllTimersAsync();

      // Assert: 最大リトライ後にエラーがスローされる
      await assertion;
      // MAX_RETRY_COUNT(3)回試行されたことを確認
      expect(mockEmbedContent).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });
});
