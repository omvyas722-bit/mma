import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import AddClassModal from './AddClassModal';
import api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  default: { post: vi.fn().mockResolvedValue({ data: { id: 1 } }) },
}));

vi.mock('../Modal', () => ({
  Modal: ({ isOpen, children, title }) => isOpen ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
}));

vi.mock('../../lib/useOptions', () => ({
  useOptions: () => ({ data: { class_types: ['bjj', 'muay_thai'], locations: ['rockingham', 'bibra_lake'] } }),
  optionLabel: (v) => v?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AddClassModal isOpen={true} onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('AddClassModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    api.post.mockResolvedValue({ data: { id: 1 } });
  });

  it('renders modal when open', () => {
    renderModal();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('renders mode toggle radios', () => {
    renderModal();
    expect(screen.getByLabelText('Create Template')).toBeInTheDocument();
    expect(screen.getByLabelText('Create Instance')).toBeInTheDocument();
  });

  it('defaults to template mode', () => {
    renderModal();
    expect(screen.getByLabelText('Create Template').checked).toBe(true);
  });

  it('renders form fields in template mode', () => {
    renderModal();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(document.querySelector('input[name="name"]')).toBeInTheDocument();
    expect(document.querySelector('textarea[name="description"]')).toBeInTheDocument();
    expect(document.querySelector('select[name="class_type"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="instructor"]')).toBeInTheDocument();
  });

  it('renders day of week in template mode', () => {
    renderModal();
    expect(document.querySelector('select[name="day_of_week"]')).toBeInTheDocument();
  });

  it('hides day of week in instance mode', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('Create Instance'));
    expect(document.querySelector('select[name="day_of_week"]')).not.toBeInTheDocument();
  });

  it('shows date field in instance mode', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('Create Instance'));
    expect(document.querySelector('input[name="date"]')).toBeInTheDocument();
  });

  it('renders schedule fields', () => {
    renderModal();
    expect(document.querySelector('select[name="location"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="start_time"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="end_time"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="max_capacity"]')).toBeInTheDocument();
  });

  it('renders belt requirement and fighter-only checkbox', () => {
    renderModal();
    expect(document.querySelector('select[name="min_belt"]')).toBeInTheDocument();
    expect(screen.getByText(/Fighters only/i)).toBeInTheDocument();
  });

  it('calls onClose on cancel', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation errors on empty submit', () => {
    renderModal();
    fireEvent.click(screen.getByText('Create Class'));
    expect(screen.getByText('Class name is required')).toBeInTheDocument();
    expect(screen.getByText('Instructor is required')).toBeInTheDocument();
    expect(screen.getByText('Location is required')).toBeInTheDocument();
    expect(screen.getByText('Day of week is required')).toBeInTheDocument();
    expect(screen.getByText('Start time is required')).toBeInTheDocument();
    expect(screen.getByText('End time is required')).toBeInTheDocument();
    expect(screen.getByText('Class type is required')).toBeInTheDocument();
  });

  it('validates end time after start time', () => {
    renderModal();
    fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: 'BJJ' } });
    fireEvent.change(document.querySelector('input[name="instructor"]'), { target: { name: 'instructor', value: 'Coach' } });
    fireEvent.change(document.querySelector('select[name="class_type"]'), { target: { name: 'class_type', value: 'bjj' } });
    fireEvent.change(document.querySelector('select[name="location"]'), { target: { name: 'location', value: 'rockingham' } });
    fireEvent.change(document.querySelector('select[name="day_of_week"]'), { target: { name: 'day_of_week', value: '1' } });
    fireEvent.change(document.querySelector('input[name="start_time"]'), { target: { name: 'start_time', value: '10:00' } });
    fireEvent.change(document.querySelector('input[name="end_time"]'), { target: { name: 'end_time', value: '09:00' } });
    fireEvent.click(screen.getByText('Create Class'));
    expect(screen.getByText('End time must be after start time')).toBeInTheDocument();
  });

  it('validates minimum capacity', async () => {
    renderModal();
    fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: 'BJJ' } });
    fireEvent.change(document.querySelector('input[name="instructor"]'), { target: { name: 'instructor', value: 'Coach' } });
    fireEvent.change(document.querySelector('select[name="class_type"]'), { target: { name: 'class_type', value: 'bjj' } });
    fireEvent.change(document.querySelector('select[name="location"]'), { target: { name: 'location', value: 'rockingham' } });
    fireEvent.change(document.querySelector('select[name="day_of_week"]'), { target: { name: 'day_of_week', value: '1' } });
    fireEvent.change(document.querySelector('input[name="start_time"]'), { target: { name: 'start_time', value: '09:00' } });
    fireEvent.change(document.querySelector('input[name="end_time"]'), { target: { name: 'end_time', value: '10:00' } });
    fireEvent.change(document.querySelector('input[name="max_capacity"]'), { target: { name: 'max_capacity', value: '0' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      expect(screen.getByText('Capacity must be at least 1')).toBeInTheDocument();
    });
  });

  it('calls API on valid submit in template mode', async () => {
    renderModal();
    fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: 'BJJ Fundamentals' } });
    fireEvent.change(document.querySelector('input[name="instructor"]'), { target: { name: 'instructor', value: 'Coach A' } });
    fireEvent.change(document.querySelector('select[name="class_type"]'), { target: { name: 'class_type', value: 'bjj' } });
    fireEvent.change(document.querySelector('select[name="location"]'), { target: { name: 'location', value: 'rockingham' } });
    fireEvent.change(document.querySelector('select[name="day_of_week"]'), { target: { name: 'day_of_week', value: '1' } });
    fireEvent.change(document.querySelector('input[name="start_time"]'), { target: { name: 'start_time', value: '09:00' } });
    fireEvent.change(document.querySelector('input[name="end_time"]'), { target: { name: 'end_time', value: '10:00' } });
    fireEvent.click(screen.getByText('Create Class'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/classes', expect.objectContaining({
        name: 'BJJ Fundamentals', instructor: 'Coach A',
      }));
    });
  });

  it('calls calendar API in instance mode', async () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('Create Instance'));
    fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: 'BJJ' } });
    fireEvent.change(document.querySelector('input[name="instructor"]'), { target: { name: 'instructor', value: 'Coach' } });
    fireEvent.change(document.querySelector('select[name="class_type"]'), { target: { name: 'class_type', value: 'bjj' } });
    fireEvent.change(document.querySelector('select[name="location"]'), { target: { name: 'location', value: 'rockingham' } });
    fireEvent.change(document.querySelector('input[name="start_time"]'), { target: { name: 'start_time', value: '09:00' } });
    fireEvent.change(document.querySelector('input[name="end_time"]'), { target: { name: 'end_time', value: '10:00' } });
    fireEvent.change(document.querySelector('input[name="date"]'), { target: { name: 'date', value: '2025-07-01' } });
    fireEvent.click(screen.getByText('Create Class'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/calendar/events', expect.objectContaining({
        title: 'BJJ', date: '2025-07-01',
      }));
    });
  });

  it('shows submit error on API failure', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Class exists' } } });
    renderModal();
    fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: 'BJJ' } });
    fireEvent.change(document.querySelector('input[name="instructor"]'), { target: { name: 'instructor', value: 'Coach' } });
    fireEvent.change(document.querySelector('select[name="class_type"]'), { target: { name: 'class_type', value: 'bjj' } });
    fireEvent.change(document.querySelector('select[name="location"]'), { target: { name: 'location', value: 'rockingham' } });
    fireEvent.change(document.querySelector('select[name="day_of_week"]'), { target: { name: 'day_of_week', value: '1' } });
    fireEvent.change(document.querySelector('input[name="start_time"]'), { target: { name: 'start_time', value: '09:00' } });
    fireEvent.change(document.querySelector('input[name="end_time"]'), { target: { name: 'end_time', value: '10:00' } });
    fireEvent.click(screen.getByText('Create Class'));
    await waitFor(() => {
      expect(screen.getByText('Class exists')).toBeInTheDocument();
    });
  });

  it('disables button while creating', () => {
    api.post.mockImplementation(() => new Promise(() => {}));
    renderModal();
    fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: 'BJJ' } });
    fireEvent.change(document.querySelector('input[name="instructor"]'), { target: { name: 'instructor', value: 'Coach' } });
    fireEvent.change(document.querySelector('select[name="class_type"]'), { target: { name: 'class_type', value: 'bjj' } });
    fireEvent.change(document.querySelector('select[name="location"]'), { target: { name: 'location', value: 'rockingham' } });
    fireEvent.change(document.querySelector('select[name="day_of_week"]'), { target: { name: 'day_of_week', value: '1' } });
    fireEvent.change(document.querySelector('input[name="start_time"]'), { target: { name: 'start_time', value: '09:00' } });
    fireEvent.change(document.querySelector('input[name="end_time"]'), { target: { name: 'end_time', value: '10:00' } });
    fireEvent.click(screen.getByText('Create Class'));
    expect(screen.getByText('Creating...')).toBeDisabled();
  });
});
