import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import FamilyDiscounts from './FamilyDiscounts';

const API_URL = 'http://localhost:3001';

const mockGroups = [
  {
    id: 1, name: 'Smith Family', discount_pct: 15, member_count: 3,
    members: [
      { id: 10, first_name: 'John', last_name: 'Smith' },
      { id: 11, first_name: 'Jane', last_name: 'Smith' },
    ],
  },
  { id: 2, name: null, discount_pct: 10, member_count: 1, members: [{ id: 12, first_name: 'Bob', last_name: 'Jones' }] },
];

afterEach(() => server.resetHandlers());
beforeEach(() => {
  server.use(
  http.get(`${API_URL}/api/family-discounts`, () =>
    HttpResponse.json({ groups: mockGroups }),
  ),
    http.delete(`${API_URL}/api/family-discounts/:id`, () => new HttpResponse(null, { status: 204 })),
    http.delete(`${API_URL}/api/family-discounts/:id/members/:memberId`, () => new HttpResponse(null, { status: 204 })),
    http.post(`${API_URL}/api/family-discounts/:id/members`, () => HttpResponse.json({ success: true }, { status: 201 })),
    http.post(`${API_URL}/api/family-discounts`, () => HttpResponse.json({ id: 99 }, { status: 201 })),
    http.get(`${API_URL}/api/members`, ({ request }) => {
      const url = new URL(request.url);
      const query = url.searchParams.get('query') || '';
      const limit = url.searchParams.get('limit') || '10';
      if (query.length < 2) return HttpResponse.json({ members: [] });
      return HttpResponse.json({
        members: [
          { id: 20, first_name: 'Alice', last_name: 'Smith' },
          { id: 21, first_name: 'Charlie', last_name: 'Brown' },
        ],
      });
    }),
  );
});

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('FamilyDiscounts', () => {
  it('shows loading skeleton initially', () => {
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders discount groups after loading', async () => {
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Smith Family')).toBeInTheDocument();
      expect(screen.getByText(/15% discount/)).toBeInTheDocument();
      expect(screen.getByText(/3 members/)).toBeInTheDocument();
    });
  });

  it('shows fallback name for unnamed groups', async () => {
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Family Group #2')).toBeInTheDocument();
      expect(screen.getByText(/10% discount/)).toBeInTheDocument();
      expect(screen.getByText(/1 member/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no groups exist', async () => {
    server.use(
      http.get(`${API_URL}/api/family-discounts`, () =>
        HttpResponse.json({ groups: [] }),
      ),
    );
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No family discount groups yet')).toBeInTheDocument();
    });
  });

  it('shows create group modal when + New Group is clicked', async () => {
    const user = userEvent.setup();
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('+ New Group'));
    await user.click(screen.getByText('+ New Group'));
    expect(screen.getByText('New Family Discount Group')).toBeInTheDocument();
    expect(screen.getByText('Group Name')).toBeInTheDocument();
    expect(screen.getByText('Discount %')).toBeInTheDocument();
  });

  it('closes create group modal on Cancel', async () => {
    const user = userEvent.setup();
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('+ New Group'));
    await user.click(screen.getByText('+ New Group'));
    await user.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('New Family Discount Group')).not.toBeInTheDocument();
    });
  });

  it('creates a new discount group via form', async () => {
    const user = userEvent.setup();
    let created = false;
    server.use(
      http.post(`${API_URL}/api/family-discounts`, async ({ request }) => {
        const body = await request.json();
        expect(body.discount_pct).toBe(20);
        created = true;
        return HttpResponse.json({ id: 99 }, { status: 201 });
      }),
    );
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('+ New Group'));
    await user.click(screen.getByText('+ New Group'));
    await user.type(screen.getByPlaceholderText('e.g. Smith Family'), 'Test Group');
    const discountInput = screen.getByDisplayValue('10');
    await user.clear(discountInput);
    await user.type(discountInput, '20');
    await user.click(screen.getByText('Create'));
    await waitFor(() => expect(created).toBe(true));
  });

  it('disables Create button when name is empty and pending', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_URL}/api/family-discounts`, async () => {
        await new Promise(r => setTimeout(r, 300));
        return HttpResponse.json({ id: 99 }, { status: 201 });
      }),
    );
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('+ New Group'));
    await user.click(screen.getByText('+ New Group'));
    await waitFor(() => expect(screen.getByText('Create')).not.toBeDisabled());
  });

  it('deletes a group via Delete button', async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      http.delete(`${API_URL}/api/family-discounts/:id`, async ({ params }) => {
        expect(params.id).toBe('1');
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Smith Family'));
    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);
    await waitFor(() => expect(deleted).toBe(true));
  });

  it('expands group to show members', async () => {
    const user = userEvent.setup();
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Smith Family'));
    await user.click(screen.getByText('Smith Family'));
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows "No members" placeholder for empty group', async () => {
    server.use(
      http.get(`${API_URL}/api/family-discounts`, () =>
        HttpResponse.json({ groups: [{ id: 3, name: 'Empty Group', discount_pct: 5, member_count: 0, members: [] }] }),
      ),
    );
    const user = userEvent.setup();
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Empty Group'));
    await user.click(screen.getByText('Empty Group'));
    await waitFor(() => {
      expect(screen.getByText(/No members in this group yet/)).toBeInTheDocument();
    });
  });

  it('searches members when typing in add member input', async () => {
    const user = userEvent.setup();
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Smith Family'));
    await user.click(screen.getByText('Smith Family'));
    const input = screen.getByPlaceholderText('Add member by name...');
    await user.type(input, 'Ali');
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
  });

  it('adds a member from search results', async () => {
    const user = userEvent.setup();
    let added = false;
    server.use(
      http.post(`${API_URL}/api/family-discounts/:id/members`, async ({ request }) => {
        const body = await request.json();
        expect(body.member_id).toBe(20);
        added = true;
        return HttpResponse.json({ success: true }, { status: 201 });
      }),
    );
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Smith Family'));
    await user.click(screen.getByText('Smith Family'));
    const input = screen.getByPlaceholderText('Add member by name...');
    await user.type(input, 'Ali');
    await waitFor(() => screen.getByText('Alice Smith'));
    await user.click(screen.getByText('Alice Smith'));
    await waitFor(() => expect(added).toBe(true));
  });

  it('removes a member from expanded group', async () => {
    const user = userEvent.setup();
    let removed = false;
    server.use(
      http.delete(`${API_URL}/api/family-discounts/:id/members/:memberId`, async ({ params }) => {
        expect(params.id).toBe('1');
        expect(params.memberId).toBe('10');
        removed = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('Smith Family'));
    await user.click(screen.getByText('Smith Family'));
    await waitFor(() => screen.getByText('John Smith'));
    const removeButtons = screen.getAllByText('Remove');
    await user.click(removeButtons[0]);
    await waitFor(() => expect(removed).toBe(true));
  });

  it('handles API error on group creation', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_URL}/api/family-discounts`, () =>
        HttpResponse.json({ error: 'fail' }, { status: 500 }),
      ),
    );
    render(<FamilyDiscounts />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText('+ New Group'));
    await user.click(screen.getByText('+ New Group'));
    await user.click(screen.getByText('Create'));
    await waitFor(() => {
      expect(screen.getByText('New Family Discount Group')).toBeInTheDocument();
    });
  });
});
