import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationProvider } from '../contexts/NotificationContext';
import TrialConversionDashboard from './TrialConversionDashboard';

const mockStats = {
  overall: { trials_completed: 120, converted: 48, conversion_rate: 40 },
  by_interest_level: [
    { trial_interest_level: 'hot', total: 40, converted: 28, conversion_rate: 70 },
    { trial_interest_level: 'warm', total: 50, converted: 15, conversion_rate: 30 },
    { trial_interest_level: 'cold', total: 30, converted: 5, conversion_rate: 16.7 },
  ],
  by_experience_rating: [
    { trial_experience_rating: 5, total: 20, converted: 18, conversion_rate: 90 },
    { trial_experience_rating: 4, total: 35, converted: 20, conversion_rate: 57.1 },
    { trial_experience_rating: 3, total: 30, converted: 8, conversion_rate: 26.7 },
    { trial_experience_rating: 2, total: 20, converted: 2, conversion_rate: 10 },
    { trial_experience_rating: 1, total: 15, converted: 0, conversion_rate: 0 },
  ],
  by_class_type: [
    { trial_class_type: 'bjj', total: 50, converted: 22, conversion_rate: 44 },
    { trial_class_type: 'muay_thai', total: 40, converted: 16, conversion_rate: 40 },
    { trial_class_type: 'boxing', total: 30, converted: 10, conversion_rate: 33.3 },
  ],
  needs_follow_up: [],
};

const mockFollowUp = {
  overall: { trials_completed: 120, converted: 48, conversion_rate: 40 },
  by_interest_level: [
    { trial_interest_level: 'hot', total: 40, converted: 28, conversion_rate: 70 },
  ],
  by_experience_rating: [
    { trial_experience_rating: 5, total: 20, converted: 18, conversion_rate: 90 },
  ],
  by_class_type: [
    { trial_class_type: 'bjj', total: 50, converted: 22, conversion_rate: 44 },
  ],
  needs_follow_up: [
    { id: 1, first_name: 'Alice', last_name: 'Johnson', phone: '0412345680', trial_date: '2026-05-15', trial_interest_level: 'hot', trial_experience_rating: 4, days_since_trial: 7 },
    { id: 2, first_name: 'Bob', last_name: 'Smith', phone: '0412345681', trial_date: '2026-05-10', trial_interest_level: 'cold', trial_experience_rating: 2, days_since_trial: 12 },
  ],
};

vi.mock('../lib/api', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return { default: mockApi };
});

import api from '../lib/api';

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

function mockApiResponse(data) {
  api.get.mockResolvedValue({ data });
}

function mockApiError() {
  api.get.mockRejectedValue(new Error('Server error'));
}

describe('TrialConversionDashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the heading and description', async () => {
    mockApiResponse(mockStats);
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Trial Conversion Analytics')).toBeInTheDocument();
      expect(screen.getByText(/Track trial session performance/)).toBeInTheDocument();
    });
  });

  it('shows PageLoader while loading', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders all three stat cards with values', async () => {
    mockApiResponse(mockStats);
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Trials Completed')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('Converted to Members')).toBeInTheDocument();
      expect(screen.getByText('48')).toBeInTheDocument();
      expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/40%/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows conversion rate in green when >= 50', async () => {
    mockApiResponse({ ...mockStats, overall: { trials_completed: 100, converted: 60, conversion_rate: 60 } });
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      const rateEl = screen.getByText('60%');
      expect(rateEl.className).toContain('text-green-600');
    });
  });

  it('shows conversion rate in yellow when >= 30', async () => {
    mockApiResponse({ ...mockStats, overall: { trials_completed: 100, converted: 35, conversion_rate: 35 } });
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      const rateEl = screen.getByText('35%');
      expect(rateEl.className).toContain('text-yellow-600');
    });
  });

  it('shows conversion rate in red when < 30', async () => {
    mockApiResponse({ ...mockStats, overall: { trials_completed: 100, converted: 20, conversion_rate: 20 } });
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      const rateEl = screen.getByText('20%');
      expect(rateEl.className).toContain('text-red-600');
    });
  });

  it('renders conversion by interest level section', async () => {
    mockApiResponse(mockStats);
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Conversion by Interest Level')).toBeInTheDocument();
      expect(screen.getByText('🔥 Hot')).toBeInTheDocument();
      expect(screen.getByText('👍 Warm')).toBeInTheDocument();
      expect(screen.getByText('❄️ Cold')).toBeInTheDocument();
    });
  });

  it('renders interest level conversion rates', async () => {
    mockApiResponse(mockStats);
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('70%')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText('16.7%')).toBeInTheDocument();
    });
  });

  it('renders conversion by experience rating section', async () => {
    mockApiResponse(mockStats);
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Conversion by Experience Rating')).toBeInTheDocument();
      expect(screen.getByText('🤩')).toBeInTheDocument();
      expect(screen.getByText('😊')).toBeInTheDocument();
      expect(screen.getByText('🙂')).toBeInTheDocument();
      expect(screen.getByText('😐')).toBeInTheDocument();
      expect(screen.getByText('😞')).toBeInTheDocument();
    });
  });

  it('renders conversion by class type section', async () => {
    mockApiResponse(mockStats);
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Conversion by Class Type')).toBeInTheDocument();
      expect(screen.getByText('bjj')).toBeInTheDocument();
      expect(screen.getByText('muay_thai')).toBeInTheDocument();
      expect(screen.getByText('boxing')).toBeInTheDocument();
    });
  });

  it('shows empty follow-up state when no trials need follow-up', async () => {
    mockApiResponse(mockStats);
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('All trials have been followed up')).toBeInTheDocument();
    });
  });

  it('renders follow-up table when leads need follow-up', async () => {
    mockApiResponse(mockFollowUp);
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Trials Needing Follow-up')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  it('renders follow-up table column headers', async () => {
    mockApiResponse(mockFollowUp);
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Trial Date')).toBeInTheDocument();
      expect(screen.getByText('Interest')).toBeInTheDocument();
      expect(screen.getByText('Rating')).toBeInTheDocument();
      expect(screen.getByText('Days Ago')).toBeInTheDocument();
    });
  });

  it('renders interest level badges in follow-up table', async () => {
    mockApiResponse(mockFollowUp);
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('hot')).toBeInTheDocument();
      expect(screen.getByText('cold')).toBeInTheDocument();
    });
  });

  it('shows zeros when API fails with 500', async () => {
    mockApiError();
    render(<TrialConversionDashboard />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Trials Completed')).toBeInTheDocument();
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });
});
