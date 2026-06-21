import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import PTSessions from './PTSessions';

const API_URL = 'http://localhost:3001';

const ptHandlers = [
  http.get(`${API_URL}/api/pt-sessions`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || '';
    let sessions = [];
    if (status === 'scheduled') {
      sessions = [
        { id: 1, member_id: 1, member_name: 'John Doe', coach_id: 1, coach_name: 'Kane Mousah', scheduled_date: '2026-07-01', start_time: '09:00', end_time: '10:00', amount: 75, status: 'scheduled' },
        { id: 2, member_id: 2, member_name: 'Jane Smith', coach_id: 1, coach_name: 'Kane Mousah', scheduled_date: '2026-07-02', start_time: '10:00', end_time: '11:00', amount: 75, status: 'scheduled' },
      ];
    } else if (status === 'completed') {
      sessions = [
        { id: 3, member_id: 1, member_name: 'John Doe', coach_id: 1, coach_name: 'Kane Mousah', scheduled_date: '2026-06-28', start_time: '09:00', end_time: '10:00', amount: 75, status: 'completed' },
      ];
    } else {
      sessions = [
        { id: 1, member_id: 1, member_name: 'John Doe', coach_id: 1, coach_name: 'Kane Mousah', scheduled_date: '2026-07-01', start_time: '09:00', end_time: '10:00', amount: 75, status: 'scheduled' },
        { id: 3, member_id: 1, member_name: 'John Doe', coach_id: 1, coach_name: 'Kane Mousah', scheduled_date: '2026-06-28', start_time: '09:00', end_time: '10:00', amount: 75, status: 'completed' },
      ];
    }
    return HttpResponse.json({ sessions });
  }),
  http.get(`${API_URL}/api/staff`, () => HttpResponse.json([
    { id: 1, name: 'Kane Mousah', role: 'coach', location: 'rockingham', active: true },
  ])),
  http.get(`${API_URL}/api/members`, () => HttpResponse.json({
    members: [
      { id: 1, first_name: 'John', last_name: 'Doe' },
      { id: 2, first_name: 'Jane', last_name: 'Smith' },
    ],
  })),
  http.post(`${API_URL}/api/pt-sessions`, () => HttpResponse.json({ id: 10 }, { status: 201 })),
  http.post(`${API_URL}/api/pt-sessions/:id/complete`, () => HttpResponse.json({ success: true })),
  http.post(`${API_URL}/api/pt-sessions/:id/cancel`, () => HttpResponse.json({ success: true })),
];

afterEach(() => server.resetHandlers());
beforeEach(() => server.use(...ptHandlers));

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

