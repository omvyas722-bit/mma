import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server';
import { NotificationProvider } from '../../contexts/NotificationContext';
import StudentCoachingPanel from './StudentCoachingPanel';

const API_URL = 'http://localhost:3001';

const mockMember = { id: 1, first_name: 'John', last_name: 'Doe', membershipStatus: 'active', beltRank: 'blue' };

const successHandler = {
  ratings: http.get(`${API_URL}/api/coaching/1/ratings`, () => {
    return HttpResponse.json({
      ratings: [
        { id: 1, defense: 7, stance: 6, offense: 8, practice_quality: 7, rating_date: '2024-06-01', coach_name: 'Coach A', notes: 'Good work' },
      ],
      averages: { avg_defense: 7.0, avg_stance: 6.0, avg_offense: 8.0, avg_practice: 7.0 },
    });
  }),
  insights: http.get(`${API_URL}/api/coaching/1/insights`, () => {
    return HttpResponse.json({
      insights: [
        { id: 1, insight_date: '2024-06-02', fight_readiness: 'ready', weight_advice: 'maintain', strengths: 'Strong guard', weaknesses: 'Takedown defense', diet_recommendation: 'Increase protein' },
      ],
      latest: { id: 1, insight_date: '2024-06-02', fight_readiness: 'ready', weight_advice: 'maintain', strengths: 'Strong guard', weaknesses: 'Takedown defense', diet_recommendation: 'Increase protein' },
    });
  }),
  drills: http.get(`${API_URL}/api/coaching/1/drills`, () => {
    return HttpResponse.json([
      { id: 1, drill_name: 'Guard Pass Drill', difficulty: 'intermediate', focus_area: 'guard', drill_description: 'Practice passing guard', insight_date: '2024-06-02' },
    ]);
  }),
};

const emptyHandler = {
  ratings: http.get(`${API_URL}/api/coaching/1/ratings`, () => {
    return HttpResponse.json({ ratings: [], averages: {} });
  }),
  insights: http.get(`${API_URL}/api/coaching/1/insights`, () => {
    return HttpResponse.json({ insights: [], latest: null });
  }),
};

afterEach(() => server.resetHandlers());

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

describe('StudentCoachingPanel', () => {
  it('shows loading state initially', () => {
    render(<StudentCoachingPanel member={mockMember} />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading ratings...')).toBeInTheDocument();
  });

  it('renders member info and averages after data loads', async () => {
    server.use(successHandler.ratings, successHandler.insights);
    render(<StudentCoachingPanel member={mockMember} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Averages \(1 ratings\)/i)).toBeInTheDocument();
    });
    const defenseLabels = screen.getAllByText('Defense');
    expect(defenseLabels.length).toBeGreaterThanOrEqual(1);
    const sevenTens = screen.getAllByText('7.0/10');
    expect(sevenTens.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('6.0/10')).toBeInTheDocument();
    expect(screen.getByText('8.0/10')).toBeInTheDocument();
  });

  it('renders latest AI insight card', async () => {
    server.use(successHandler.ratings, successHandler.insights);
    render(<StudentCoachingPanel member={mockMember} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Latest AI Insight')).toBeInTheDocument();
    });
    expect(screen.getByText('Strong guard')).toBeInTheDocument();
    expect(screen.getByText('Takedown defense')).toBeInTheDocument();
    expect(screen.getByText('Increase protein')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Maintain')).toBeInTheDocument();
  });

  it('"+ Rate Today" button opens the rating modal', async () => {
    server.use(successHandler.ratings, successHandler.insights);
    render(<StudentCoachingPanel member={mockMember} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('+ Rate Today')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Rate Today'));
    expect(screen.getByText(/Rate John Doe/i)).toBeInTheDocument();
  });

  it('switches between sub-tabs', async () => {
    server.use(emptyHandler.ratings, emptyHandler.insights);
    render(<StudentCoachingPanel member={mockMember} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/No ratings yet/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('insights'));
    await waitFor(() => {
      expect(screen.getByText(/No AI insights yet/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('drills'));
    await waitFor(() => {
      expect(screen.getByText('Loading drills...')).toBeInTheDocument();
    });
  });

  it('renders drills list when drills tab is active', async () => {
    server.use(successHandler.ratings, successHandler.insights, successHandler.drills);
    render(<StudentCoachingPanel member={mockMember} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Averages \(1 ratings\)/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('drills'));
    await waitFor(() => {
      expect(screen.getByText('Guard Pass Drill')).toBeInTheDocument();
    });
    expect(screen.getByText('Practice passing guard')).toBeInTheDocument();
  });

  it('shows empty state when no ratings or insights exist', async () => {
    server.use(emptyHandler.ratings, emptyHandler.insights);
    render(<StudentCoachingPanel member={mockMember} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/No ratings yet/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('insights'));
    await waitFor(() => {
      expect(screen.getByText(/No AI insights yet/i)).toBeInTheDocument();
    });
  });

  it('shows empty drills state', async () => {
    server.use(emptyHandler.ratings, emptyHandler.insights);
    server.use(
      http.get(`${API_URL}/api/coaching/1/drills`, () => {
        return HttpResponse.json([]);
      })
    );
    render(<StudentCoachingPanel member={mockMember} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/No ratings yet/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('drills'));
    await waitFor(() => {
      expect(screen.getByText(/No drill recommendations yet/i)).toBeInTheDocument();
    });
  });
});
