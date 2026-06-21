import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import DocumentsPanel from './DocumentsPanel';
import api from '../../lib/api';

const mockDocuments = [
  { id: 1, doc_type: 'health', file_name: 'health_form.pdf', file_path: '/uploads/health.pdf', notes: 'Signed', uploaded_at: '2025-01-15T00:00:00Z' },
  { id: 2, doc_type: 'id', file_name: 'passport.jpg', file_path: '/uploads/passport.jpg', notes: '', uploaded_at: '2025-02-10T00:00:00Z' },
];

const mockWaivers = [
  { id: 1, template_name: 'General Waiver', signed_at: '2025-01-20T00:00:00Z' },
];

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { documents: [], waivers: [] } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotifications: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPanel(memberId = 1) {
  return render(
    <QueryClientProvider client={queryClient}>
      <DocumentsPanel memberId={memberId} />
    </QueryClientProvider>
  );
}

describe('DocumentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    api.get.mockResolvedValue({ data: { documents: [], waivers: [] } });
    api.post.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
  });

  it('shows no member selected when no memberId', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <DocumentsPanel memberId={null} />
      </QueryClientProvider>
    );
    expect(container.textContent).toContain('No member selected');
  });

  it('renders all section headers', async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('Health Declaration')).toBeInTheDocument();
      expect(screen.getByText('Signed Waivers')).toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
  });

  it('shows awaiting health declaration when no health doc', async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('Awaiting Health Declaration')).toBeInTheDocument();
    });
  });

  it('shows signed health declaration when health doc exists', async () => {
    api.get.mockResolvedValue({ data: { documents: mockDocuments, waivers: [] } });
    renderPanel();
    await waitFor(() => {
      expect(screen.getAllByText('Signed').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows no signed waivers message', async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('No signed waivers.')).toBeInTheDocument();
    });
  });

  it('shows signed waiver list when waivers exist', async () => {
    api.get.mockResolvedValue({ data: { documents: [], waivers: mockWaivers } });
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('General Waiver')).toBeInTheDocument();
    });
  });

  it('shows empty documents state', async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('No documents uploaded.')).toBeInTheDocument();
    });
  });

  it('shows document list when documents exist', async () => {
    api.get.mockResolvedValue({ data: { documents: mockDocuments, waivers: [] } });
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('passport.jpg')).toBeInTheDocument();
    });
  });

  it('toggles upload form', () => {
    renderPanel();
    const uploadBtn = screen.getByText('+ Upload');
    fireEvent.click(uploadBtn);
    expect(screen.getByLabelText('Document type')).toBeInTheDocument();
    expect(screen.getByLabelText('File name')).toBeInTheDocument();
    expect(screen.getByLabelText('File path')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('cancels upload form', () => {
    renderPanel();
    fireEvent.click(screen.getByText('+ Upload'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByLabelText('Document type')).not.toBeInTheDocument();
  });

  it('disables upload button when file_name is empty', () => {
    renderPanel();
    fireEvent.click(screen.getByText('+ Upload'));
    expect(screen.getByText('Upload')).toBeDisabled();
  });

  it('calls upload API on form submit', async () => {
    renderPanel();
    fireEvent.click(screen.getByText('+ Upload'));
    fireEvent.change(screen.getByLabelText('File name'), { target: { value: 'test.pdf' } });
    fireEvent.change(screen.getByLabelText('File path'), { target: { value: '/uploads/test.pdf' } });
    fireEvent.click(screen.getByText('Upload'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/waivers/documents/upload', {
        member_id: 1,
        doc_type: 'other',
        file_name: 'test.pdf',
        file_path: '/uploads/test.pdf',
        notes: '',
      });
    });
  });

  it('shows document delete button', async () => {
    api.get.mockResolvedValue({ data: { documents: mockDocuments, waivers: [] } });
    window.confirm = vi.fn(() => true);
    renderPanel();
    await waitFor(() => {
      const deleteBtns = screen.getAllByText('Delete');
      expect(deleteBtns.length).toBe(2);
    });
  });

  it('calls delete API on confirm', async () => {
    api.get.mockResolvedValue({ data: { documents: mockDocuments, waivers: [] } });
    window.confirm = vi.fn(() => true);
    renderPanel();
    await waitFor(() => {
      fireEvent.click(screen.getAllByText('Delete')[0]);
      expect(api.delete).toHaveBeenCalledWith('/api/waivers/documents/1');
    });
  });

  it('shows health doc view link when file_path exists', async () => {
    api.get.mockResolvedValue({ data: { documents: mockDocuments, waivers: [] } });
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('View')).toBeInTheDocument();
      expect(screen.getByText('View').closest('a')).toHaveAttribute('href', '/uploads/health.pdf');
    });
  });

  it('displays document type labels', async () => {
    api.get.mockResolvedValue({ data: { documents: mockDocuments, waivers: [] } });
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('ID')).toBeInTheDocument();
    });
  });

  it('shows loading state', async () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText('Loading documents...')).toBeInTheDocument();
    });
  });
});
