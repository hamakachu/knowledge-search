import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStats } from '../hooks/useStats';

// グローバルfetchのモック
global.fetch = vi.fn();

describe('useStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('testMethod_初期状態でローディング中である', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );

    const { result } = renderHook(() => useStats());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('testMethod_統計情報を正常に取得する', async () => {
    const mockStats = {
      totalDocuments: 100,
      lastUpdated: '2026-02-04T00:00:00.000Z'
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    const { result } = renderHook(() => useStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.error).toBeNull();
  });

  it('testMethod_APIエラー時にエラー状態をセットする', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const { result } = renderHook(() => useStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBe('統計情報の取得に失敗しました');
  });

  it('testMethod_ネットワークエラー時にエラー状態をセットする', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network error')
    );

    const { result } = renderHook(() => useStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBe('統計情報の取得に失敗しました');
  });

  it('testMethod_正しいエンドポイントを呼び出す', async () => {
    const mockStats = {
      totalDocuments: 50,
      lastUpdated: '2026-02-04T12:00:00.000Z'
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats
    });

    renderHook(() => useStats());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/stats');
    });
  });
});
