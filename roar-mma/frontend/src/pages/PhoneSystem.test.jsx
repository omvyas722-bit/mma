import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import PhoneSystem from './PhoneSystem';

const API_URL = 'http://localhost:3001';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>{children}</NotificationProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

const mockCalls = [
  {
    id: 1, caller_name: 'John Doe', from_number: '+61412345678', to_number: '+61899999999',
    duration: 120, call_time: '2024-06-01T10:30:00Z', status: 'completed', transcript: "Hello, I'm interested in your BJJ classes. Can you tell me more?",
    needs_followup: false,
  },
  {
    id: 2, caller_name: null, from_number: '+61498765432', to_number: '+61899999999',
    duration: 15, call_time: '2024-06-01T11:00:00Z', status: 'missed', transcript: null,
    needs_followup: true,
  },
  {
    id: 3, caller_name: 'Jane Smith', from_number: '+61455556666', to_number: '+61899999999',
    duration: 0, call_time: '2024-06-02T09:00:00Z', status: 'completed', transcript: '',
    needs_followup: false,
  },
];

const mockVoicemails = [
  {
    id: 1, from_number: '+61412345678', duration: 45, received_at: '2024-06-01T10:30:00Z',
    transcript: 'Hi, this is John. Please call me back about membership options.', listened: false,
  },
  {
    id: 2, from_number: '+61498765432', duration: 30, received_at: '2024-06-02T14:00:00Z',
    transcript: 'Second voicemail about class schedules.', listened: true,
  },
];

const mockAnalytics = { total_calls: 150, answered: 120, missed: 30, avg_duration: 90 };

const mockSettings = {
  greeting_message: 'Welcome to ROAR MMA', business_hours: 'Mon-Fri 6am-8pm',
  ai_personality: 'friendly', call_timeout: 60, language: 'en',
};

