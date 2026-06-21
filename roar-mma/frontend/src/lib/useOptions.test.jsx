import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOptions, optionLabel, OPTION_FALLBACKS } from './useOptions';
import api from './api';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
  },
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('optionLabel', () => {
  it('converts underscored string to title case', () => {
    expect(optionLabel('bibra_lake')).toBe('Bibra Lake');
  });

  it('returns empty string for null', () => {
    expect(optionLabel(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(optionLabel(undefined)).toBe('');
  });

  it('handles single word', () => {
    expect(optionLabel('beginner')).toBe('Beginner');
  });

  it('handles empty string', () => {
    expect(optionLabel('')).toBe('');
  });
});

describe('useOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows fallbacks as placeholder data while loading', () => {
    api.get.mockResolvedValue({ data: { locations: ['perth'] } });
    const { result } = renderHook(() => useOptions(), { wrapper: createWrapper() });
    expect(result.current.data).toEqual(OPTION_FALLBACKS);
  });

  it('returns API response data after fetch succeeds', async () => {
    const apiResponse = { locations: ['perth', 'mandurah'], plans: ['monthly'] };
    api.get.mockResolvedValue({ data: apiResponse });
    const { result } = renderHook(() => useOptions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(result.current.data).toEqual(apiResponse);
  });

  it('falls back to OPTION_FALLBACKS when API call fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useOptions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(result.current.data).toEqual(OPTION_FALLBACKS);
  });

  it('calls /api/settings/options endpoint', () => {
    api.get.mockResolvedValue({ data: {} });
    renderHook(() => useOptions(), { wrapper: createWrapper() });
    expect(api.get).toHaveBeenCalledWith('/api/settings/options');
  });

  it('returns isSuccess true once fetch completes', async () => {
    api.get.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useOptions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(result.current.isSuccess).toBe(true);
  });
});
