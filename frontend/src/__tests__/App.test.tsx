import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// グローバルfetchのモック
global.fetch = vi.fn();

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // fetchが解決しないPromiseを返すようにモック（ローディング状態を維持）
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );
  });

  it('should render title', () => {
    render(<App />);
    expect(screen.getByText('Groovy Knowledge Search')).toBeInTheDocument();
  });
});
