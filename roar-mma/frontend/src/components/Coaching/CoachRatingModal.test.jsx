import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server';
import { NotificationProvider } from '../../contexts/NotificationContext';
import CoachRatingModal from './CoachRatingModal';

const API_URL = 'http://localhost:3001';

const mockMember = { id: 1, first_name: 'John', last_name: 'Doe' };

afterEach(() => server.resetHandlers());

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
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

describe('CoachRatingModal', () => {
  it('does not render when isOpen is false', () => {
    render(<CoachRatingModal isOpen={false} onClose={() => {}} member={mockMember} />, { wrapper: createWrapper() });
    expect(screen.queryByText(/Rate John Doe/i)).not.toBeInTheDocument();
  });

  it('renders when isOpen is true with member name', () => {
    render(<CoachRatingModal isOpen={true} onClose={() => {}} member={mockMember} />, { wrapper: createWrapper() });
    expect(screen.getByText(/Rate John Doe/i)).toBeInTheDocument();
  });

  it('renders all four rating sliders with labels and correct range', () => {
    render(<CoachRatingModal isOpen={true} onClose={() => {}} member={mockMember} />, { wrapper: createWrapper() });
    expect(screen.getByText('Defense')).toBeInTheDocument();
    expect(screen.getByText('Stance')).toBeInTheDocument();
    expect(screen.getByText('Offense')).toBeInTheDocument();
    expect(screen.getByText('Practice Quality')).toBeInTheDocument();

    const sliders = document.querySelectorAll('input[type="range"]');
    expect(sliders).toHaveLength(4);
    sliders.forEach(slider => {
      expect(slider).toHaveAttribute('min', '1');
      expect(slider).toHaveAttribute('max', '10');
    });
  });

  it('renders Cancel and Save Rating buttons', () => {
    render(<CoachRatingModal isOpen={true} onClose={() => {}} member={mockMember} />, { wrapper: createWrapper() });
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save Rating')).toBeInTheDocument();
  });

  it('Cancel button calls onClose', async () => {
    const onClose = vi.fn();
    render(<CoachRatingModal isOpen={true} onClose={onClose} member={mockMember} />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders notes textarea', () => {
    render(<CoachRatingModal isOpen={true} onClose={() => {}} member={mockMember} />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText(/How did they practice today/i)).toBeInTheDocument();
  });

  it('form submission calls the API and calls onClose', async () => {
    const onClose = vi.fn();
    let capturedBody = null;
    server.use(
      http.post(`${API_URL}/api/coaching/1/ratings`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id: 10 }, { status: 201 });
      })
    );
    render(<CoachRatingModal isOpen={true} onClose={onClose} member={mockMember} />, { wrapper: createWrapper() });

    const defenseSlider = document.querySelector('input[name="defense"]');
    fireEvent.change(defenseSlider, { target: { value: '8' } });

    const notesTextarea = screen.getByPlaceholderText(/How did they practice today/i);
    await userEvent.type(notesTextarea, 'Great session today');

    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(capturedBody).toEqual({ defense: 8, notes: 'Great session today' });
  });
});
