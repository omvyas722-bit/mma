import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import EditClassModal from './EditClassModal';
import api from '../../lib/api';

const mockClassData = {
  id: 1,
  name: 'BJJ Fundamentals',
  description: 'Beginner BJJ class',
  instructor: 'Coach A',
  location: 'rockingham',
  day_of_week: 1,
  start_time: '09:00',
  end_time: '10:00',
  max_capacity: 20,
  class_type: 'bjj',
  min_belt: 'white',
  fighter_only: false,
};

vi.mock('../../lib/api', () => ({
  default: { put: vi.fn().mockResolvedValue({ data: { id: 1 } }), get: vi.fn() },
}));

vi.mock('../../lib/useOptions', () => ({
  useOptions: () => ({ data: { class_types: ['bjj', 'muay_thai'], locations: ['rockingham', 'bibra_lake'], belt_levels: ['white', 'blue'] } }),
  optionLabel: (v) => v?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
}));

vi.mock('../Modal', () => ({
  Modal: ({ isOpen, children, title }) => isOpen ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <EditClassModal isOpen={true} onClose={vi.fn()} classData={mockClassData} {...props} />
    </QueryClientProvider>
  );
}

describe('EditClassModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.put.mockResolvedValue({ data: { id: 1 } });
  });

  it('renders modal when open', () => {
    renderModal();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('pre-fills form with class data', () => {
    renderModal();
    expect(screen.getByDisplayValue('BJJ Fundamentals')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Beginner BJJ class')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Coach A')).toBeInTheDocument();
  });

  it('returns null when no classData provided', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <EditClassModal isOpen={true} onClose={vi.fn()} classData={null} />
      </QueryClientProvider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders basic information section', () => {
    renderModal();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
  });

  it('renders schedule section', () => {
    renderModal();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('renders all required field markers', () => {
    renderModal();
    expect(screen.getByText('Class Name *')).toBeInTheDocument();
    expect(screen.getByText('Class Type *')).toBeInTheDocument();
    expect(screen.getByText('Instructor *')).toBeInTheDocument();
    expect(screen.getByText('Day of Week *')).toBeInTheDocument();
    expect(screen.getByText('Location *')).toBeInTheDocument();
    expect(screen.getByText('Start Time *')).toBeInTheDocument();
    expect(screen.getByText('End Time *')).toBeInTheDocument();
  });

  it('pre-fills day of week', () => {
    renderModal();
    expect(screen.getByDisplayValue('Monday')).toBeInTheDocument();
  });

  it('pre-fills times', () => {
    renderModal();
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();
  });

  it('pre-fills class type and location', () => {
    renderModal();
    expect(screen.getByDisplayValue('Bjj')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rockingham')).toBeInTheDocument();
  });

  it('pre-fills capacity and belt', () => {
    renderModal();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('White')).toBeInTheDocument();
  });

  it('calls onClose on cancel', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation errors on invalid submit', () => {
    renderModal();
    fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: '' } });
    fireEvent.click(screen.getByText('Update Class'));
    expect(screen.getByText('Class name is required')).toBeInTheDocument();
  });

  it('calls API on valid submit', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Update Class'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/classes/1', expect.objectContaining({
        name: 'BJJ Fundamentals', day_of_week: 1, max_capacity: 20,
      }));
    });
  });

  it('shows error on API failure', async () => {
    api.put.mockRejectedValueOnce({ response: { data: { error: 'Update failed' } } });
    renderModal();
    fireEvent.click(screen.getByText('Update Class'));
    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('shows generic error when no response data', async () => {
    api.put.mockRejectedValueOnce(new Error('Network error'));
    renderModal();
    fireEvent.click(screen.getByText('Update Class'));
    await waitFor(() => {
      expect(screen.getByText('Failed to update class. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables button while updating', () => {
    api.put.mockImplementation(() => new Promise(() => {}));
    renderModal();
    fireEvent.click(screen.getByText('Update Class'));
    expect(screen.getByText('Updating...')).toBeDisabled();
  });
});
