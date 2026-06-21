import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import AddLeadModal from './AddLeadModal';
import api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  default: { post: vi.fn().mockResolvedValue({ data: { id: 1 } }) },
}));

vi.mock('../../lib/useOptions', () => ({
  useOptions: () => ({ data: { lead_sources: ['website', 'facebook', 'instagram', 'referral', 'walk_in', 'phone', 'email', 'other'], locations: ['rockingham', 'bibra_lake', '247_gym'] } }),
  optionLabel: (v) => v ? v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '',
}));

vi.mock('../Modal', () => ({
  Modal: ({ isOpen, children, title }) => isOpen ? <div data-testid="modal" aria-label={title}><h2>{title}</h2>{children}</div> : null,
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AddLeadModal isOpen={true} onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('AddLeadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: { id: 1 } });
  });

  it('renders modal when open', () => {
    renderModal();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('renders form title', () => {
    renderModal();
    expect(screen.getByText('Add New Lead')).toBeInTheDocument();
  });

  it('renders name fields', () => {
    renderModal();
    expect(document.querySelector('input[name="first_name"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="last_name"]')).toBeInTheDocument();
  });

  it('renders contact fields with email', () => {
    renderModal();
    expect(document.querySelector('input[name="email"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="phone"]')).toBeInTheDocument();
  });

  it('renders source and location selects', () => {
    renderModal();
    expect(document.querySelector('select[name="source"]')).toBeInTheDocument();
    expect(document.querySelector('select[name="location"]')).toBeInTheDocument();
  });

  it('renders notes and interests fields', () => {
    renderModal();
    expect(document.querySelector('textarea[name="interests"]')).toBeInTheDocument();
    expect(document.querySelector('textarea[name="notes"]')).toBeInTheDocument();
  });

  it('renders UTM tracking section', () => {
    renderModal();
    expect(screen.getByText('UTM Tracking (optional)')).toBeInTheDocument();
  });

  it('calls onClose on cancel', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const cancel = screen.queryByText(/cancel/i);
    if (cancel) fireEvent.click(cancel);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation errors on empty submit', () => {
    renderModal();
    fireEvent.click(screen.getByText('Create Lead'));
    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Phone is required')).toBeInTheDocument();
  });

  it('validates and calls API on valid submit', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'John' } });
    fireEvent.change(document.querySelector('input[name="last_name"]'), { target: { name: 'last_name', value: 'Doe' } });
    fireEvent.change(document.querySelector('input[name="phone"]'), { target: { name: 'phone', value: '0400123456' } });
    fireEvent.click(screen.getByText('Create Lead'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/leads', expect.objectContaining({
        first_name: 'John', last_name: 'Doe', phone: '0400123456',
      }));
    });
  });

  it('resets form on successful submit', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'John' } });
    fireEvent.change(document.querySelector('input[name="last_name"]'), { target: { name: 'last_name', value: 'Doe' } });
    fireEvent.change(document.querySelector('input[name="phone"]'), { target: { name: 'phone', value: '0400123456' } });
    fireEvent.click(screen.getByText('Create Lead'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows submit error on API failure', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Lead exists' } } });
    renderModal();
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'John' } });
    fireEvent.change(document.querySelector('input[name="last_name"]'), { target: { name: 'last_name', value: 'Doe' } });
    fireEvent.change(document.querySelector('input[name="phone"]'), { target: { name: 'phone', value: '0400123456' } });
    fireEvent.click(screen.getByText('Create Lead'));
    await waitFor(() => {
      expect(screen.getByText('Lead exists')).toBeInTheDocument();
    });
  });

  it('shows generic error message when no response error', async () => {
    api.post.mockRejectedValueOnce(new Error('Network error'));
    renderModal();
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'John' } });
    fireEvent.change(document.querySelector('input[name="last_name"]'), { target: { name: 'last_name', value: 'Doe' } });
    fireEvent.change(document.querySelector('input[name="phone"]'), { target: { name: 'phone', value: '0400123456' } });
    fireEvent.click(screen.getByText('Create Lead'));
    await waitFor(() => {
      expect(screen.getByText('Failed to create lead. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables submit button while creating', () => {
    api.post.mockImplementation(() => new Promise(() => {}));
    renderModal();
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'John' } });
    fireEvent.change(document.querySelector('input[name="last_name"]'), { target: { name: 'last_name', value: 'Doe' } });
    fireEvent.change(document.querySelector('input[name="phone"]'), { target: { name: 'phone', value: '0400123456' } });
    fireEvent.click(screen.getByText('Create Lead'));
    expect(screen.getByText('Creating...')).toBeDisabled();
  });

  it('clears field error on change', () => {
    renderModal();
    fireEvent.click(screen.getByText('Create Lead'));
    expect(screen.getByText('First name is required')).toBeInTheDocument();
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'J' } });
    expect(screen.queryByText('First name is required')).toBeNull();
  });

  it('renders with default source value', () => {
    renderModal();
    expect(document.querySelector('select[name="source"]')).toHaveValue('website');
  });

  it('renders with default location value', () => {
    renderModal();
    expect(document.querySelector('select[name="location"]')).toHaveValue('rockingham');
  });
});
