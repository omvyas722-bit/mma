import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DataTable from './DataTable';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
];

const data = [
  { id: 1, name: 'Alice', email: 'alice@test.com', role: 'admin' },
  { id: 2, name: 'Bob', email: 'bob@test.com', role: 'user' },
  { id: 3, name: 'Charlie', email: 'charlie@test.com', role: 'user' },
];

describe('DataTable Component', () => {
  it('renders column headers', () => {
    render(<DataTable data={data} columns={columns} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<DataTable data={data} columns={columns} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(<DataTable data={[]} columns={columns} emptyMessage="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('filters rows by search query', () => {
    render(<DataTable data={data} columns={columns} paginated={false} />);
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('shows clear button when search has text', () => {
    render(<DataTable data={data} columns={columns} paginated={false} />);
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });
    expect(screen.getByText('Clear')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear'));
    expect(searchInput).toHaveValue('');
  });

  it('sorts column ascending on first click', () => {
    render(<DataTable data={data} columns={columns} paginated={false} />);
    fireEvent.click(screen.getByText('Name'));
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Alice');
    expect(rows[2]).toHaveTextContent('Bob');
    expect(rows[3]).toHaveTextContent('Charlie');
  });

  it('sorts column descending on second click', () => {
    render(<DataTable data={data} columns={columns} paginated={false} />);
    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByText('Name'));
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Charlie');
    expect(rows[3]).toHaveTextContent('Alice');
  });

  it('calls onRowClick when row clicked', () => {
    const onRowClick = vi.fn();
    render(<DataTable data={data} columns={columns} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('paginates data when paginated is true', () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@test.com`,
      role: 'user',
    }));
    render(<DataTable data={manyRows} columns={columns} pageSize={10} />);
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 10')).toBeInTheDocument();
    expect(screen.queryByText('User 11')).not.toBeInTheDocument();
  });

  it('navigates pages with pagination buttons', () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@test.com`,
      role: 'user',
    }));
    render(<DataTable data={manyRows} columns={columns} pageSize={10} />);
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('User 11')).toBeInTheDocument();
    expect(screen.queryByText('User 1')).not.toBeInTheDocument();
  });

  it('disables Previous on first page', () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `u${i + 1}@test.com`,
      role: 'user',
    }));
    render(<DataTable data={manyRows} columns={columns} pageSize={10} />);
    expect(screen.getByText('Previous')).toBeDisabled();
  });

  it('renders custom column render function', () => {
    const colsWithRender = [
      { key: 'name', label: 'Name' },
      {
        key: 'role',
        label: 'Role',
        render: (value) => <span data-testid="role-badge">{value.toUpperCase()}</span>,
      },
    ];
    render(<DataTable data={data} columns={colsWithRender} paginated={false} />);
    const badges = screen.getAllByTestId('role-badge');
    expect(badges).toHaveLength(3);
    expect(badges[0]).toHaveTextContent('ADMIN');
  });
});
