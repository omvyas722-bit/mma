import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import LeadsWizard from './LeadsWizard';

const API_URL = 'http://localhost:3001';

const wizardHandlers = [
  http.post(`${API_URL}/api/leads`, () => HttpResponse.json({ id: 99 }, { status: 201 })),
];

afterEach(() => server.resetHandlers());
beforeEach(() => server.use(...wizardHandlers));

const createWrapper = (initialEntries) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return ({ children }) => (
    <MemoryRouter initialEntries={initialEntries || ['/wizard']}>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('LeadsWizard Page', () => {
  it('renders heading and step indicator', () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    expect(screen.getByText('New Lead Wizard')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('shows all 5 step labels', () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Interests')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('renders progress bar segments', () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    const segments = document.querySelectorAll('.rounded-full');
    expect(segments.length).toBe(5);
  });

  it('renders step 0 with personal info fields', () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Smith')).toBeInTheDocument();
  });

  it('shows validation error for first name on Next', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    const firstNameInput = screen.getByPlaceholderText('John');
    await userEvent.clear(firstNameInput);
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getAllByText('Required').length).toBeGreaterThanOrEqual(1);
  });

  it('shows validation error for last name on Next', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    const lastNameInput = screen.getByPlaceholderText('Smith');
    await userEvent.clear(lastNameInput);
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getAllByText('Required').length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to step 1 with valid personal info', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Contact Details')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
  });

  it('step 1 shows email and phone fields', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0400123456')).toBeInTheDocument();
  });

  it('step 1 validates phone is required', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getAllByText('Required').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('step 1 validates email format', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    const emailInput = screen.getByPlaceholderText('john@example.com');
    await userEvent.type(emailInput, 'invalid-email');
    const phoneInput = screen.getByPlaceholderText('0400123456');
    await userEvent.type(phoneInput, '0400000000');
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('navigates to step 2 with valid contact details', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('john@example.com'), 'john@example.com');
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Source & Location')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
  });

  it('step 2 shows source and location selects', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getByDisplayValue('Website')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rockingham')).toBeInTheDocument();
  });

  it('step 2 allows changing source selection', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    const sourceSelect = screen.getByDisplayValue('Website');
    await userEvent.selectOptions(sourceSelect, 'facebook');
    expect(screen.getByDisplayValue('Facebook')).toBeInTheDocument();
  });

  it('navigates to step 3 with source and location', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Interests & Notes')).toBeInTheDocument();
    expect(screen.getByText('Step 4 of 5')).toBeInTheDocument();
  });

  it('step 3 shows interests and notes textareas', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getByPlaceholderText('BJJ, Muay Thai, MMA, Boxing...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Any additional info...')).toBeInTheDocument();
  });

  it('step 3 shows UTM tracking accordion', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getByText('UTM Tracking (optional)')).toBeInTheDocument();
  });

  it('step 3 UTM fields can be typed into', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    const details = screen.getByText('UTM Tracking (optional)');
    await userEvent.click(details);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('google')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('cpc')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('summer_promo')).toBeInTheDocument();
    });
  });

  it('pre-fills UTM fields from URL params', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper(['/wizard?utm_source=google&utm_medium=cpc&utm_campaign=summer']) });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    const details = screen.getByText('UTM Tracking (optional)');
    await userEvent.click(details);
    await waitFor(() => {
      expect(screen.getByDisplayValue('google')).toBeInTheDocument();
      expect(screen.getByDisplayValue('cpc')).toBeInTheDocument();
      expect(screen.getByDisplayValue('summer')).toBeInTheDocument();
    });
  });

  it('navigates to step 4 review', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Review & Submit')).toBeInTheDocument();
    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();
  });

  it('review step shows summary of all entered data', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('john@example.com'), 'john@test.com');
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('BJJ, Muay Thai, MMA, Boxing...'), 'BJJ, Muay Thai');
    await userEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('0400123456')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
      expect(screen.getByText('BJJ, Muay Thai')).toBeInTheDocument();
    });
  });

  it('submits lead on Create Lead click', async () => {
    const postSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/api/leads`, async ({ request }) => {
        const body = await request.json();
        postSpy(body);
        return HttpResponse.json({ id: 99 }, { status: 201 });
      }),
    );
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Create Lead')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Create Lead'));
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalled();
      expect(postSpy.mock.calls[0][0]).toMatchObject({
        first_name: 'John',
        last_name: 'Smith',
        phone: '0400123456',
      });
    });
  });

  it('shows submitting state on Create Lead click', async () => {
    server.use(
      http.post(`${API_URL}/api/leads`, () => new Promise(() => {})),
    );
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Create Lead')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Create Lead'));
    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  it('back button returns to previous step', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Contact Details')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
  });

  it('cancel button navigates to /leads', async () => {
    mockNavigate.mockClear();
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('Cancel'));
    expect(mockNavigate).toHaveBeenCalledWith('/leads');
  });

  it('progress bar first segment is red on step 0', () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    const segments = document.querySelectorAll('.rounded-full');
    expect(segments[0].className).toContain('bg-red-500');
    expect(segments[1].className).toContain('bg-gray-200');
  });

  it('progress bar shows completed steps as green', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper() });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    const segments = document.querySelectorAll('.rounded-full');
    expect(segments[0].className).toContain('bg-green-500');
    expect(segments[1].className).toContain('bg-red-500');
  });

  it('review step shows UTM when provided via URL', async () => {
    render(<LeadsWizard />, { wrapper: createWrapper(['/wizard?utm_source=google&utm_medium=cpc&utm_campaign=summer']) });
    await userEvent.type(screen.getByPlaceholderText('John'), 'John');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Smith');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.type(screen.getByPlaceholderText('0400123456'), '0400123456');
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    await userEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText(/google \/ cpc \/ summer/)).toBeInTheDocument();
    });
  });
});
