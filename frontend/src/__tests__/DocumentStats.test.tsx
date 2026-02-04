import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DocumentStats } from '../components/DocumentStats';

// グローバルfetchのモック
global.fetch = vi.fn();

describe('DocumentStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('testMethod_初期表示時にローディング状態を表示する', () => {
    // fetchが解決しないPromiseを返すようにモック
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );

    render(<DocumentStats />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('testMethod_統計情報を取得して表示する', async () => {
    const mockStats = {
      totalDocuments: 42,
      lastUpdated: '2026-02-04T10:30:00.000Z'
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    render(<DocumentStats />);

    await waitFor(() => {
      expect(screen.getByText('総ドキュメント数')).toBeInTheDocument();
    });

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('最終更新')).toBeInTheDocument();
    // 日時フォーマットの検証（具体的なフォーマットは実装に依存）
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('testMethod_API呼び出しが失敗した場合にエラーメッセージを表示する', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    render(<DocumentStats />);

    await waitFor(() => {
      expect(screen.getByText(/統計情報の取得に失敗しました/)).toBeInTheDocument();
    });
  });

  it('testMethod_ネットワークエラーが発生した場合にエラーメッセージを表示する', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network error')
    );

    render(<DocumentStats />);

    await waitFor(() => {
      expect(screen.getByText(/統計情報の取得に失敗しました/)).toBeInTheDocument();
    });
  });

  it('testMethod_正しいAPIエンドポイントを呼び出す', async () => {
    const mockStats = {
      totalDocuments: 10,
      lastUpdated: '2026-02-04T00:00:00.000Z'
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    render(<DocumentStats />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/stats');
    });
  });

  it('testMethod_lastUpdatedがnullの場合にデータなしメッセージを表示する', async () => {
    const mockStats = {
      totalDocuments: 0,
      lastUpdated: null
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    render(<DocumentStats />);

    await waitFor(() => {
      expect(screen.getByText('総ドキュメント数')).toBeInTheDocument();
    });

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });
});