describe('PTSessions Page', () => {
  it('renders the heading', () => {
    render(<PTSessions />, { wrapper: createWrapper() });
    expect(screen.getByText('PT Sessions')).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', () => {
    server.use(
      http.get(`${API_URL}/api/pt-sessions`, () => new Promise(() => {})),
    );
    render(<PTSessions />, { wrapper: createWrapper() });
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no sessions', async () => {
    server.use(
      http.get(`${API_URL}/api/pt-sessions`, () => HttpResponse.json({ sessions: [] })),
    );
    render(<PTSessions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No PT sessions found')).toBeInTheDocument();
    });
  });

  it('renders session cards with member name and coach', async () => {
    render(<PTSessions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Coach: Kane Mousah/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows scheduled status badge', async () => {
    render(<PTSessions />, { wrapper: createWrapper() });
    await waitFor(() => {
      const badges = screen.getAllByText('scheduled');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('shows Complete and Cancel buttons for scheduled sessions', async () => {
    render(<PTSessions />, { wrapper: createWrapper() });
    await waitFor(() => {
      const completeBtns = screen.getAllByText('Complete');
      const cancelBtns = screen.getAllByText('Cancel');
      expect(completeBtns.length).toBeGreaterThan(0);
      expect(cancelBtns.length).toBeGreaterThan(0);
    });
  });

  it('calls complete mutation on Complete click', async () => {
    const completeSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/api/pt-sessions/:id/complete`, ({ params }) => {
        completeSpy(params.id);
        return HttpResponse.json({ success: true });
      }),
    );
    render(<PTSessions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Complete').length).toBeGreaterThan(0);
    });
    const firstComplete = screen.getAllByText('Complete')[0];
    await userEvent.click(firstComplete);
    await waitFor(() => {
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  it('calls cancel mutation on Cancel click', async () => {
    const cancelSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/api/pt-sessions/:id/cancel`, ({ params }) => {
        cancelSpy(params.id);
        return HttpResponse.json({ success: true });
      }),
    );
    render(<PTSessions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Cancel').length).toBeGreaterThan(0);
    });
    const firstCancel = screen.getAllByText('Cancel')[0];
    await userEvent.click(firstCancel);
    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  it('switches tabs and shows correct sessions', async () => {
    render(<PTSessions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Completed'));
    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('All'));
    await waitFor(() => {
      expect(screen.getAllByText(/John Doe/).length).toBeGreaterThan(0);
    });
  });

  it('highlights active tab', async () => {
    render(<PTSessions />, { wrapper: createWrapper() });
    await waitFor(() => {
      const upcomingTab = screen.getByText('Upcoming');
      expect(upcomingTab.className).toContain('border-red-600');
    });
  });

  it('opens booking modal on + Book Session click', async () => {
    render(<PTSessions />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Book Session'));
    await waitFor(() => {
      expect(screen.getByText('Book PT Session')).toBeInTheDocument();
    });
  });

  it('booking modal has member search, coach, date, time, amount fields', async () => {
    render(<PTSessions />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Book Session'));
    await waitFor(() => {
      expect(screen.getByText('Book PT Session')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByText('Select coach...')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
    expect(screen.getByText('Amount ($)')).toBeInTheDocument();
  });

  it('booking modal shows member search results', async () => {
    server.use(
      http.get(`${API_URL}/api/members`, () => HttpResponse.json({
        members: [
          { id: 1, first_name: 'John', last_name: 'Doe' },
          { id: 2, first_name: 'Jane', last_name: 'Smith' },
        ],
      })),
    );
    render(<PTSessions />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Book Session'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'Jo');
    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('selecting a member from search results updates UI', async () => {
    render(<PTSessions />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Book Session'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'Jo');
    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    });
    await userEvent.click(within(screen.getByRole('dialog')).getAllByText('John Doe')[0]);
    expect(screen.getByText('Change')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('booking modal Book button disabled without member selected', async () => {
    render(<PTSessions />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Book Session'));
    await waitFor(() => {
      expect(screen.getByText('Book')).toBeDisabled();
    });
  });

  it('booking modal closes on Cancel click', async () => {
    render(<PTSessions />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Book Session'));
    await waitFor(() => {
      expect(screen.getByText('Book PT Session')).toBeInTheDocument();
    });
    await userEvent.click(within(screen.getByRole('dialog')).getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Book PT Session')).not.toBeInTheDocument();
    });
  });

  it('submits booking mutation with form data', async () => {
    const postSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/api/pt-sessions`, async ({ request }) => {
        const body = await request.json();
        postSpy(body);
        return HttpResponse.json({ data: { id: 10 } }, { status: 201 });
      }),
    );
    render(<PTSessions />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Book Session'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'Jo');
    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    });
    await userEvent.click(within(screen.getByRole('dialog')).getAllByText('John Doe')[0]);
    const coachSelect = screen.getByDisplayValue('Select coach...');
    await userEvent.selectOptions(coachSelect, '1');
    const dialog = screen.getByRole('dialog');
    const dateInput = dialog.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: '2026-07-15' } });
    const startInput = dialog.querySelector('input[type="time"]');
    fireEvent.change(startInput, { target: { value: '09:00' } });
    await userEvent.click(screen.getByText('Book'));
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalled();
      expect(postSpy.mock.calls[0][0]).toMatchObject({
        member_id: 1,
        coach_id: 1,
        scheduled_date: '2026-07-15',
      });
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get(`${API_URL}/api/pt-sessions`, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
    );
    render(<PTSessions />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No PT sessions found')).toBeInTheDocument();
    }, { timeout: 12000 });
  });
});
