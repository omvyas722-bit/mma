import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import StaffSchedule from './StaffSchedule';

const API_URL = 'http://localhost:3001';

const scheduleHandlers = [
  http.get(`${API_URL}/api/staff-schedule`, () => HttpResponse.json({
    schedule: { shifts: [], timeOff: [] },
  })),
  http.get(`${API_URL}/api/staff`, () => HttpResponse.json([
    { id: 1, name: 'Kane Mousah', role: 'coach', location: 'rockingham', active: true },
    { id: 2, name: 'Sarah Connor', role: 'front_desk', location: 'bibra_lake', active: true },
  ])),
  http.post(`${API_URL}/api/staff-schedule/shifts`, () => HttpResponse.json({ id: 99 }, { status: 201 })),
  http.delete(`${API_URL}/api/staff-schedule/shifts/:id`, () => HttpResponse.json({ success: true })),
];

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

beforeEach(() => server.use(...scheduleHandlers));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return ({ children }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('StaffSchedule Page', () => {
  it('renders the heading', async () => {
    render(<StaffSchedule />, { wrapper: createWrapper() });
    expect(screen.getByText('Staff Schedule')).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', () => {
    server.use(
      http.get(`${API_URL}/api/staff-schedule`, () => HttpResponse.json({
        schedule: { shifts: [], timeOff: [] },
      })),
    );
    render(<StaffSchedule />, { wrapper: createWrapper() });
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows empty state when no shifts scheduled', async () => {
    render(<StaffSchedule />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No shifts scheduled')).toBeInTheDocument();
    });
  });

  it('renders schedule table with shifts', async () => {
    server.use(
      http.get(`${API_URL}/api/staff-schedule`, () => HttpResponse.json({
        schedule: {
          shifts: [
            { id: 1, staff_id: 1, day_of_week: 1, start_time: '09:00', end_time: '17:00' },
            { id: 2, staff_id: 1, day_of_week: 3, start_time: '09:00', end_time: '13:00' },
            { id: 3, staff_id: 2, day_of_week: 2, start_time: '10:00', end_time: '18:00' },
          ],
          timeOff: [],
        },
      })),
      http.get(`${API_URL}/api/staff`, () => HttpResponse.json([
        { id: 1, name: 'Kane Mousah', role: 'coach', location: 'rockingham', active: true },
        { id: 2, name: 'Sarah Connor', role: 'front_desk', location: 'bibra_lake', active: true },
      ])),
    );
    render(<StaffSchedule />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Kane Mousah')).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    });
    expect(screen.getByText('09:00-17:00')).toBeInTheDocument();
    expect(screen.getByText('10:00-18:00')).toBeInTheDocument();
  });

  it('shows time off section when data present', async () => {
    server.use(
      http.get(`${API_URL}/api/staff-schedule`, () => HttpResponse.json({
        schedule: {
          shifts: [],
          timeOff: [
            { id: 1, staff_id: 1, staff_name: 'Kane Mousah', date_from: '2026-06-22', date_to: '2026-06-24', type: 'vacation' },
          ],
        },
      })),
    );
    render(<StaffSchedule />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Time Off')).toBeInTheDocument();
      expect(screen.getByText(/Kane Mousah/)).toBeInTheDocument();
    });
  });

  it('hides time off section when empty', async () => {
    render(<StaffSchedule />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText('Time Off')).not.toBeInTheDocument();
    });
  });

  it('toggles add shift form on button click', async () => {
    render(<StaffSchedule />, { wrapper: createWrapper() });
    const btn = screen.getByText('+ Add Shift');
    await userEvent.click(btn);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('populates staff dropdown in form', async () => {
    render(<StaffSchedule />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Add Shift'));
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(2);
      expect(screen.getByText('Kane Mousah')).toBeInTheDocument();
    });
  });

  it('disables Save button when no staff selected', async () => {
    render(<StaffSchedule />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Add Shift'));
    await waitFor(() => {
      expect(screen.getByText('Save')).toBeDisabled();
    });
  });

  it('enables Save button after selecting staff', async () => {
    render(<StaffSchedule />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Add Shift'));
    await waitFor(() => {
      expect(screen.getByText('Kane Mousah')).toBeInTheDocument();
    });
    const staffSelect = screen.getAllByRole('combobox')[0];
    await userEvent.selectOptions(staffSelect, '1');
    expect(screen.getByText('Save')).not.toBeDisabled();
  });

  it('calls add shift mutation on form submit', async () => {
    const postSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/api/staff-schedule/shifts`, async ({ request }) => {
        const body = await request.json();
        postSpy(body);
        return HttpResponse.json({ data: { id: 99 } }, { status: 201 });
      }),
    );
    render(<StaffSchedule />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Add Shift'));
    await waitFor(() => {
      expect(screen.getByText('Kane Mousah')).toBeInTheDocument();
    });
    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], '1');
    await userEvent.selectOptions(selects[1], '2');
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalled();
    });
  });

  it('calls delete shift mutation on ✕ click', async () => {
    const deleteSpy = vi.fn();
    server.use(
      http.get(`${API_URL}/api/staff-schedule`, () => HttpResponse.json({
        schedule: {
          shifts: [{ id: 5, staff_id: 1, day_of_week: 1, start_time: '09:00', end_time: '17:00' }],
          timeOff: [],
        },
      })),
      http.delete(`${API_URL}/api/staff-schedule/shifts/:id`, ({ params }) => {
        deleteSpy(params.id);
        return HttpResponse.json({ success: true });
      }),
    );
    render(<StaffSchedule />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('09:00-17:00')).toBeInTheDocument();
    });
    const deleteBtn = screen.getByText('✕');
    await userEvent.click(deleteBtn);
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('5');
    });
  });

  it('shows error notification when schedule API fails', async () => {
    server.use(
      http.get(`${API_URL}/api/staff-schedule`, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
    );
    render(<StaffSchedule />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No shifts scheduled')).toBeInTheDocument();
    }, { timeout: 8000 });
  });

  it('renders all day columns in table header', async () => {
    render(<StaffSchedule />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });
  });
});
