import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import MakeupClasses from './MakeupClasses';

const API_URL = 'http://localhost:3001';

const activeMakeups = [
  { id: 1, member_id: 1, member_name: 'John Doe', created_at: '2026-06-01T00:00:00Z', expires_at: '2026-07-01T00:00:00Z', used_at: null },
  { id: 2, member_id: 2, member_name: 'Jane Smith', created_at: '2026-05-15T00:00:00Z', expires_at: '2026-06-15T00:00:00Z', used_at: '2026-06-10T00:00:00Z' },
];

const makeupHandlers = [
  http.get(`${API_URL}/api/makeup-classes/active`, () => HttpResponse.json({
    makeups: activeMakeups,
  })),
  http.post(`${API_URL}/api/makeup-classes/:id/use`, () => HttpResponse.json({ success: true })),
  http.delete(`${API_URL}/api/makeup-classes/:id`, () => HttpResponse.json({ success: true })),
  http.post(`${API_URL}/api/makeup-classes`, () => HttpResponse.json({ id: 99 }, { status: 201 })),
  http.get(`${API_URL}/api/makeup-classes/member/:memberId`, ({ params }) => {
    const makeups = params.memberId === '1'
      ? [{ id: 3, created_at: '2026-06-05T00:00:00Z', used_at: null }]
      : [];
    return HttpResponse.json({ makeups });
  }),
  http.get(`${API_URL}/api/members`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('query') || '';
    const results = [];
    if (q.toLowerCase().includes('john')) {
      results.push({ id: 1, first_name: 'John', last_name: 'Doe' });
    }
    if (q.toLowerCase().includes('jane')) {
      results.push({ id: 2, first_name: 'Jane', last_name: 'Smith' });
    }
    return HttpResponse.json({ members: results });
  }),
];

afterEach(() => server.resetHandlers());
beforeEach(() => server.use(...makeupHandlers));

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

describe('MakeupClasses Page', () => {
  it('renders the heading', () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    expect(screen.getByText('Makeup Classes')).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', () => {
    server.use(
      http.get(`${API_URL}/api/makeup-classes/active`, () => new Promise(() => {})),
    );
    render(<MakeupClasses />, { wrapper: createWrapper() });
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows empty state when no active makeups', async () => {
    server.use(
      http.get(`${API_URL}/api/makeup-classes/active`, () => HttpResponse.json({ makeups: [] })),
    );
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No active makeup classes')).toBeInTheDocument();
    });
  });

  it('renders active makeups list with member names', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows correct status badges', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Available').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Used').length).toBeGreaterThan(0);
    });
  });

  it('shows Use button only on available makeups', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await waitFor(() => {
      const useBtns = screen.getAllByText('Use');
      expect(useBtns.length).toBe(1);
    });
  });

  it('shows Delete button on all makeups', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await waitFor(() => {
      const deleteBtns = screen.getAllByText('Delete');
      expect(deleteBtns.length).toBe(2);
    });
  });

  it('calls use mutation on Use click', async () => {
    const useSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/api/makeup-classes/:id/use`, ({ params }) => {
        useSpy(params.id);
        return HttpResponse.json({ success: true });
      }),
    );
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Use').length).toBe(1);
    });
    await userEvent.click(screen.getByText('Use'));
    await waitFor(() => {
      expect(useSpy).toHaveBeenCalledWith('1');
    });
  });

  it('calls delete mutation on Delete click', async () => {
    const deleteSpy = vi.fn();
    server.use(
      http.delete(`${API_URL}/api/makeup-classes/:id`, ({ params }) => {
        deleteSpy(params.id);
        return HttpResponse.json({ success: true });
      }),
    );
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Delete').length).toBeGreaterThan(0);
    });
    await userEvent.click(screen.getAllByText('Delete')[0]);
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalled();
    });
  });

  it('shows active count in tab', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Active (2)')).toBeInTheDocument();
    });
  });

  it('switches to Lookup Member tab', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('Lookup Member'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search member...')).toBeInTheDocument();
    });
  });

  it('opens grant makeup modal on + Grant Makeup click', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Grant Makeup'));
    await waitFor(() => {
      expect(screen.getByText('Grant Makeup Class')).toBeInTheDocument();
    });
  });

  it('grant modal has member search, expiry, reason fields', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Grant Makeup'));
    await waitFor(() => {
      expect(screen.getByText('Grant Makeup Class')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Missed class')).toBeInTheDocument();
  });

  it('grant modal Grant button disabled without member', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Grant Makeup'));
    await waitFor(() => {
      expect(screen.getByText('Grant')).toBeDisabled();
    });
  });

  it('grant modal searches members', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Grant Makeup'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'John');
    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('grant modal selects member from results', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Grant Makeup'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'John');
    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    });
    await userEvent.click(screen.getAllByText('John Doe')[0]);
    expect(screen.getByText('Change')).toBeInTheDocument();
  });

  it('grant modal submits mutation', async () => {
    const grantSpy = vi.fn();
    server.use(
      http.post(`${API_URL}/api/makeup-classes`, async ({ request }) => {
        const body = await request.json();
        grantSpy(body);
        return HttpResponse.json({ data: { id: 99 } }, { status: 201 });
      }),
    );
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Grant Makeup'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'John');
    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    });
    await userEvent.click(screen.getAllByText('John Doe')[0]);
    await waitFor(() => {
      expect(screen.getByText('Grant')).not.toBeDisabled();
    });
    await userEvent.click(screen.getByText('Grant'));
    await waitFor(() => {
      expect(grantSpy).toHaveBeenCalled();
      expect(grantSpy.mock.calls[0][0]).toMatchObject({
        member_id: 1,
        expires_in_days: 30,
      });
    });
  });

  it('grant modal closes on Cancel', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('+ Grant Makeup'));
    await waitFor(() => {
      expect(screen.getByText('Grant Makeup Class')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Grant Makeup Class')).not.toBeInTheDocument();
    });
  });

  it('lookup member tab searches and shows results', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('Lookup Member'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search member...')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search member...');
    await userEvent.type(searchInput, 'John');
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('lookup member tab shows member makeups after selection', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('Lookup Member'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search member...')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search member...');
    await userEvent.type(searchInput, 'John');
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('John Doe'));
    await waitFor(() => {
      expect(screen.getByText('Available')).toBeInTheDocument();
    });
  });

  it('lookup member tab shows empty state for member with no makeups', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByText('Lookup Member'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search member...')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search member...');
    await userEvent.type(searchInput, 'Jane');
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Jane Smith'));
    await waitFor(() => {
      expect(screen.getByText('No makeup classes for this member')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get(`${API_URL}/api/makeup-classes/active`, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
    );
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No active makeup classes')).toBeInTheDocument();
    }, { timeout: 12000 });
  });

  it('active tab highlights when selected', async () => {
    render(<MakeupClasses />, { wrapper: createWrapper() });
    await waitFor(() => {
      const activeTab = screen.getByText(/^Active/);
      expect(activeTab.className).toContain('border-red-600');
    });
  });
});