describe('PhoneSystem Page', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_URL}/api/phone/calls`, () => HttpResponse.json({ calls: mockCalls })),
      http.get(`${API_URL}/api/phone/calls/followup/pending`, () => HttpResponse.json({ calls: [] })),
      http.get(`${API_URL}/api/phone/voicemails/new`, () => HttpResponse.json({ voicemails: mockVoicemails })),
      http.post(`${API_URL}/api/phone/voicemails/:id/listened`, () => HttpResponse.json({ success: true })),
      http.get(`${API_URL}/api/phone/analytics`, () => HttpResponse.json(mockAnalytics)),
      http.get(`${API_URL}/api/phone/settings`, () => HttpResponse.json({ settings: mockSettings })),
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('renders all four tabs', () => {
    render(<PhoneSystem />, { wrapper: createWrapper() });
    expect(screen.getByText('AI Phone System')).toBeInTheDocument();
    expect(screen.getByText('Recent Calls')).toBeInTheDocument();
    expect(screen.getByText('Voicemails')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('AI Settings')).toBeInTheDocument();
  });

  it('shows Recent Calls data with caller names and status badges', async () => {
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('+61498765432')).toBeInTheDocument();
      expect(screen.getAllByText('completed').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('missed')).toBeInTheDocument();
      expect(screen.getByText(/120s/)).toBeInTheDocument();
    });
  });

  it('shows follow-up badge for calls needing follow-up', async () => {
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await waitFor(() => {
      const followupBadges = screen.getAllByText('Follow-up');
      expect(followupBadges.length).toBeGreaterThan(0);
    });
  });

  it('shows follow-up pending banner when calls need follow-up', async () => {
    server.use(
      http.get(`${API_URL}/api/phone/calls/followup/pending`, () => HttpResponse.json({ calls: [{ id: 1 }, { id: 2 }] })),
      http.get(`${API_URL}/api/phone/calls`, () => HttpResponse.json({ calls: [] })),
    );
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/2 calls need follow-up/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no calls', async () => {
    server.use(
      http.get(`${API_URL}/api/phone/calls/followup/pending`, () => HttpResponse.json({ calls: [] })),
      http.get(`${API_URL}/api/phone/calls`, () => HttpResponse.json({ calls: [] })),
    );
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No calls yet')).toBeInTheDocument();
    });
  });

  it('expands transcript details on click', async () => {
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByText('View transcript'));
    await waitFor(() => {
      expect(screen.getByText(/I'm interested in your BJJ classes/)).toBeInTheDocument();
    });
  });

  it('shows Voicemails tab with from_number and mark heard button', async () => {
    const user = userEvent.setup();
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Voicemails'));
    await waitFor(() => {
      expect(screen.getByText('+61412345678')).toBeInTheDocument();
      expect(screen.getByText('+61498765432')).toBeInTheDocument();
      expect(screen.getByText(/45s/)).toBeInTheDocument();
      expect(screen.getAllByText('Mark heard').length).toBe(1);
    });
  });

  it('marks voicemail as heard on button click', async () => {
    server.use(
      http.post(`${API_URL}/api/phone/voicemails/:id/listened`, () =>
        HttpResponse.json({ success: true }),
      ),
    );
    const user = userEvent.setup();
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Voicemails'));
    await waitFor(() => expect(screen.getByText('+61412345678')).toBeInTheDocument());
    await user.click(screen.getByText('Mark heard'));
    await waitFor(() => {
      expect(screen.getByText('Marked as heard')).toBeInTheDocument();
    });
  });

  it('shows empty state when no voicemails', async () => {
    server.use(
      http.get(`${API_URL}/api/phone/voicemails/new`, () => HttpResponse.json({ voicemails: [] })),
    );
    const user = userEvent.setup();
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Voicemails'));
    await waitFor(() => {
      expect(screen.getByText('No new voicemails')).toBeInTheDocument();
    });
  });

  it('shows Analytics tab with data grid', async () => {
    const user = userEvent.setup();
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Total Calls')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Answered by AI')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('Missed')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('Avg Duration')).toBeInTheDocument();
      expect(screen.getByText('90s')).toBeInTheDocument();
    });
  });

  it('shows empty state when analytics returns null', async () => {
    server.use(
      http.get(`${API_URL}/api/phone/analytics`, () => HttpResponse.json(null)),
    );
    const user = userEvent.setup();
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Analytics'));
    await waitFor(() => {
      expect(screen.getByText('No analytics data yet')).toBeInTheDocument();
    });
  });

  it('shows Settings tab with key-value pairs', async () => {
    const user = userEvent.setup();
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await user.click(screen.getByText('AI Settings'));
    await waitFor(() => {
      expect(screen.getByText('AI Phone Receptionist Settings')).toBeInTheDocument();
      expect(screen.getByText('greeting message')).toBeInTheDocument();
      expect(screen.getByText('Welcome to ROAR MMA')).toBeInTheDocument();
      expect(screen.getByText('business hours')).toBeInTheDocument();
      expect(screen.getByText('Mon-Fri 6am-8pm')).toBeInTheDocument();
      expect(screen.getByText('ai personality')).toBeInTheDocument();
      expect(screen.getByText('friendly')).toBeInTheDocument();
      expect(screen.getByText('call timeout')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
    });
  });

  it('shows configure message when settings are empty', async () => {
    server.use(
      http.get(`${API_URL}/api/phone/settings`, () => HttpResponse.json({ settings: {} })),
    );
    const user = userEvent.setup();
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await user.click(screen.getByText('AI Settings'));
    await waitFor(() => {
      expect(screen.getByText('Configure your AI phone receptionist settings in the backend.')).toBeInTheDocument();
    });
  });

  it('handles API error by showing empty state for calls', async () => {
    server.use(
      http.get(`${API_URL}/api/phone/calls/followup/pending`, () => HttpResponse.json({ calls: [] })),
      http.get(`${API_URL}/api/phone/calls`, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No calls yet')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('switches between all four tabs correctly', async () => {
    const user = userEvent.setup();
    render(<PhoneSystem />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    await user.click(screen.getByText('Voicemails'));
    await waitFor(() => expect(screen.getByText('+61412345678')).toBeInTheDocument());
    await user.click(screen.getByText('Analytics'));
    await waitFor(() => expect(screen.getByText('150')).toBeInTheDocument());
    await user.click(screen.getByText('AI Settings'));
    await waitFor(() => expect(screen.getByText('greeting message')).toBeInTheDocument());
    await user.click(screen.getByText('Recent Calls'));
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
  });
});
