import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import Classes from './Classes';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import { LocationProvider } from '../contexts/LocationContext';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3001';

afterEach(() => server.resetHandlers());

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
  return ({ children }) => (
    <BrowserRouter><LocationProvider><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></LocationProvider></BrowserRouter>
  );
};

describe('Classes Page', () => {
  it('shows all day columns after loading', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('Tuesday')).toBeInTheDocument();
      expect(screen.getByText('Wednesday')).toBeInTheDocument();
      expect(screen.getByText('Thursday')).toBeInTheDocument();
      expect(screen.getByText('Friday')).toBeInTheDocument();
      expect(screen.getByText('Saturday')).toBeInTheDocument();
      expect(screen.getByText('Sunday')).toBeInTheDocument();
    });
  });

  it('shows class cards with data from API', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('BJJ Fundamentals')).toBeInTheDocument();
      expect(screen.getByText('Kane Mousah')).toBeInTheDocument();
    });
  });

  it('shows stat boxes with correct values', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Classes This Week')).toBeInTheDocument();
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
      expect(screen.getByText('Avg Fill')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  it('renders week navigation buttons', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Previous week')).toBeInTheDocument();
      expect(screen.getByLabelText('Next week')).toBeInTheDocument();
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
  });

  it('navigates weeks when prev/next buttons are clicked', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Previous week')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText('Previous week'));
    fireEvent.click(screen.getByLabelText('Next week'));
    fireEvent.click(screen.getByText('This Week'));
  });

  it('shows error state with retry on API failure', async () => {
    server.use(
      http.get(`${API_URL}/api/classes/instances`, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
    );
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  it('shows empty state per day when no classes', async () => {
    server.use(
      http.get(`${API_URL}/api/classes/instances`, () => HttpResponse.json([])),
    );
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => {
      const noClassElements = screen.getAllByText('No classes');
      expect(noClassElements.length).toBe(7);
    });
  });

  it('toggles split view', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Side by Side')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Side by Side'));
    await waitFor(() => {
      expect(screen.getByText('Single View')).toBeInTheDocument();
    });
  });

  it('renders location and type filter dropdowns', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by location')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by type')).toBeInTheDocument();
    });
  });

  it('opens instance drawer when class card is clicked', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText(/BJJ Fundamentals, 18:00/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/BJJ Fundamentals, 18:00/));
    await waitFor(() => {
      expect(screen.getByLabelText(/Class details: BJJ Fundamentals/)).toBeInTheDocument();
    });
  });

  it('shows the NLP Scheduler', async () => {
    render(<Classes />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Describe class to schedule/i)).toBeInTheDocument();
      expect(screen.getByText('Schedule')).toBeInTheDocument();
    });
  });
});
