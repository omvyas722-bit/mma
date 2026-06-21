import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import Leads from './Leads';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import { LocationProvider } from '../contexts/LocationContext';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3001';

const missingEndpoints = [
  http.get(`${API_URL}/api/leads/stats`, () => HttpResponse.json({
    new: { count: 1 }, contacted: { count: 1 }, trial_booked: { count: 0 },
    trial_completed: { count: 0 }, converted: { count: 0 }, total: 2,
    by_source: [{ source: 'website', count: 1 }, { source: 'facebook', count: 1 }],
    conversion_rate: 0,
  })),
  http.get(`${API_URL}/api/leads/winback`, () => HttpResponse.json({ leads: [] })),
];

afterEach(() => server.resetHandlers());
beforeEach(() => server.use(...missingEndpoints));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
  return ({ children }) => (
    <BrowserRouter><LocationProvider><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></LocationProvider></BrowserRouter>
  );
};

describe('Leads Page', () => {
  it('shows loading state initially', () => {
    render(<Leads />, { wrapper: createWrapper() });
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
  });

  it('shows error state with retry on API failure', async () => {
    server.use(
      http.get(`${API_URL}/api/leads`, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
    );
    render(<Leads />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  it('displays all pipeline columns after loading', async () => {
    render(<Leads />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('New Leads')).toBeInTheDocument();
      expect(screen.getByText('Contacted')).toBeInTheDocument();
      expect(screen.getByText('Trial Booked')).toBeInTheDocument();
      expect(screen.getByText('Trial Done')).toBeInTheDocument();
      expect(screen.getByText('Converted ✓')).toBeInTheDocument();
    });
  });

  it('shows lead cards with names and score badges', async () => {
    render(<Leads />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Alice Johnson/)).toBeInTheDocument();
      expect(screen.getByText(/Bob Smith/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Score 65/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Score 45/)).toBeInTheDocument();
    });
  });

  it('renders filter inputs', async () => {
    render(<Leads />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Search leads')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by stage')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by source')).toBeInTheDocument();
    });
  });

  it('shows add lead button', () => {
    render(<Leads />, { wrapper: createWrapper() });
    expect(screen.getByText('+ Add Lead')).toBeInTheDocument();
  });

  it('shows empty columns when no leads', async () => {
    server.use(
      http.get(`${API_URL}/api/leads`, () => HttpResponse.json({ leads: [] })),
    );
    render(<Leads />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('No leads in this stage').length).toBe(5);
    });
  });

  it('switches between pipeline and analytics tabs', async () => {
    render(<Leads />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Pipeline')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Leads by Source')).toBeInTheDocument();
      expect(screen.getByText('Conversion Funnel')).toBeInTheDocument();
    });
  });

  it('shows stage counts in analytics tab', async () => {
    render(<Leads />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Analytics'));
    await waitFor(() => {
      const newLeadCards = screen.getAllByText('New Leads');
      expect(newLeadCards.length).toBeGreaterThan(0);
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });

  it('toggles bulk mode', async () => {
    render(<Leads />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Select Multiple')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Select Multiple'));
    await waitFor(() => {
      expect(screen.getByText(/0 selected/)).toBeInTheDocument();
    });
  });

  it('opens detail panel when lead card is clicked', async () => {
    render(<Leads />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Alice Johnson/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Alice Johnson/));
    await waitFor(() => {
      expect(screen.getByLabelText('Lead details')).toBeInTheDocument();
      expect(screen.getByText('Stage: new')).toBeInTheDocument();
    });
  });
});
