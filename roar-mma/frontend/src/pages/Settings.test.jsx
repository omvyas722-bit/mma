import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import Settings from './Settings';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true, user: { name: 'Admin', role: 'owner' } }),
}));

afterEach(() => server.resetHandlers());
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Settings Page', () => {
  it('renders the settings heading', async () => {
    render(<Settings />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument());
  });

  it('shows all tab navigation buttons', async () => {
    render(<Settings />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('General')).toBeInTheDocument();
      expect(screen.getByText('Locations')).toBeInTheDocument();
      expect(screen.getByText('Membership')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Integrations')).toBeInTheDocument();
      expect(screen.getByText('Grading')).toBeInTheDocument();
      expect(screen.getByText('API Keys')).toBeInTheDocument();
      expect(screen.getByText('Webhooks')).toBeInTheDocument();
      expect(screen.getByText('Roles')).toBeInTheDocument();
      expect(screen.getByText('Tracking')).toBeInTheDocument();
    });
  });

  it('shows gym name in General tab by default', async () => {
    render(<Settings />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByDisplayValue('ROAR MMA')).toBeInTheDocument());
  });

  it('shows Save Changes button when gym name is changed', async () => {
    render(<Settings />, { wrapper: createWrapper() });
    await waitFor(async () => {
      const input = screen.getByDisplayValue('ROAR MMA');
      await userEvent.clear(input);
      await userEvent.type(input, 'ROAR MMA 2');
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  it('switches to Locations tab and shows location entries', async () => {
    render(<Settings />, { wrapper: createWrapper() });
    await waitFor(async () => {
      const tabs = screen.getAllByText('Locations');
      await userEvent.click(tabs[0]);
      expect(screen.getByDisplayValue('Rockingham')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Bibra Lake')).toBeInTheDocument();
    });
  });

  it('switches to Notifications tab and shows toggle switches', async () => {
    render(<Settings />, { wrapper: createWrapper() });
    await waitFor(async () => {
      await userEvent.click(screen.getByText('Notifications'));
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      expect(screen.getByText('SMS Notifications')).toBeInTheDocument();
    });
  });

  it('switches to Webhooks tab and shows webhook content', async () => {
    render(<Settings />, { wrapper: createWrapper() });
    await waitFor(async () => {
      await userEvent.click(screen.getByText('Webhooks'));
      expect(screen.getByText('Test Webhook')).toBeInTheDocument();
    });
  });

  it('switches to Membership tab and shows settings', async () => {
    render(<Settings />, { wrapper: createWrapper() });
    await waitFor(async () => {
      await userEvent.click(screen.getByText('Membership'));
      expect(screen.getByText('Trial Period')).toBeInTheDocument();
    });
  });

  it('shows error state on settings load failure', async () => {
    server.use(http.get('http://localhost:3001/api/settings', () => HttpResponse.json({ error: 'fail' }, { status: 500 })));
    render(<Settings />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument());
  });
});
