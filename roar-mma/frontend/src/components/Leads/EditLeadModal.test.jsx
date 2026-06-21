import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import EditLeadModal from './EditLeadModal';
import api from '../../lib/api';

const mockLead = {
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@test.com',
  phone: '0400123456',
  source: 'website',
  status: 'new',
  location_preference: 'rockingham',
  interests: 'BJJ',
  notes: 'Call back',
};

vi.mock('../../lib/api', () => ({
  default: { put: vi.fn().mockResolvedValue({ data: { id: 1 } }), get: vi.fn() },
}));

vi.mock('../../lib/useOptions', () => ({
  useOptions: () => ({
    data: { lead_sources: ['website', 'referral'], locations: ['rockingham', 'bibra_lake'] },
  }),
  optionLabel: (v) => v?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
}));

vi.mock('../Modal', () => ({
  Modal: ({ isOpen, children, title }) => isOpen ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <EditLeadModal isOpen={true} onClose={vi.fn()} lead={mockLead} {...props} />
    </QueryClientProvider>
  );
}

describe('EditLeadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.put.mockResolvedValue({ data: { id: 1 } });
  });

  it('renders modal when open', () => {
    renderModal();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('pre-fills form with lead data', () => {
    renderModal();
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@test.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0400123456')).toBeInTheDocument();
  });

  it('renders contact info section', () => {
    renderModal();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
  });

  it('renders lead details section', () => {
    renderModal();
    expect(screen.getByText('Lead Details')).toBeInTheDocument();
  });

  it('returns null when no lead provided', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <EditLeadModal isOpen={true} onClose={vi.fn()} lead={null} />
      </QueryClientProvider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('calls onClose on cancel', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows source and status as required markers', () => {
    renderModal();
    expect(screen.getByText('Source *')).toBeInTheDocument();
    expect(screen.getByText('Status *')).toBeInTheDocument();
  });

  it('shows location preference select', () => {
    renderModal();
    expect(screen.getByText('Location Preference')).toBeInTheDocument();
  });

  it('pre-fills source and status', () => {
    renderModal();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('pre-fills interests and notes', () => {
    renderModal();
    expect(screen.getByDisplayValue('BJJ')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Call back')).toBeInTheDocument();
  });

  it('validates required fields', () => {
    renderModal();
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: '' } });
    fireEvent.click(screen.getByText('Update Lead'));
    expect(screen.getByText('First name is required')).toBeInTheDocument();
  });

  it('validates source is required', () => {
    renderModal();
    fireEvent.change(document.querySelector('select[name="source"]'), { target: { name: 'source', value: '' } });
    fireEvent.click(screen.getByText('Update Lead'));
    expect(screen.getByText('Source is required')).toBeInTheDocument();
  });

  it('validates status is required', () => {
    renderModal();
    fireEvent.change(document.querySelector('select[name="status"]'), { target: { name: 'status', value: '' } });
    fireEvent.click(screen.getByText('Update Lead'));
    expect(screen.getByText('Status is required')).toBeInTheDocument();
  });

  it('calls API on submit with valid data', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Update Lead'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/leads/1', expect.objectContaining({
        first_name: 'John', last_name: 'Doe', location_preference: 'rockingham',
      }));
    });
  });

  it('shows error on API failure', async () => {
    api.put.mockRejectedValueOnce({ response: { data: { error: 'Update failed' } } });
    renderModal();
    fireEvent.click(screen.getByText('Update Lead'));
    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('shows generic error when no response data', async () => {
    api.put.mockRejectedValueOnce(new Error('Network error'));
    renderModal();
    fireEvent.click(screen.getByText('Update Lead'));
    await waitFor(() => {
      expect(screen.getByText('Failed to update lead. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables button while updating', () => {
    api.put.mockImplementation(() => new Promise(() => {}));
    renderModal();
    fireEvent.click(screen.getByText('Update Lead'));
    expect(screen.getByText('Updating...')).toBeDisabled();
  });
});
