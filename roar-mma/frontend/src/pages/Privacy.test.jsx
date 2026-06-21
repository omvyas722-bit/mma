import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import Privacy from './Privacy';

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

const mockMembers = [
  { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
  { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
];

const mockConsents = { marketing: true, sms: false, email_notifications: true, photos: false, data_sharing: true };

const mockPolicies = [
  { id: 1, data_type: 'Member Records', retention_days: 365, auto_delete: true },
  { id: 2, data_type: 'Payment History', retention_days: 1825, auto_delete: false },
  { id: 3, data_type: 'Attendance Logs', retention_days: 730, auto_delete: true },
];

const mockExports = [
  { id: 1, member_id: 1, status: 'completed', requested_at: '2024-06-01T10:00:00Z' },
  { id: 2, member_id: 2, status: 'pending', requested_at: '2024-06-15T10:00:00Z' },
  { id: 3, member_id: 3, status: 'failed', requested_at: '2024-05-01T10:00:00Z' },
];

describe('Privacy Page', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_URL}/api/privacy/consents/:memberId`, () =>
        HttpResponse.json(mockConsents),
      ),
      http.put(`${API_URL}/api/privacy/consents/:memberId/:type`, () =>
        HttpResponse.json({ success: true }),
      ),
      http.get(`${API_URL}/api/privacy/retention`, () =>
        HttpResponse.json({ policies: mockPolicies }),
      ),
      http.put(`${API_URL}/api/privacy/retention/:id`, () =>
        HttpResponse.json({ success: true }),
      ),
      http.get(`${API_URL}/api/privacy/exports`, () =>
        HttpResponse.json({ exports: mockExports }),
      ),
      http.post(`${API_URL}/api/privacy/export`, () =>
        HttpResponse.json({ id: 4, status: 'pending', requested_at: new Date().toISOString() }, { status: 201 }),
      ),
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('renders all three tabs', () => {
    render(<Privacy />, { wrapper: createWrapper() });
    expect(screen.getByText('Privacy & GDPR')).toBeInTheDocument();
    expect(screen.getByText('Member Consents')).toBeInTheDocument();
    expect(screen.getByText('Retention Policies')).toBeInTheDocument();
    expect(screen.getByText('Data Export')).toBeInTheDocument();
  });

  it('shows Member Consents tab by default with search input', () => {
    render(<Privacy />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText('Search members by name...')).toBeInTheDocument();
  });

  it('searches members and shows dropdown results', async () => {
    server.use(
      http.get(`${API_URL}/api/members`, () =>
        HttpResponse.json({ members: mockMembers, total: 2 }),
      ),
    );
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    const searchInput = screen.getByPlaceholderText('Search members by name...');
    await user.type(searchInput, 'Jo');
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('selects a member and shows consent toggles', async () => {
    server.use(
      http.get(`${API_URL}/api/members`, () =>
        HttpResponse.json({ members: mockMembers }),
      ),
    );
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    const searchInput = screen.getByPlaceholderText('Search members by name...');
    await user.type(searchInput, 'Jo');
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    await user.click(screen.getByText('John Doe'));
    await waitFor(() => {
      expect(screen.getByText('Consent Preferences')).toBeInTheDocument();
      expect(screen.getByText('marketing')).toBeInTheDocument();
      expect(screen.getByText('sms')).toBeInTheDocument();
      expect(screen.getByText('email notifications')).toBeInTheDocument();
    });
  });

  it('toggles consent checkbox via mutation', async () => {
    server.use(
      http.get(`${API_URL}/api/members`, () =>
        HttpResponse.json({ members: mockMembers }),
      ),
    );
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    const searchInput = screen.getByPlaceholderText('Search members by name...');
    await user.type(searchInput, 'Jo');
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    await user.click(screen.getByText('John Doe'));
    await waitFor(() => expect(screen.getByText('Consent Preferences')).toBeInTheDocument());
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    expect(checkboxes[0]).toBeChecked();
    await user.click(checkboxes[1]);
    await waitFor(() => {
      expect(screen.getByText('Consent updated')).toBeInTheDocument();
    });
  });

  it('shows empty state when member has no consents', async () => {
    server.use(
      http.get(`${API_URL}/api/members`, () =>
        HttpResponse.json({ members: mockMembers }),
      ),
      http.get(`${API_URL}/api/privacy/consents/:memberId`, () =>
        HttpResponse.json({}),
      ),
    );
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    const searchInput = screen.getByPlaceholderText('Search members by name...');
    await user.type(searchInput, 'Jo');
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    await user.click(screen.getByText('John Doe'));
    await waitFor(() => {
      expect(screen.getByText('No consents recorded for this member.')).toBeInTheDocument();
    });
  });

  it('switches to retention tab and shows policies table', async () => {
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Retention Policies'));
    await waitFor(() => {
      expect(screen.getByText('Member Records')).toBeInTheDocument();
      expect(screen.getByText('Payment History')).toBeInTheDocument();
      expect(screen.getByText('Attendance Logs')).toBeInTheDocument();
      expect(screen.getByText('365 days')).toBeInTheDocument();
      expect(screen.getByText('1825 days')).toBeInTheDocument();
    });
  });

  it('shows auto-delete badges in retention table', async () => {
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Retention Policies'));
    await waitFor(() => {
      const yesBadges = screen.getAllByText('Yes');
      expect(yesBadges.length).toBe(2);
      expect(screen.getByText('No')).toBeInTheDocument();
    });
  });

  it('toggles auto-delete via button in retention tab', async () => {
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Retention Policies'));
    await waitFor(() => expect(screen.getByText('Member Records')).toBeInTheDocument());
    const toggleBtns = screen.getAllByText('Toggle Auto-Delete');
    await user.click(toggleBtns[0]);
    await waitFor(() => {
      expect(screen.getByText('Policy updated')).toBeInTheDocument();
    });
  });

  it('shows empty state when no retention policies', async () => {
    server.use(
      http.get(`${API_URL}/api/privacy/retention`, () =>
        HttpResponse.json({ policies: [] }),
      ),
    );
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Retention Policies'));
    await waitFor(() => {
      expect(screen.getByText('No retention policies configured')).toBeInTheDocument();
    });
  });

  it('switches to data export tab and shows export history', async () => {
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Data Export'));
    await waitFor(() => {
      expect(screen.getByText('Export History')).toBeInTheDocument();
      expect(screen.getByText('Member #1')).toBeInTheDocument();
      expect(screen.getByText('Member #2')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });
  });

  it('shows empty state when no export history', async () => {
    server.use(
      http.get(`${API_URL}/api/privacy/exports`, () =>
        HttpResponse.json({ exports: [] }),
      ),
    );
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Data Export'));
    await waitFor(() => {
      expect(screen.getByText('No export history')).toBeInTheDocument();
    });
  });

  it('requests a data export for selected member', async () => {
    server.use(
      http.get(`${API_URL}/api/members`, () =>
        HttpResponse.json({ members: mockMembers }),
      ),
    );
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Data Export'));
    const exportSearchInput = screen.getAllByPlaceholderText('Search...')[0];
    await user.type(exportSearchInput, 'Jo');
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    await user.click(screen.getByText('John Doe'));
    await user.click(screen.getByText('Request Export'));
    await waitFor(() => {
      expect(screen.getByText('Export requested')).toBeInTheDocument();
    });
  });

  it('disables request export button when no member selected', async () => {
    render(<Privacy />, { wrapper: createWrapper() });
    await userEvent.setup().click(screen.getByText('Data Export'));
    await waitFor(() => {
      const btn = screen.getByText('Request Export');
      expect(btn).toBeDisabled();
    });
  });

  it('handles API error in retention tab gracefully', async () => {
    server.use(
      http.get(`${API_URL}/api/privacy/retention`, () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Retention Policies'));
    await waitFor(() => {
      expect(screen.getByText('No retention policies configured')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    const user = userEvent.setup();
    render(<Privacy />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText('Search members by name...')).toBeInTheDocument();
    await user.click(screen.getByText('Retention Policies'));
    expect(screen.queryByPlaceholderText('Search members by name...')).not.toBeInTheDocument();
    await user.click(screen.getByText('Data Export'));
    expect(screen.queryByText('Data Type')).not.toBeInTheDocument();
    await user.click(screen.getByText('Member Consents'));
    expect(screen.getByPlaceholderText('Search members by name...')).toBeInTheDocument();
  });
});
