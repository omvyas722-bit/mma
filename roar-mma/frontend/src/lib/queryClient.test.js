import { describe, it, expect } from 'vitest';
import { queryClient } from './queryClient';

describe('queryClient', () => {
  it('has defaultOptions with queries config', () => {
    expect(queryClient).toBeDefined();
    expect(queryClient.getDefaultOptions()).toBeDefined();
    const opts = queryClient.getDefaultOptions();
    expect(opts.queries).toBeDefined();
    expect(opts.queries.staleTime).toBe(30000);
    expect(opts.queries.cacheTime).toBe(300000);
    expect(opts.queries.refetchOnWindowFocus).toBe(false);
    expect(opts.queries.retry).toBe(1);
  });

  it('has defaultOptions with mutations config', () => {
    const opts = queryClient.getDefaultOptions();
    expect(opts.mutations).toBeDefined();
    expect(opts.mutations.retry).toBe(0);
  });

  it('does not have unexpected defaultOptions keys', () => {
    const opts = queryClient.getDefaultOptions();
    expect(Object.keys(opts).sort()).toEqual(['mutations', 'queries']);
  });
});
