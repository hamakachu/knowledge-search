import { useState, useEffect } from 'react';
import type { Stats } from '../types/stats';

interface UseStatsResult {
  stats: Stats | null;
  isLoading: boolean;
  error: string | null;
}

export function useStats(): UseStatsResult {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');

        if (!response.ok) {
          setError('統計情報の取得に失敗しました');
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setStats(data);
        setIsLoading(false);
      } catch (err) {
        setError('統計情報の取得に失敗しました');
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, isLoading, error };
}
