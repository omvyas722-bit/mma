import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import MemberCSVImportModal from './MemberCSVImportModal';
import api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { imported: 2, errors: [] } }),
  },
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotifications: vi.fn(() => ({ success: vi.fn(), error: vi.fn() })),
}));

import { useNotifications } from '../../contexts/NotificationContext';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemberCSVImportModal isOpen={true} onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

function uploadFile(content) {
  const file = new File([content], 'test.csv', { type: 'text/csv' });
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file] } });
}

describe('MemberCSVImportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: { imported: 2, errors: [] } });
    useNotifications.mockReturnValue({ success: vi.fn(), error: vi.fn() });
  });

  it('renders upload step when open', () => {
    renderModal();
    expect(screen.getByText('Import Members from CSV')).toBeInTheDocument();
    expect(screen.getByText(/Upload a CSV file/i)).toBeInTheDocument();
  });

  it('returns null when not open', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemberCSVImportModal isOpen={false} onClose={vi.fn()} />
      </QueryClientProvider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows required and optional field info', () => {
    renderModal();
    expect(screen.getByText(/Required: first_name, last_name/i)).toBeInTheDocument();
    expect(screen.getByText(/Optional: email, phone, location/i)).toBeInTheDocument();
  });

  it('has a hidden file input', () => {
    renderModal();
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.className).toContain('hidden');
  });

  it('accepts csv, tsv, txt files', () => {
    renderModal();
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('accept', '.csv,.tsv,.txt');
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const backdrop = document.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when dialog content clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const dialog = document.querySelector('[role="dialog"]');
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('parses CSV and shows mapping step', async () => {
    renderModal();
    uploadFile('first_name,last_name,email\nJohn,Doe,john@test.com\nJane,Smith,jane@test.com');
    await waitFor(() => {
      expect(screen.getByText('CSV Column')).toBeInTheDocument();
      expect(screen.getByText('Maps To')).toBeInTheDocument();
    });
  });

  it('shows error for CSV with only header row', async () => {
    renderModal();
    uploadFile('first_name,last_name,email');
    await waitFor(() => {
      const { error } = useNotifications();
      expect(error).toHaveBeenCalledWith('CSV must have a header row and at least one data row');
    });
  });

  it('displays preview in mapping step', async () => {
    renderModal();
    uploadFile('first_name,last_name,email\nJohn,Doe,john@test.com');
    await waitFor(() => {
      expect(screen.getByText('CSV Column')).toBeInTheDocument();
    });
  });

  it('allows back navigation from mapping to upload', async () => {
    renderModal();
    uploadFile('first_name,last_name,email\nJohn,Doe,john@test.com');
    await waitFor(() => expect(screen.getByText('CSV Column')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => {
      expect(screen.getByText(/Upload a CSV file/i)).toBeInTheDocument();
    });
  });

  it('calls import API on import button click', async () => {
    renderModal();
    uploadFile('mail,phone\njohn@test.com,0400123456');
    await waitFor(() => expect(screen.getByText('CSV Column')).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Import 1 Members/i));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/members/bulk/import', {
        members: [{ email: 'john@test.com', phone: '0400123456' }],
      });
    });
  });

  it('shows field mapping dropdowns for each column', async () => {
    renderModal();
    uploadFile('fname,lname,phone\nJohn,Doe,0400123456');
    await waitFor(() => {
      const mapSelects = screen.getAllByLabelText(/Map/i);
      expect(mapSelects.length).toBe(3);
    });
  });

  it('auto-maps known column headers', async () => {
    renderModal();
    uploadFile('mail,phone\njohn@test.com,0400123456');
    await waitFor(() => {
      expect(screen.getByLabelText('Map mail')).toBeInTheDocument();
      expect(screen.getByLabelText('Map phone')).toBeInTheDocument();
    });
  });

  it('disables import button while importing', async () => {
    api.post.mockImplementation(() => new Promise(() => {}));
    renderModal();
    uploadFile('first_name,last_name,email\nJohn,Doe,john@test.com');
    await waitFor(() => expect(screen.getByText('CSV Column')).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Import 1 Members/i));
    await waitFor(() => {
      expect(screen.getByText('Importing...')).toBeDisabled();
    });
  });
});
