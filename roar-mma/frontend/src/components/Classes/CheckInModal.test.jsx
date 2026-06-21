import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import CheckInModal from './CheckInModal';
import api from '../../lib/api';

const mockClassInstance = {
  id: 1,
  class_name: 'BJJ Fundamentals',
  start_time: '09:00',
  end_time: '10:00',
  capacity: 20,
};

const mockAttendees = [
  { id: 1, member_id: 10, member_name: 'John Doe', checked_in_at: '2025-06-21T09:05:00Z' },
  { id: 2, member_id: 11, member_name: 'Jane Smith', checked_in_at: '2025-06-21T09:10:00Z' },
];

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn().mockImplementation((url) => {
      if (url.includes('/attendees')) return Promise.resolve({ data: [] });
      if (url.includes('/members')) return Promise.resolve({ data: { members: [] } });
      return Promise.resolve({ data: {} });
    }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotifications: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../Modal', () => ({
  default: ({ isOpen, children, title }) => isOpen ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
  ConfirmDialog: ({ isOpen, onConfirm, onClose, title }) => isOpen ? (
    <div data-testid="confirm-dialog">
      <p>{title}</p>
      <button onClick={onConfirm} data-testid="confirm-remove">Confirm Remove</button>
      <button onClick={onClose} data-testid="cancel-remove">Cancel</button>
    </div>
  ) : null,
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <CheckInModal isOpen={true} onClose={vi.fn()} classInstance={mockClassInstance} {...props} />
    </QueryClientProvider>
  );
}

describe('CheckInModal', () => {
  beforeEach(() => { vi.clearAllMocks(); queryClient.clear(); });

  it('renders modal when open', () => {
    renderModal();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('returns null when no classInstance', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <CheckInModal isOpen={true} onClose={vi.fn()} classInstance={null} />
      </QueryClientProvider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('displays class info', () => {
    renderModal();
    expect(screen.getByText('BJJ Fundamentals')).toBeInTheDocument();
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
    expect(screen.getByText(/Capacity: 0\/20/)).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderModal();
    expect(screen.getByLabelText('Search members')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by name, email, or phone/i)).toBeInTheDocument();
  });

  it('renders attendees section', () => {
    renderModal();
    expect(screen.getByText(/Current Attendees/)).toBeInTheDocument();
  });

  it('shows no attendees yet when empty', () => {
    renderModal();
    expect(screen.getByText('No attendees yet')).toBeInTheDocument();
  });

  it('displays attendees when present', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/attendees')) return Promise.resolve({ data: mockAttendees });
      return Promise.resolve({ data: { members: [] } });
    });
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows close button', () => {
    renderModal();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('calls onClose on close', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('searches members when typing', async () => {
    api.get.mockImplementation((url, config) => {
      if (url.includes('/members')) return Promise.resolve({ data: { members: [{ id: 1, first_name: 'Mike', last_name: 'Tyson', email: 'mike@test.com' }] } });
      if (url.includes('/attendees')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    renderModal();
    const searchInput = screen.getByLabelText('Search members');
    fireEvent.change(searchInput, { target: { value: 'Mike' } });
    await waitFor(() => {
      expect(screen.getByText((t) => t.includes('Mike') && t.includes('Tyson'))).toBeInTheDocument();
    });
  });

  it('shows no members found for empty search results', async () => {
    renderModal();
    const searchInput = screen.getByLabelText('Search members');
    fireEvent.change(searchInput, { target: { value: 'ZZZ' } });
    await waitFor(() => {
      expect(screen.getByText('No members found')).toBeInTheDocument();
    });
  });

  it('selects a member from search results', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/members')) return Promise.resolve({ data: { members: [{ id: 1, first_name: 'Mike', last_name: 'Tyson', email: 'mike@test.com' }] } });
      if (url.includes('/attendees')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    renderModal();
    const searchInput = screen.getByLabelText('Search members');
    fireEvent.change(searchInput, { target: { value: 'Mike' } });
    await waitFor(() => {
      expect(screen.getByText((t) => t.includes('Mike') && t.includes('Tyson'))).toBeInTheDocument();
    });
    const memberRow = screen.getByText((t) => t.includes('Mike') && t.includes('Tyson')).closest('[role="button"]');
    fireEvent.click(memberRow);
    expect(screen.getByText(/Selected \(1\)/)).toBeInTheDocument();
  });

  it('deselects a member from selected list', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/members')) return Promise.resolve({ data: { members: [{ id: 1, first_name: 'Mike', last_name: 'Tyson', email: 'mike@test.com' }] } });
      if (url.includes('/attendees')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    renderModal();
    const searchInput = screen.getByLabelText('Search members');
    fireEvent.change(searchInput, { target: { value: 'Mike' } });
    await waitFor(() => {
      expect(screen.getByText((t) => t.includes('Mike') && t.includes('Tyson'))).toBeInTheDocument();
    });
    const memberRow = screen.getByText((t) => t.includes('Mike') && t.includes('Tyson')).closest('[role="button"]');
    fireEvent.click(memberRow);
    const removeBtn = screen.getByLabelText(/Remove Mike/i);
    fireEvent.click(removeBtn);
    expect(screen.queryByText(/Selected \(1\)/)).not.toBeInTheDocument();
  });

  it('calls check-in API on check in button', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/members')) return Promise.resolve({ data: { members: [{ id: 1, first_name: 'Mike', last_name: 'Tyson', email: 'mike@test.com' }] } });
      if (url.includes('/attendees')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    renderModal();
    const searchInput = screen.getByLabelText('Search members');
    fireEvent.change(searchInput, { target: { value: 'Mike' } });
    await waitFor(() => { expect(screen.getByText((t) => t.includes('Mike') && t.includes('Tyson'))).toBeInTheDocument(); });
    const memberRow = screen.getByText((t) => t.includes('Mike') && t.includes('Tyson')).closest('[role="button"]');
    fireEvent.click(memberRow);
    fireEvent.click(screen.getByText(/Check In 1 Member/));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/classes/1/check-in', { member_ids: [1] });
    });
  });

  it('shows already checked-in label', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/members')) return Promise.resolve({ data: { members: [{ id: 10, first_name: 'John', last_name: 'Doe', email: 'john@test.com' }] } });
      if (url.includes('/attendees')) return Promise.resolve({ data: mockAttendees });
      return Promise.resolve({ data: {} });
    });
    renderModal();
    const searchInput = screen.getByLabelText('Search members');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    await waitFor(() => {
      const checkedInLabel = screen.getByLabelText('Checked in');
      expect(checkedInLabel).toBeInTheDocument();
    });
  });

  it('shows remove button for each attendee', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/attendees')) return Promise.resolve({ data: mockAttendees });
      return Promise.resolve({ data: { members: [] } });
    });
    renderModal();
    await waitFor(() => {
      const removeBtns = screen.getAllByText('Remove');
      expect(removeBtns.length).toBe(2);
    });
  });
});
