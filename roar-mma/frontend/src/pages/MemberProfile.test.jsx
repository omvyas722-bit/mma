import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import MemberProfile from './MemberProfile';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3001';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin', role: 'owner', email: 'admin@roarmma.com' },
  }),
}));

vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

vi.mock('../components/Members/EditMemberModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="edit-modal">Edit Member</div> : null,
}));

vi.mock('../components/Modal', async () => {
  const actual = await vi.importActual('../components/Modal');
  return {
    ...actual,
    ConfirmDialog: ({ isOpen, title, message, onConfirm }) =>
      isOpen ? (
        <div data-testid="confirm-dialog">
          <h3>{title}</h3>
          <p>{message}</p>
          <button onClick={onConfirm}>Confirm</button>
        </div>
      ) : null,
  };
});

vi.mock('../components/Shared/Spinner', () => ({
  PageLoader: () => <div data-testid="page-loader">Loading...</div>,
}));

vi.mock('../components/Coaching/StudentCoachingPanel', () => ({
  default: () => <div data-testid="coaching-panel">Student Coaching</div>,
}));

vi.mock('../components/Members/DocumentsPanel', () => ({
  default: () => <div data-testid="documents-panel">Documents</div>,
}));

const fullMember = {
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '0412345678',
  status: 'active',
  location: 'rockingham',
  joined_date: '2024-01-01',
  date_of_birth: '1990-05-15',
  gender: 'male',
  address: '123 Main St',
  suburb: 'Rockingham',
  postcode: '6168',
  membership_type: 'unlimited',
  plan: 'unlimited',
  emergency_contact_name: 'Jane Doe',
  emergency_contact_phone: '0412345679',
  medical_conditions: 'Asthma',
  goals: 'Improve BJJ',
  trial_end_date: null,
  is_fighter: 1,
  parent_id: null,
  waiver_signed: true,
  health_score: 85,
  cancellation_date: null,
  pause_start: null,
  pause_end: null,
};

const mockAttendanceRecords = [
  { id: 1, date: '2024-06-01', class_name: 'BJJ Fundamentals', start_time: '18:00', attended_at: '2024-06-01T18:05:00Z' },
  { id: 2, date: '2024-06-03', class_name: 'Muay Thai', start_time: '19:00', attended_at: null },
];

const mockAttStats = {
  currentStreak: 5,
  longestStreak: 15,
  totalAttendance: 120,
  thisMonth: 12,
  heatmap: [
    { date: '2024-05-27', day: 1, attended: true },
    { date: '2024-05-28', day: 2, attended: false },
    { date: '2024-05-29', day: 3, attended: true },
  ],
};

const mockPayments = [
  { id: 1, description: 'Monthly membership', amount: 99, status: 'paid', processed_at: '2024-06-01T10:00:00Z' },
  { id: 2, description: 'PT session', amount: 75, status: 'pending', created_at: '2024-06-05T10:00:00Z' },
];

const mockDisciplines = [
  { discipline: 'bjj', belt_name: 'Blue', color_code: '#6600CC', current_stripes: 2, belt_awarded_date: '2024-01-01', classes_attended_since_belt: 40 },
  { discipline: 'muay_thai', belt_name: 'White', color_code: '#FF6B35', current_stripes: 0, belt_awarded_date: '2024-03-01', classes_attended_since_belt: 15 },
];

const mockEnrolledClasses = [
  { id: 1, date: '2024-06-10', class_name: 'BJJ Fundamentals', start_time: '18:00', instructor_name: 'Kane Mousah', booking_status: 'confirmed', attended_at: null },
];

const mockNotes = [
  { id: 1, content: 'Great progress this month', created_at: '2024-06-01T10:00:00Z', author_name: 'Kane Mousah', note_type: 'achievement' },
];

const mockPtSessions = [
  { id: 1, session_date: '2024-06-02', coach_name: 'Kane Mousah', package_name: '10-pack' },
];

const mockCompetitions = [
  { id: 1, event_name: 'State Championships', event_date: '2024-05-15', opponent_name: 'Mike Smith', discipline: 'bjj', weight_class: '77kg', result: 'win', method: 'submission', round: '2', time: '1:23' },
  { id: 2, event_name: 'Club Tournament', event_date: '2024-04-10', opponent_name: 'Tom Jones', discipline: 'mma', result: 'loss', method: 'ko', round: '1', time: '2:45' },
];

