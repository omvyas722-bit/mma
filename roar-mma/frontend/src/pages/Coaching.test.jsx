import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import Coaching from './Coaching';

const API_URL = 'http://localhost:3001';

const mockStudents = [
  { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', status: 'active', experience_level: 'Intermediate', avg_defense: 7.5, avg_stance: 6.0, avg_offense: 8.0, avg_practice: 7.0, total_ratings: 5, last_rating_date: '2024-06-01' },
  { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', status: 'trial', experience_level: 'Beginner', avg_defense: 4.0, avg_stance: 5.0, avg_offense: 3.5, avg_practice: 6.5, total_ratings: 2, last_rating_date: '2024-05-15' },
  { id: 3, first_name: 'Bob', last_name: 'Johnson', email: 'bob@example.com', status: 'active', experience_level: 'Advanced', avg_defense: 9.0, avg_stance: 8.5, avg_offense: 9.5, avg_practice: 8.0, total_ratings: 10, last_rating_date: null },
];

afterEach(() => server.resetHandlers());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Coaching Page', () => {
  it('displays loading spinner initially', () => {
    render(<Coaching />, { wrapper: createWrapper() });
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders student data in table rows', async () => {
    server.use(
      http.get(`${API_URL}/api/coaching/ratings`, () => {
        return HttpResponse.json(mockStudents);
      })
    );
    render(<Coaching />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('search filters results by student name', async () => {
    server.use(
      http.get(`${API_URL}/api/coaching/ratings`, () => {
        return HttpResponse.json(mockStudents);
      })
    );
    render(<Coaching />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Search students...'), { target: { value: 'Jane' } });
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('sort by name orders alphabetically by last name', async () => {
    server.use(
      http.get(`${API_URL}/api/coaching/ratings`, () => {
        return HttpResponse.json(mockStudents);
      })
    );
    render(<Coaching />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Name'));
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('John Doe');
      expect(rows[2]).toHaveTextContent('Bob Johnson');
      expect(rows[3]).toHaveTextContent('Jane Smith');
    });
  });

  it('sort by Most Rated orders by rating count descending', async () => {
    server.use(
      http.get(`${API_URL}/api/coaching/ratings`, () => {
        return HttpResponse.json(mockStudents);
      })
    );
    render(<Coaching />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Most Rated'));
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Bob Johnson');
      expect(rows[2]).toHaveTextContent('John Doe');
      expect(rows[3]).toHaveTextContent('Jane Smith');
    });
  });

  it('sort by Best Defense orders by avg_defense descending', async () => {
    server.use(
      http.get(`${API_URL}/api/coaching/ratings`, () => {
        return HttpResponse.json(mockStudents);
      })
    );
    render(<Coaching />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Best Defense'));
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Bob Johnson');
      expect(rows[2]).toHaveTextContent('John Doe');
      expect(rows[3]).toHaveTextContent('Jane Smith');
    });
  });

  it('displays empty state when no students returned', async () => {
    server.use(
      http.get(`${API_URL}/api/coaching/ratings`, () => {
        return HttpResponse.json([]);
      })
    );
    render(<Coaching />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/No students found/i)).toBeInTheDocument();
    });
  });
});
