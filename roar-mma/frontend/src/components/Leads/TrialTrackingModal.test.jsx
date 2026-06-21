import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import TrialTrackingModal from './TrialTrackingModal';
import api from '../../lib/api';
import { useNotifications } from '../../contexts/NotificationContext';

const mockLead = {
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  phone: '0400123456',
  trial_date: '2025-06-15',
  trial_class_type: 'bjj',
  trial_coach_id: '',
  trial_experience_rating: '4',
  trial_interest_level: 'hot',
  trial_notes: '',
};

vi.mock('../../lib/api', () => ({
  default: {
    put: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotifications: vi.fn(() => ({ success: vi.fn(), error: vi.fn() })),
}));

vi.mock('../Modal', () => ({
  Modal: ({ isOpen, children, title }) => isOpen ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <TrialTrackingModal isOpen={true} onClose={vi.fn()} lead={mockLead} {...props} />
    </QueryClientProvider>
  );
}

describe('TrialTrackingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.put.mockResolvedValue({ data: { id: 1 } });
    api.post.mockResolvedValue({ data: {} });
    useNotifications.mockReturnValue({ success: vi.fn(), error: vi.fn() });
  });

  it('renders modal when open', () => {
    renderModal();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows lead name and phone', () => {
    renderModal();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('0400123456')).toBeInTheDocument();
  });

  it('returns null when no lead provided', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TrialTrackingModal isOpen={true} onClose={vi.fn()} lead={null} />
      </QueryClientProvider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders trial date field', () => {
    renderModal();
    expect(document.querySelector('input[name="trial_date"]')).toBeInTheDocument();
  });

  it('renders class type select', () => {
    renderModal();
    expect(document.querySelector('select[name="trial_class_type"]')).toBeInTheDocument();
  });

  it('renders experience rating buttons', () => {
    renderModal();
    expect(screen.getByText('How was their experience? *')).toBeInTheDocument();
    const ratingBtns = document.querySelectorAll('[class*="flex-1 py-3 rounded-lg border-2"]');
    expect(ratingBtns.length || screen.getAllByText(/^[1-5]$/).length).toBe(5);
  });

  it('renders interest level buttons', () => {
    renderModal();
    expect(screen.getByText('Interest Level *')).toBeInTheDocument();
    expect(screen.getByText(/Hot/)).toBeInTheDocument();
    expect(screen.getByText(/Warm/)).toBeInTheDocument();
    expect(screen.getByText(/Cold/)).toBeInTheDocument();
  });

  it('renders session notes textarea', () => {
    renderModal();
    expect(document.querySelector('textarea[name="trial_notes"]')).toBeInTheDocument();
  });

  it('shows required field markers', () => {
    renderModal();
    expect(screen.getByText('Trial Date *')).toBeInTheDocument();
    expect(screen.getByText('Class Type *')).toBeInTheDocument();
  });

  it('pre-fills trial date from lead', () => {
    renderModal();
    expect(screen.getByDisplayValue('2025-06-15')).toBeInTheDocument();
  });

  it('calls onClose on cancel', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation errors on empty submit', async () => {
    renderModal({ lead: { ...mockLead, trial_class_type: '', trial_experience_rating: '', trial_interest_level: '' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      expect(screen.getByText(/Class type required/)).toBeInTheDocument();
    });
  });

  it('sets experience rating on button click', () => {
    renderModal();
    const btn = screen.getByText('4').closest('button');
    fireEvent.click(btn);
    expect(btn.className).toContain('border-blue-600');
  });

  it('sets interest level on button click', () => {
    renderModal();
    const hotBtn = screen.getByText(/Hot/).closest('button');
    fireEvent.click(hotBtn);
    expect(hotBtn.className).toContain('border-red-600');
  });

  it('calls API on submit with valid data', async () => {
    renderModal();
    fireEvent.change(document.querySelector('input[name="trial_date"]'), { target: { name: 'trial_date', value: '2025-06-20' } });
    fireEvent.change(document.querySelector('select[name="trial_class_type"]'), { target: { name: 'trial_class_type', value: 'bjj' } });
    fireEvent.click(screen.getByText('4').closest('button'));
    fireEvent.click(screen.getByText(/Hot/).closest('button'));
    fireEvent.click(screen.getByText(/Save & Schedule Follow-ups/i));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalled();
      expect(api.post).toHaveBeenCalledWith('/api/leads/schedule-trial-followups', {
        lead_id: 1, trial_date: '2025-06-20',
      });
    });
  });

  it('shows success notification on submit', async () => {
    const { success } = useNotifications();
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.change(document.querySelector('input[name="trial_date"]'), { target: { name: 'trial_date', value: '2025-06-20' } });
    fireEvent.change(document.querySelector('select[name="trial_class_type"]'), { target: { name: 'trial_class_type', value: 'bjj' } });
    fireEvent.click(screen.getByText('4').closest('button'));
    fireEvent.click(screen.getByText(/Hot/).closest('button'));
    fireEvent.click(screen.getByText(/Save & Schedule Follow-ups/i));
    await waitFor(() => {
      expect(success).toHaveBeenCalledWith('Trial tracked! Automated follow-ups scheduled.');
    });
  });

  it('shows submit error on API failure', async () => {
    api.put.mockRejectedValueOnce(new Error('Server error'));
    renderModal();
    fireEvent.change(document.querySelector('input[name="trial_date"]'), { target: { name: 'trial_date', value: '2025-06-20' } });
    fireEvent.change(document.querySelector('select[name="trial_class_type"]'), { target: { name: 'trial_class_type', value: 'bjj' } });
    fireEvent.click(screen.getByText('4').closest('button'));
    fireEvent.click(screen.getByText(/Hot/).closest('button'));
    fireEvent.click(screen.getByText(/Save & Schedule Follow-ups/i));
    await waitFor(() => {
      expect(screen.getByText('Failed to track trial. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables button while saving', async () => {
    api.put.mockImplementation(() => new Promise(() => {}));
    renderModal();
    fireEvent.click(screen.getByText(/Save & Schedule Follow-ups/i));
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeDisabled();
    });
  });
});
