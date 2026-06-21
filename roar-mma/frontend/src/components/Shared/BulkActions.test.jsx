import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BulkActions from './BulkActions';

vi.mock('./ConfirmDialog', () => ({
  default: ({ isOpen, title, message, onConfirm, onCancel }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <p>{message}</p>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

describe('BulkActions', () => {
  const actions = [
    { label: 'Delete', handler: vi.fn(), requiresConfirmation: true },
    { label: 'Export', handler: vi.fn() },
  ];

  it('renders count and actions when selectedItems has items', () => {
    render(<BulkActions selectedItems={[1, 2, 3]} actions={actions} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('does not render when selectedItems is empty', () => {
    const { container } = render(<BulkActions selectedItems={[]} actions={actions} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows confirm dialog for actions with requiresConfirmation', () => {
    render(<BulkActions selectedItems={[1, 2]} actions={actions} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });

  it('calls handler directly when no confirmation needed', () => {
    const handler = vi.fn();
    const onClear = vi.fn();
    render(<BulkActions selectedItems={[1, 2]} actions={[{ label: 'Export', handler }]} onClearSelection={onClear} />);
    fireEvent.click(screen.getByText('Export'));
    expect(handler).toHaveBeenCalledWith([1, 2]);
    expect(onClear).toHaveBeenCalled();
  });

  it('renders with custom item label', () => {
    render(<BulkActions selectedItems={[1]} actions={[]} itemLabel="members" />);
    expect(screen.getByText(/member/)).toBeInTheDocument();
  });
});
