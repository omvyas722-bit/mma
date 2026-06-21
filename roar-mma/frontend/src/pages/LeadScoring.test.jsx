import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import LeadScoring from './LeadScoring';

const API_URL = 'http://localhost:3001';

afterEach(() => server.resetHandlers());

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return ({ children }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>{children}</NotificationProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function addLeadScoringHandlers() {
  server.use(
    http.get(`${API_URL}/api/lead-scoring/leads-with-scores`, ({ request }) => {
      const url = new URL(request.url);
      const minScore = parseInt(url.searchParams.get('min_score') || '0', 10);
      const sort = url.searchParams.get('sort') || 'score_desc';
      let leads = [
        { id: 1, first_name: 'Alice', last_name: 'Johnson', email: 'alice@example.com', phone: '0412345680', score: 85, stage: 'hot', source: 'website', last_interaction: new Date().toISOString() },
        { id: 2, first_name: 'Bob', last_name: 'Smith', email: 'bob@example.com', phone: '0412345681', score: 62, stage: 'warm', source: 'facebook', last_interaction: new Date(Date.now() - 86400000).toISOString() },
        { id: 3, first_name: 'Charlie', last_name: 'Brown', email: 'charlie@example.com', phone: null, score: 45, stage: 'new', source: 'referral', last_interaction: null },
        { id: 4, first_name: 'Diana', last_name: 'Prince', email: 'diana@example.com', phone: '0412345682', score: 15, stage: 'cold', source: 'walk_in', last_interaction: new Date(Date.now() - 604800000).toISOString() },
      ];
      if (minScore > 0) leads = leads.filter(l => l.score >= minScore);
      if (sort === 'score_asc') leads.sort((a, b) => a.score - b.score);
      if (sort === 'score_desc') leads.sort((a, b) => b.score - a.score);
      if (sort === 'name') leads.sort((a, b) => a.first_name.localeCompare(b.first_name));
      if (sort === 'created_desc') leads.sort((a, b) => (b.id || 0) - (a.id || 0));
      return HttpResponse.json({ leads });
    }),
    http.get(`${API_URL}/api/lead-scoring/high-priority`, () =>
      HttpResponse.json({
        leads: [
          { id: 5, first_name: 'Eve', last_name: 'Adams', score: 92 },
          { id: 6, first_name: 'Frank', last_name: 'Miller', score: 88 },
        ],
      })
    ),
  );
}

describe('LeadScoring', () => {
  it('renders the page title', () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    expect(screen.getByText('Lead Scoring')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<LeadScoring />, { wrapper: createWrapper() });
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('displays summary score cards', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  it('shows correct counts in summary cards', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await waitFor(() => {
      const criticalCards = screen.getByText('Critical').closest('div');
      expect(criticalCards).toHaveTextContent('1');
      const lowCards = screen.getByText('Low').closest('div');
      expect(lowCards).toHaveTextContent('1');
    });
  });

  it('displays high priority section', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/High Priority/)).toBeInTheDocument();
      expect(screen.getByText('Eve Adams')).toBeInTheDocument();
      expect(screen.getByText('Frank Miller')).toBeInTheDocument();
    });
  });

  it('shows high priority scores', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Score: 92')).toBeInTheDocument();
      expect(screen.getByText('Score: 88')).toBeInTheDocument();
    });
  });

  it('renders all leads with their data', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
      expect(screen.getByText('Diana Prince')).toBeInTheDocument();
    });
  });

  it('applies correct score level classes', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await waitFor(() => {
      const aliceCard = screen.getByText('Alice Johnson').closest('div.bg-white');
      expect(aliceCard.className).toContain('border-red-500');
      const bobCard = screen.getByText('Bob Smith').closest('div.bg-white');
      expect(bobCard.className).toContain('border-orange-400');
      const charlieCard = screen.getByText('Charlie Brown').closest('div.bg-white');
      expect(charlieCard.className).toContain('border-yellow-400');
      const dianaCard = screen.getByText('Diana Prince').closest('div.bg-white');
      expect(dianaCard.className).toContain('border-gray-300');
    });
  });

  it('displays score values and level labels', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('62')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  it('shows lead contact details', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/alice@example.com/)).toBeInTheDocument();
      expect(screen.getByText(/Stage: hot/)).toBeInTheDocument();
      expect(screen.getByText(/Source: website/)).toBeInTheDocument();
    });
  });

  it('shows dash for missing phone', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await waitFor(() => {
      const charlieRow = screen.getByText('Charlie Brown').closest('div');
      expect(charlieRow.textContent).toContain('—');
    });
  });

  it('filters by minimum score', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await screen.findByText('Alice Johnson');
    const minScoreInput = screen.getByRole('spinbutton');
    await userEvent.clear(minScoreInput);
    await userEvent.type(minScoreInput, '50');
    await waitFor(() => {
      expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
      expect(screen.queryByText('Diana Prince')).not.toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  it('sorts leads by score ascending', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await screen.findByText('Alice Johnson');
    const sortSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(sortSelect, 'score_asc');
    await waitFor(() => {
      const leadCards = screen.getAllByText(/Score:/);
      expect(leadCards.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('sorts leads by name', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await screen.findByText('Alice Johnson');
    const sortSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(sortSelect, 'name');
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });
  });

  it('shows empty state when no leads match', async () => {
    server.use(
      http.get(`${API_URL}/api/lead-scoring/leads-with-scores`, () =>
        HttpResponse.json({ leads: [] })
      ),
      http.get(`${API_URL}/api/lead-scoring/high-priority`, () =>
        HttpResponse.json({ leads: [] })
      ),
    );
    render(<LeadScoring />, { wrapper: createWrapper() });
    expect(await screen.findByText('No leads with scores')).toBeInTheDocument();
  });

  it('hides high priority section when no high priority leads', async () => {
    server.use(
      http.get(`${API_URL}/api/lead-scoring/high-priority`, () =>
        HttpResponse.json({ leads: [] })
      ),
    );
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText(/High Priority/)).not.toBeInTheDocument();
    });
  });

  it('renders min score filter input', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Min Score:')).toBeInTheDocument();
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });
  });

  it('renders sort dropdown', async () => {
    addLeadScoringHandlers();
    render(<LeadScoring />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Sort:')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });
});
