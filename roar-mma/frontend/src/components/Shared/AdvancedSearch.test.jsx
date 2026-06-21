import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../hooks/useCustomHooks', () => ({
  useDebounce: (val) => val,
}));

import AdvancedSearch from './AdvancedSearch';

describe('AdvancedSearch', () => {
  it('renders search input', () => {
    render(<AdvancedSearch onSearch={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('calls onSearch when query changes', () => {
    const onSearch = vi.fn();
    render(<AdvancedSearch onSearch={onSearch} />);
    // First call on mount with empty state
    expect(onSearch).toHaveBeenCalledWith({ query: '', filters: {} });
  });

  it('renders with custom placeholder', () => {
    render(<AdvancedSearch onSearch={vi.fn()} placeholder="Find members..." />);
    expect(screen.getByPlaceholderText('Find members...')).toBeInTheDocument();
  });

  it('shows Filters button when showFilters is true and filters exist', () => {
    const filters = [{ key: 'status', label: 'Status', type: 'select', options: [] }];
    render(<AdvancedSearch onSearch={vi.fn()} filters={filters} />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('does not show Filters button when showFilters is false', () => {
    render(<AdvancedSearch onSearch={vi.fn()} showFilters={false} />);
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });
});
