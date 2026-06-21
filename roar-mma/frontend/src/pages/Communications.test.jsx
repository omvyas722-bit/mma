import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import Communications from './Communications';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Communications Page', () => {
  it('renders header and compose button', () => {
    render(<Communications />, { wrapper: createWrapper() });
    expect(screen.getByText('Communications')).toBeInTheDocument();
    expect(screen.getByText('+ Compose Message')).toBeInTheDocument();
  });

  it('shows tab navigation', () => {
    render(<Communications />, { wrapper: createWrapper() });
    expect(screen.getByText('history')).toBeInTheDocument();
    expect(screen.getByText('templates')).toBeInTheDocument();
    expect(screen.getByText('scheduled')).toBeInTheDocument();
    expect(screen.getByText('automated')).toBeInTheDocument();
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
  });

  it('displays message history after loading', async () => {
    render(<Communications />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Welcome')).toBeInTheDocument(); });
  });

  it('shows history message metadata', async () => {
    render(<Communications />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByText('EMAIL')).toBeInTheDocument();
      expect(screen.getByText('sent')).toBeInTheDocument();
    });
  });

  it('switches to templates tab', async () => {
    render(<Communications />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('Welcome')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('templates'));
    await waitFor(() => { expect(screen.getByText('Welcome Email')).toBeInTheDocument(); });
  });

  it('switches to approval tab', async () => {
    render(<Communications />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Pending Approval'));
    await waitFor(() => { expect(screen.getByText(/HERMES follow-up/)).toBeInTheDocument(); });
  });

  it('shows error state in history tab', async () => {
    server.use(http.get('http://localhost:3001/api/scheduled-messages', () => HttpResponse.json({ error: 'fail' }, { status: 500 })));
    render(<Communications />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    }, { timeout: 8000 });
  });

  it('shows empty state in history tab', async () => {
    server.use(http.get('http://localhost:3001/api/scheduled-messages', () => HttpResponse.json({ scheduled_messages: [] })));
    render(<Communications />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('No messages sent yet')).toBeInTheDocument(); });
  });

  it('switches to scheduled tab and shows scheduled messages', async () => {
    render(<Communications />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('scheduled'));
    await waitFor(() => { expect(screen.getByText(/Class reminder tomorrow/)).toBeInTheDocument(); });
  });

  it('opens compose modal when clicking compose', async () => {
    render(<Communications />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('+ Compose Message'));
    await waitFor(() => { expect(screen.getByRole('dialog', { name: 'Compose Message' })).toBeInTheDocument(); });
  });

  it('shows form fields in compose modal', async () => {
    render(<Communications />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('+ Compose Message'));
    await waitFor(() => {
      expect(screen.getByText('Channel')).toBeInTheDocument();
      expect(screen.getByText('EMAIL')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    });
  });

  it('shows conversations tab', async () => {
    server.use(http.get('http://localhost:3001/api/messaging/conversations', () => HttpResponse.json({ conversations: [] })));
    render(<Communications />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('conversations'));
    await waitFor(() => { expect(screen.getByText('No conversations yet')).toBeInTheDocument(); });
  });

  it('shows automated tab', async () => {
    server.use(http.get('http://localhost:3001/api/automated-messages', () => HttpResponse.json({ messages: [] })));
    render(<Communications />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('automated'));
    await waitFor(() => { expect(screen.getByText('No automated messages configured.')).toBeInTheDocument(); });
  });
});
