import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Login from './Login';

const mockLogin = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    loading: false,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

afterEach(() => {
  mockLogin.mockReset();
});

describe('Login Page', () => {
  it('renders the login form with heading, inputs, and submit button', () => {
    render(<Login />, { wrapper: createWrapper() });
    expect(screen.getByText('ROAR MMA')).toBeInTheDocument();
    expect(screen.getByText('Management System')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('updates email and password fields on user input', () => {
    render(<Login />, { wrapper: createWrapper() });
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('mypassword');
  });

  it('shows validation error for invalid email format', async () => {
    render(<Login />, { wrapper: createWrapper() });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    const form = screen.getByLabelText('Email address').closest('form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address');
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows loading state on submit and disables button', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {}));
    render(<Login />, { wrapper: createWrapper() });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
    const form = screen.getByLabelText('Email address').closest('form');
    fireEvent.submit(form);
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
  });

  it('calls login with the email and password on submit', async () => {
    mockLogin.mockResolvedValue({ success: true });
    render(<Login />, { wrapper: createWrapper() });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'owner@roarmma.com.au' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'admin123' } });
    const form = screen.getByLabelText('Email address').closest('form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('owner@roarmma.com.au', 'admin123');
    });
  });

  it('displays error message when login returns failure', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
    render(<Login />, { wrapper: createWrapper() });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'wrong@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'badpass' } });
    const form = screen.getByLabelText('Email address').closest('form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    });
  });

  it('shows network error when login throws ERR_NETWORK', async () => {
    mockLogin.mockRejectedValue({ code: 'ERR_NETWORK', message: 'Network Error' });
    render(<Login />, { wrapper: createWrapper() });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
    const form = screen.getByLabelText('Email address').closest('form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to connect to the server');
    });
  });

  it('shows server error message when API returns 500', async () => {
    mockLogin.mockRejectedValue({ response: { status: 500 } });
    render(<Login />, { wrapper: createWrapper() });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
    const form = screen.getByLabelText('Email address').closest('form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error. Please try again later.');
    });
  });

  it('shows generic error for unknown exception shapes', async () => {
    mockLogin.mockRejectedValue({ something: 'unexpected' });
    render(<Login />, { wrapper: createWrapper() });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
    const form = screen.getByLabelText('Email address').closest('form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password. Please try again.');
    });
  });

  it('clears previous error on re-submit', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'First attempt failed' });
    render(<Login />, { wrapper: createWrapper() });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
    const form = screen.getByLabelText('Email address').closest('form');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('First attempt failed');
    });
    mockLogin.mockResolvedValue({ success: true });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('requires both email and password fields to be present', () => {
    render(<Login />, { wrapper: createWrapper() });
    expect(screen.getByLabelText('Email address')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
  });
});
