import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import CSVImportModal from './CSVImportModal';
import api from '../../lib/api';
import { useNotifications } from '../../contexts/NotificationContext';

vi.mock('../../lib/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { imported: 2, errors: [] } }),
  },
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotifications: vi.fn(() => ({ success: vi.fn(), error: vi.fn() })),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <CSVImportModal isOpen={true} onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

function uploadFile(content) {
  const file = new File([content], 'test.csv', { type: 'text/csv' });
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file] } });
}

describe('CSVImportModal (Leads)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: { imported: 2, errors: [] } });
    useNotifications.mockReturnValue({ success: vi.fn(), error: vi.fn() });
  });

  it('renders upload step when open', () => {
    renderModal();
    expect(screen.getByText('Import Leads from CSV')).toBeInTheDocument();
    expect(screen.getByText(/Upload a CSV file/i)).toBeInTheDocument();
  });

  it('returns null when not open', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <CSVImportModal isOpen={false} onClose={vi.fn()} />
      </QueryClientProvider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows required and optional field info', () => {
    renderModal();
    expect(screen.getByText(/at least one of first_name, email, or phone/i)).toBeInTheDocument();
    expect(screen.getByText(/Optional: last_name, source, notes/i)).toBeInTheDocument();
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

  it('parses CSV and shows mapping step', async () => {
    renderModal();
    uploadFile('first_name,last_name,email\nJohn,Doe,john@test.com\nJane,Smith,jane@test.com');
    await waitFor(() => {
      expect(screen.getByText(/2 rows found/i)).toBeInTheDocument();
    });
  });

  it('shows error for CSV with only header row', async () => {
    const { error } = useNotifications();
    renderModal();
    uploadFile('first_name,last_name,email');
    await waitFor(() => {
      expect(error).toHaveBeenCalledWith('CSV must have a header row and at least one data row');
    });
  });

  it('shows preview in mapping step', async () => {
    renderModal();
    uploadFile('first_name,last_name,email\nJohn,Doe,john@test.com');
    await waitFor(() => {
      expect(screen.getByText(/Preview \(first row\)/i)).toBeInTheDocument();
    });
  });

  it('allows back navigation from mapping to upload', async () => {
    renderModal();
    uploadFile('first_name,last_name,email\nJohn,Doe,john@test.com');
    await waitFor(() => {
      fireEvent.click(screen.getByText('Back'));
      expect(screen.getByText(/Upload a CSV file/i)).toBeInTheDocument();
    });
  });

  it('calls import API on import button click', async () => {
    renderModal();
    uploadFile('fname,lname,mail\nJohn,Doe,john@test.com');
    await waitFor(() => {
      expect(screen.getByText(/rows found/i)).toBeInTheDocument();
    });
    const importBtn = screen.getByRole('button', { name: /Import 1 Leads/i });
    fireEvent.click(importBtn);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/leads/import', {
        leads: [{ first_name: 'John', last_name: 'Doe', email: 'john@test.com' }],
      });
    });
  });

  it('shows field mapping dropdowns', async () => {
    renderModal();
    uploadFile('fname,lname,phone\nJohn,Doe,0400123456');
    await waitFor(() => {
      const mapSelects = screen.getAllByLabelText(/Map/i);
      expect(mapSelects.length).toBe(3);
    });
  });

  it('disables import button while importing', async () => {
    api.post.mockImplementation(() => new Promise(() => {}));
    renderModal();
    uploadFile('first_name,last_name,email\nJohn,Doe,john@test.com');
    await waitFor(() => {
      expect(screen.getByText(/rows found/i)).toBeInTheDocument();
    });
    const importBtn = screen.getByRole('button', { name: /Import 1 Leads/i });
    fireEvent.click(importBtn);
    await waitFor(() => {
      expect(screen.getByText('Importing...')).toBeDisabled();
    });
  });

  it('handles parse error gracefully', async () => {
    const { error } = useNotifications();
    renderModal();
    uploadFile('');
    await waitFor(() => {
      expect(error).toHaveBeenCalled();
    });
  });
});
