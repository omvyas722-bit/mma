import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import NlpScheduler from './NlpScheduler';
import api from '../../lib/api';
import { parseNaturalLanguage } from '../../lib/nlpScheduler';

vi.mock('../../lib/nlpScheduler', () => ({
  parseNaturalLanguage: vi.fn(),
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotifications: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../../lib/api', () => ({
  default: { post: vi.fn().mockResolvedValue({ data: { id: 1 } }) },
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderComponent() {
  return render(
    <QueryClientProvider client={queryClient}>
      <NlpScheduler />
    </QueryClientProvider>
  );
}

describe('NlpScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: { id: 1 } });
  });

  it('renders input field', () => {
    renderComponent();
    const input = screen.getByPlaceholderText(/Describe class to schedule/i);
    expect(input).toBeInTheDocument();
  });

  it('renders schedule button', () => {
    renderComponent();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('disables schedule button when input is empty', () => {
    renderComponent();
    expect(screen.getByText('Schedule')).toBeDisabled();
  });

  it('enables schedule button when input has text', () => {
    renderComponent();
    const input = screen.getByPlaceholderText(/Describe class to schedule/i);
    fireEvent.change(input, { target: { value: 'BJJ Monday 6pm' } });
    expect(screen.getByText('Schedule')).not.toBeDisabled();
  });

  it('shows error when input cannot be parsed', async () => {
    parseNaturalLanguage.mockReturnValue({});
    renderComponent();
    const input = screen.getByPlaceholderText(/Describe class to schedule/i);
    fireEvent.change(input, { target: { value: 'garbage' } });
    fireEvent.click(screen.getByText('Schedule'));
  });

  it('shows error when no date for non-recurring', async () => {
    parseNaturalLanguage.mockReturnValue({ classType: 'bjj', time: '18:00', recurring: false, date: null });
    renderComponent();
    const input = screen.getByPlaceholderText(/Describe class to schedule/i);
    fireEvent.change(input, { target: { value: 'BJJ at 6pm' } });
    fireEvent.click(screen.getByText('Schedule'));
  });

  it('shows error when no day for recurring', async () => {
    parseNaturalLanguage.mockReturnValue({ classType: 'bjj', time: '18:00', recurring: true, dayOfWeek: null });
    renderComponent();
    const input = screen.getByPlaceholderText(/Describe class to schedule/i);
    fireEvent.change(input, { target: { value: 'BJJ every day' } });
    fireEvent.click(screen.getByText('Schedule'));
  });

  it('shows error when no location', async () => {
    parseNaturalLanguage.mockReturnValue({ classType: 'bjj', time: '18:00', recurring: true, dayOfWeek: 1, location: null });
    renderComponent();
    const input = screen.getByPlaceholderText(/Describe class to schedule/i);
    fireEvent.change(input, { target: { value: 'BJJ every Monday at 6pm' } });
    fireEvent.click(screen.getByText('Schedule'));
  });

  it('calls recurring class API on valid recurring input', async () => {
    parseNaturalLanguage.mockReturnValue({
      classType: 'bjj', time: '18:00', recurring: true, dayOfWeek: 1, location: 'rockingham', name: 'BJJ',
    });
    renderComponent();
    const input = screen.getByPlaceholderText(/Describe class to schedule/i);
    fireEvent.change(input, { target: { value: 'BJJ every Monday at 6pm at Rockingham' } });
    fireEvent.click(screen.getByText('Schedule'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/classes', {
        name: 'BJJ', location: 'rockingham', day_of_week: 1, start_time: '18:00', class_type: 'bjj',
      });
    });
  });

  it('calls calendar event API on non-recurring input', async () => {
    parseNaturalLanguage.mockReturnValue({
      classType: 'muay_thai', time: '19:00', recurring: false, date: '2025-07-01', name: 'Muay Thai',
      location: 'rockingham',
    });
    renderComponent();
    const input = screen.getByPlaceholderText(/Describe class to schedule/i);
    fireEvent.change(input, { target: { value: 'Muay Thai tomorrow at 7pm' } });
    fireEvent.click(screen.getByText('Schedule'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/calendar/events', {
        title: 'Muay Thai', type: 'muay_thai', date: '2025-07-01', start_time: '19:00',
      });
    });
  });

  it('clears input on successful submit', async () => {
    parseNaturalLanguage.mockReturnValue({
      classType: 'bjj', time: '18:00', recurring: true, dayOfWeek: 1, location: 'rockingham', name: 'BJJ',
    });
    renderComponent();
    const input = screen.getByPlaceholderText(/Describe class to schedule/i);
    fireEvent.change(input, { target: { value: 'BJJ every Monday at 6pm at Rockingham' } });
    fireEvent.click(screen.getByText('Schedule'));
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('shows error on API failure', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Schedule conflict' } } });
    parseNaturalLanguage.mockReturnValue({
      classType: 'bjj', time: '18:00', recurring: true, dayOfWeek: 1, location: 'rockingham', name: 'BJJ',
    });
    renderComponent();
    const input = screen.getByPlaceholderText(/Describe class to schedule/i);
    fireEvent.change(input, { target: { value: 'BJJ every Monday at 6pm at Rockingham' } });
    fireEvent.click(screen.getByText('Schedule'));
    await waitFor(() => {
      expect(screen.getByText('Schedule')).toBeInTheDocument();
    });
  });

  it('disables input and button while scheduling', async () => {
    api.post.mockImplementation(() => new Promise(() => {}));
    parseNaturalLanguage.mockReturnValue({
      classType: 'bjj', time: '18:00', recurring: true, dayOfWeek: 1, location: 'rockingham', name: 'BJJ',
    });
    renderComponent();
    const input = screen.getByPlaceholderText(/Describe class to schedule/i);
    fireEvent.change(input, { target: { value: 'BJJ every Monday at 6pm at Rockingham' } });
    fireEvent.click(screen.getByText('Schedule'));
    await waitFor(() => {
      expect(input).toBeDisabled();
      expect(screen.getByText('Scheduling...')).toBeDisabled();
    });
  });
});
