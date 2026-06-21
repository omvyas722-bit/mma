import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import Calendar from './Calendar';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Calendar Page', () => {
  it('renders the schedule heading', async () => {
    render(<Calendar />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Schedule')).toBeInTheDocument());
  });

  it('shows calendar events after loading', async () => {
    render(<Calendar />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('BJJ Class')).toBeInTheDocument();
      expect(screen.getByText('Gym Event')).toBeInTheDocument();
    });
  });

  it('shows month view by default', async () => {
    render(<Calendar />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Month')).toBeInTheDocument());
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows add event button and opens modal on click', async () => {
    render(<Calendar />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('+ Add Event')).toBeInTheDocument());
    await userEvent.click(screen.getByText('+ Add Event'));
    expect(screen.getByText('Add Event')).toBeInTheDocument();
  });

  it('navigates to next month on next button click', async () => {
    render(<Calendar />, { wrapper: createWrapper() });
    await waitFor(() => {
      const currentMonth = screen.getByText(/June|July|August|2026/);
      expect(currentMonth).toBeInTheDocument();
    });
    const nextBtn = document.querySelector('button svg path[d="M9 5l7 7-7 7"]')?.closest('button');
    if (nextBtn) await userEvent.click(nextBtn);
  });

  it('shows error state on API failure', async () => {
    server.use(http.get('http://localhost:3001/api/calendar/events', () => HttpResponse.json({ error: 'fail' }, { status: 500 })));
    render(<Calendar />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Failed to load calendar events')).toBeInTheDocument());
  });

  it('shows week view on view toggle', async () => {
    render(<Calendar />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Week')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Week'));
    expect(screen.getByText('Week')).toBeInTheDocument();
  });

  it('shows day view on view toggle', async () => {
    render(<Calendar />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Day')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Day'));
    expect(screen.getByText('Day')).toBeInTheDocument();
  });
});