const mockReferrals = [
  { id: 1, referred_name: 'Sarah Wilson', voucher_value: 25, status: 'redeemed', issued_at: '2024-05-01T00:00:00Z', expires_at: null },
];

const mockMakeups = [
  { id: 1, original_date: '2024-05-20', expires_at: '2024-07-20', used_at: null },
];

const mockLinkedChildren = [
  { id: 3, first_name: 'Junior', last_name: 'Doe', membership_type: 'kids' },
];

const setupProfileHandlers = () => {
  server.use(
    http.get(`${API_URL}/api/members/1`, () => HttpResponse.json(fullMember)),
    http.get(`${API_URL}/api/members/1/attendance`, () => HttpResponse.json(mockAttendanceRecords)),
    http.get(`${API_URL}/api/members/1/attendance-stats`, () => HttpResponse.json(mockAttStats)),
    http.get(`${API_URL}/api/members/1/transactions`, () => HttpResponse.json(mockPayments)),
    http.get(`${API_URL}/api/members/1/disciplines`, () => HttpResponse.json(mockDisciplines)),
    http.get(`${API_URL}/api/members/1/enrolled-classes`, () => HttpResponse.json(mockEnrolledClasses)),
    http.get(`${API_URL}/api/members/1/notes`, () => HttpResponse.json(mockNotes)),
    http.get(`${API_URL}/api/members/1/pt-sessions`, () => HttpResponse.json(mockPtSessions)),
    http.get(`${API_URL}/api/members/1/competitions`, () => HttpResponse.json(mockCompetitions)),
    http.get(`${API_URL}/api/members/1/referrals`, () => HttpResponse.json(mockReferrals)),
    http.get(`${API_URL}/api/makeup-classes/member/1`, () => HttpResponse.json({ makeups: mockMakeups })),
    http.get(`${API_URL}/api/family-discounts/member/1`, () => HttpResponse.json({ discount: null, family: [] })),
    http.get(`${API_URL}/api/members`, ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.has('parent_id')) {
        return HttpResponse.json({ members: mockLinkedChildren });
      }
      return HttpResponse.json({ members: [] });
    }),
    http.post(`${API_URL}/api/members/1/cancel`, () => HttpResponse.json({ success: true })),
    http.post(`${API_URL}/api/members/1/pause`, () => HttpResponse.json({ success: true })),
    http.post(`${API_URL}/api/members/1/change-plan`, () => HttpResponse.json({ success: true })),
    http.post(`${API_URL}/api/members/1/notes`, () => HttpResponse.json({ id: 99 })),
    http.post(`${API_URL}/api/members/1/competitions`, () => HttpResponse.json({ id: 99 })),
    http.put(`${API_URL}/api/members/3`, () => HttpResponse.json({ id: 3, parent_id: 1 })),
  );
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('MemberProfile Page', () => {
  beforeEach(() => {
    server.resetHandlers();
    setupProfileHandlers();
  });

  afterEach(() => server.resetHandlers());

  it('shows loading spinner while fetching member data', () => {
    server.use(http.get(`${API_URL}/api/members/1`, () => new Promise(() => {})));
    render(<MemberProfile />, { wrapper: createWrapper() });
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows member not found when member data is null', async () => {
    server.use(http.get(`${API_URL}/api/members/1`, () => HttpResponse.json(null)));
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Member not found')).toBeInTheDocument();
    });
  });

  it('renders member name, email, and phone', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('renders all action buttons in the header', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Change Plan')).toBeInTheDocument();
      expect(screen.getByText('Pause')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('renders overview tab by default with personal info sections', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
      expect(screen.getByText('Membership Details')).toBeInTheDocument();
      expect(screen.getByText('Disciplines & Belt Levels')).toBeInTheDocument();
      expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
      expect(screen.getByText('Medical & Goals')).toBeInTheDocument();
    });
  });

  it('renders all tabs and navigates between them', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Attendance')).toBeInTheDocument();
      expect(screen.getByText('Payments')).toBeInTheDocument();
      expect(screen.getByText('Classes & PT')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Coaching')).toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Fighter')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Attendance'));
    await waitFor(() => expect(screen.getByText('Attendance History')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Payments'));
    await waitFor(() => expect(screen.getByText('Payment History')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Classes & PT'));
    await waitFor(() => expect(screen.getByText('PT Sessions')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Notes'));
    await waitFor(() => expect(screen.getByText('Notes & Timeline')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Coaching'));
    await waitFor(() => expect(screen.getByTestId('coaching-panel')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Documents'));
    await waitFor(() => expect(screen.getByTestId('documents-panel')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Fighter'));
    await waitFor(() => expect(screen.getByText('Fighter Record & Competition History')).toBeInTheDocument());
  });

  it('displays attendance stats in attendance tab', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Attendance'));
    await waitFor(() => {
      expect(screen.getByText('Current Streak')).toBeInTheDocument();
      expect(screen.getByText('Longest Streak')).toBeInTheDocument();
      expect(screen.getByText('Total Classes')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
    });
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('displays payment history in payments tab', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Payments'));
    await waitFor(() => {
      expect(screen.getByText('Monthly membership')).toBeInTheDocument();
      expect(screen.getByText('PT session')).toBeInTheDocument();
    });
  });

  it('shows fighter tab with competition history and W/L record', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Fighter')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Fighter'));
    await waitFor(() => {
      expect(screen.getByText('Wins')).toBeInTheDocument();
      expect(screen.getByText('Losses')).toBeInTheDocument();
      expect(screen.getByText('Draws/NC')).toBeInTheDocument();
      expect(screen.getByText('State Championships')).toBeInTheDocument();
      expect(screen.getByText('Club Tournament')).toBeInTheDocument();
    });
  });

  it('shows enrolled classes in overview tab', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Enrolled Classes This Week')).toBeInTheDocument();
      expect(screen.getByText('BJJ Fundamentals')).toBeInTheDocument();
    });
  });

  it('shows fighter toggle for owner role users', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox.checked).toBe(true);
    });
  });

  it('opens Edit modal when Edit button is clicked', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Edit')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
  });

  it('opens Cancel dialog when Cancel button is clicked', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Cancel')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.getByText('Cancel Membership')).toBeInTheDocument();
    });
  });

  it('shows discipline badges with belt levels', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('BJJ: Blue')).toBeInTheDocument();
      expect(screen.getByText('Muay Thai: White')).toBeInTheDocument();
    });
  });

  it('shows emergency contact and waiver badges', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      const janeMatches = screen.getAllByText(/Jane Doe/);
      expect(janeMatches.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Waiver Signed/)).toBeInTheDocument();
    });
  });

  it('shows makeup classes section when makeups exist', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Makeup Classes')).toBeInTheDocument();
    });
  });

  it('shows linked children when they exist', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Children (1)')).toBeInTheDocument();
      expect(screen.getByText('Junior Doe')).toBeInTheDocument();
    });
  });

  it('shows notes in notes tab', async () => {
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Notes'));
    await waitFor(() => {
      expect(screen.getByText('Great progress this month')).toBeInTheDocument();
    });
  });

  it('shows empty state for attendance when no records exist', async () => {
    server.use(http.get(`${API_URL}/api/members/1/attendance`, () => HttpResponse.json([])));
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Attendance'));
    await waitFor(() => {
      expect(screen.getByText('No attendance records')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully showing member not found', async () => {
    server.use(http.get(`${API_URL}/api/members/1`, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })));
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Member not found')).toBeInTheDocument();
    });
  });

  it('shows empty linked accounts section when no children or parent', async () => {
    const noChildrenMember = { ...fullMember, parent_id: null, is_fighter: 0 };
    server.use(http.get(`${API_URL}/api/members/1`, () => HttpResponse.json(noChildrenMember)));
    server.use(http.get(`${API_URL}/api/members`, ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.has('parent_id')) {
        return HttpResponse.json({ members: [] });
      }
      return HttpResponse.json({ members: [] });
    }));
    render(<MemberProfile />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/No linked accounts/)).toBeInTheDocument();
    });
  });
});
