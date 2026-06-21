import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Pagination, CompactPagination, PageSizeSelector, PaginationInfo } from './index';

describe('Pagination', () => {
  it('renders page numbers', () => {
    render(<Pagination totalPages={5} currentPage={1} onPageChange={() => {}} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onPageChange when page clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination totalPages={3} currentPage={1} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables previous on first page', () => {
    render(<Pagination totalPages={3} currentPage={1} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });

  it('disables next on last page', () => {
    render(<Pagination totalPages={3} currentPage={3} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('highlights current page', () => {
    render(<Pagination totalPages={3} currentPage={2} onPageChange={() => {}} />);
    expect(screen.getByText('2').closest('button')).toHaveAttribute('aria-current', 'page');
  });
});

describe('CompactPagination', () => {
  it('renders page number / total', () => {
    render(<CompactPagination totalPages={5} currentPage={1} onPageChange={() => {}} />);
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
  });
});

describe('PageSizeSelector', () => {
  it('renders and calls onChange', () => {
    const onChange = vi.fn();
    render(<PageSizeSelector pageSize={10} onPageSizeChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '20' } });
    expect(onChange).toHaveBeenCalledWith(20);
  });
});

describe('PaginationInfo', () => {
  it('renders showing info text', () => {
    render(<PaginationInfo currentPage={1} pageSize={20} totalItems={100} />);
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
  });

  it('renders total items count', () => {
    render(<PaginationInfo currentPage={1} pageSize={20} totalItems={100} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
