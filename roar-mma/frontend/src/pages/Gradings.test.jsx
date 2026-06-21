import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import Gradings from './Gradings';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';

afterEach(() => server.resetHandlers());

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter><QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider></BrowserRouter>
  );
};

describe('Gradings Page', () => {
  it('renders header and schedule button', () => {
    render(<Gradings />, { wrapper: createWrapper() });
    expect(screen.getByText('Belt Gradings')).toBeInTheDocument();
    expect(screen.getByText('+ Schedule Grading')).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    render(<Gradings />, { wrapper: createWrapper() });
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('displays grading sessions after loading', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('June Grading')).toBeInTheDocument(); });
  });

  it('renders status filter', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('All Sessions')).toBeInTheDocument(); });
  });

  it('shows session details after loading', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('scheduled')).toBeInTheDocument();
      expect(screen.getByText('Bring gi')).toBeInTheDocument();
      expect(screen.getByText(/rockingham/i)).toBeInTheDocument();
    });
  });

  it('shows error state when sessions API fails', async () => {
    server.use(http.get('http://localhost:3001/api/grading/sessions', () => HttpResponse.error()));
    render(<Gradings />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to load grading sessions')).toBeInTheDocument();
    });
  });

  it('shows empty state when no sessions returned', async () => {
    server.use(http.get('http://localhost:3001/api/grading/sessions', () => HttpResponse.json({ sessions: [] })));
    render(<Gradings />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('No grading sessions')).toBeInTheDocument(); });
  });

  it('changes status filter', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('All Sessions')).toBeInTheDocument(); });
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'completed' } });
    expect(select.value).toBe('completed');
  });

  it('opens schedule modal on button click', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('+ Schedule Grading')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('+ Schedule Grading'));
    await waitFor(() => { expect(screen.getByRole('dialog', { name: 'Schedule Grading Session' })).toBeInTheDocument(); });
  });

  it('shows schedule form fields in modal', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('+ Schedule Grading')).toBeInTheDocument(); });
    fireEvent.click(screen.getByText('+ Schedule Grading'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Session name')).toBeInTheDocument();
      expect(screen.getByText('Create Session')).toBeInTheDocument();
    });
  });

  it('switches to Belt Registry tab', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Belt Registry'));
    await waitFor(() => { expect(screen.getByText('No belt records found')).toBeInTheDocument(); });
  });

  it('shows belt registry table columns', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Belt Registry'));
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Current Belt')).toBeInTheDocument();
      expect(screen.getByText('Discipline')).toBeInTheDocument();
      expect(screen.getByText('Eligible?')).toBeInTheDocument();
    });
  });

  it('switches to Fighter Leaderboard tab', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Fighter Leaderboard'));
    await waitFor(() => { expect(screen.getByText('No fighters found')).toBeInTheDocument(); });
  });

  it('shows leaderboard table columns', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Fighter Leaderboard'));
    await waitFor(() => {
      expect(screen.getByText('Rank')).toBeInTheDocument();
      expect(screen.getByText('Fighter')).toBeInTheDocument();
      expect(screen.getByText('Win Rate')).toBeInTheDocument();
    });
  });

  it('shows View Participants button on session card', async () => {
    render(<Gradings />, { wrapper: createWrapper() });
    await waitFor(() => { expect(screen.getByText('View Participants')).toBeInTheDocument(); });
  });
});
