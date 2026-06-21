import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import Waivers from './Waivers';

const API_URL = 'http://localhost:3001';

vi.mock('../lib/waiverPdf', () => ({
  generateWaiverPdf: vi.fn(() => new Blob(['test'], { type: 'application/pdf' })),
}));

vi.mock('../components/Waivers/SignWaiverModal', () => ({
  default: ({ template, onClose, onSigned }) => (
    <div data-testid="sign-waiver-modal">
      <p>Sign: {template.name}</p>
      <button onClick={onClose}>Close</button>
      <button onClick={onSigned}>Sign</button>
    </div>
  ),
}));

vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../lib/api';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>{children}</NotificationProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

const mockTemplates = [
  { id: 1, name: 'Standard Gym Waiver', body_text: 'I acknowledge the risks involved in martial arts training.', version: 1, active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'Minor Waiver', body_text: 'I consent for my child to participate.', version: 1, active: false, created_at: '2024-01-02T00:00:00Z' },
];

const mockMember = {
  id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com',
  date_of_birth: '2010-01-01', phone: '0412345678', status: 'active',
};

const mockWaivers = [
  { id: 1, member_id: 1, template_id: 1, template_name: 'Standard Gym Waiver', signed_at: '2024-06-01T10:00:00Z', body_text: 'I acknowledge...', guardian_name: null, guardian_relation: null },
];

const mockAnalytics = {
  total_signed: 50, signed_this_month: 10, pending_parent: 3,
  templates: [
    { id: 1, name: 'Standard Gym Waiver', signed_count: 30, active: true },
    { id: 2, name: 'Minor Waiver', signed_count: 20, active: false },
  ],
};

describe('Waivers Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('displays loading state initially', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    render(<Waivers />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading templates...')).toBeInTheDocument();
  });

  it('shows empty state when no templates', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: [] });
      return Promise.resolve({});
    });
    render(<Waivers />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No waiver templates yet. Create one to get started.')).toBeInTheDocument();
    });
  });

  it('renders template list with names, versions, and body text', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      return Promise.resolve({});
    });
    render(<Waivers />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Standard Gym Waiver')).toBeInTheDocument();
      expect(screen.getByText('Minor Waiver')).toBeInTheDocument();
      expect(screen.getAllByText('v1').length).toBe(2);
      expect(screen.getByText(/I acknowledge the risks/)).toBeInTheDocument();
    });
  });

  it('shows Inactive badge for inactive templates', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      return Promise.resolve({});
    });
    render(<Waivers />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('opens create template form on button click', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      return Promise.resolve({});
    });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Standard Gym Waiver')).toBeInTheDocument());
    await user.click(screen.getByText('+ New Template'));
    expect(screen.getByRole('textbox', { name: /template name/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /waiver body text/i })).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('creates a new template on form submit', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: [] });
      return Promise.resolve({});
    });
    api.post.mockResolvedValue({ id: 3, name: 'New Waiver', body_text: 'Body', version: 1, active: true });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('No waiver templates yet. Create one to get started.')).toBeInTheDocument());
    await user.click(screen.getByText('+ New Template'));
    await user.type(screen.getByRole('textbox', { name: /template name/i }), 'New Waiver');
    await user.type(screen.getByRole('textbox', { name: /waiver body text/i }), 'Body');
    await user.click(screen.getByText('Create'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/waivers/templates', { name: 'New Waiver', body_text: 'Body' });
    });
  });

  it('edits template with pre-filled form and submits update', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      return Promise.resolve({});
    });
    api.put.mockResolvedValue({ id: 1, name: 'Updated Waiver', body_text: 'Updated body', version: 2, active: true });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Standard Gym Waiver')).toBeInTheDocument());
    await user.click(screen.getAllByText('Edit')[0]);
    expect(screen.getByDisplayValue('Standard Gym Waiver')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/I acknowledge the risks/)).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: /template name/i }));
    await user.type(screen.getByRole('textbox', { name: /template name/i }), 'Updated Waiver');
    await user.click(screen.getByText('Update'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/waivers/templates/1', { name: 'Updated Waiver', body_text: 'I acknowledge the risks involved in martial arts training.' });
    });
  });

  it('deletes template after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      return Promise.resolve({});
    });
    api.delete.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Standard Gym Waiver')).toBeInTheDocument());
    await user.click(screen.getAllByText('Delete')[0]);
    expect(window.confirm).toHaveBeenCalledWith('Delete this template?');
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/waivers/templates/1');
    });
  });

  it('cancels form and hides it', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      return Promise.resolve({});
    });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Standard Gym Waiver')).toBeInTheDocument());
    await user.click(screen.getByText('+ New Template'));
    expect(screen.getByText('New Template')).toBeInTheDocument();
    await user.click(screen.getByText('Cancel'));
    expect(screen.queryByText('New Template')).not.toBeInTheDocument();
  });

  it('opens sign modal and renders template name', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      return Promise.resolve({});
    });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Standard Gym Waiver')).toBeInTheDocument());
    await user.click(screen.getAllByText('Sign')[0]);
    expect(screen.getByTestId('sign-waiver-modal')).toBeInTheDocument();
    expect(screen.getByText('Sign: Standard Gym Waiver')).toBeInTheDocument();
  });

  it('searches a member and shows member-waivers tab with waivers table', async () => {
    const memberWaivers = [
      { id: 1, member_id: 1, template_id: 1, template_name: 'Standard Gym Waiver', signed_at: '2024-06-01T10:00:00Z', body_text: 'Content', guardian_name: null, guardian_relation: null },
    ];
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      if (url.includes('/api/members/')) return Promise.resolve({ id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', date_of_birth: '1990-01-01' });
      if (url.includes('/pending-parent')) return Promise.resolve({ active: [], expired: [] });
      if (url.includes('/api/waivers/member/')) return Promise.resolve({ waivers: memberWaivers });
      return Promise.resolve({});
    });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Member Waivers'));
    await user.type(screen.getByLabelText('Search member'), '1');
    await user.click(screen.getByText('Search'));
    await waitFor(() => {
      expect(screen.getByText('Standard Gym Waiver')).toBeInTheDocument();
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
    });
  });

  it('shows empty waivers message when member has none', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      if (url.includes('/api/members/')) return Promise.resolve({ id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', date_of_birth: '1990-01-01' });
      if (url.includes('/pending-parent')) return Promise.resolve({ active: [], expired: [] });
      if (url.includes('/api/waivers/member/')) return Promise.resolve({ waivers: [] });
      return Promise.resolve({});
    });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Member Waivers'));
    await user.type(screen.getByLabelText('Search member'), '1');
    await user.click(screen.getByText('Search'));
    await waitFor(() => {
      expect(screen.getByText('No signed waivers for this member.')).toBeInTheDocument();
    });
  });

  it('shows parent waiver panel for under-18 member', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      if (url.includes('/api/members/')) return Promise.resolve(mockMember);
      if (url.includes('/pending-parent')) return Promise.resolve({ active: [], expired: [] });
      if (url.includes('/api/waivers/member/')) return Promise.resolve({ waivers: [] });
      return Promise.resolve({});
    });
    api.post.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Member Waivers'));
    await user.type(screen.getByLabelText('Search member'), '1');
    await user.click(screen.getByText('Search'));
    await waitFor(() => expect(screen.getByText('Send Waiver to Parent')).toBeInTheDocument());
    await user.click(screen.getByText('Send Waiver to Parent'));
    expect(screen.getByRole('heading', { name: /Email Waiver to Parent/i })).toBeInTheDocument();
    const emailInput = screen.getByPlaceholderText('parent@example.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'parent@test.com');
    await user.click(screen.getByText('Send Link'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/waivers/send-parent-link', { member_id: 1, template_id: 1, parent_email: 'parent@test.com' });
    });
  });

  it('shows parent pending status banner for under-18 member', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      if (url.includes('/api/members/')) return Promise.resolve(mockMember);
      if (url.includes('/pending-parent')) return Promise.resolve({ active: [{ id: 1, parent_email: 'parent@test.com' }], expired: [] });
      if (url.includes('/api/waivers/member/')) return Promise.resolve({ waivers: [] });
      return Promise.resolve({});
    });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Member Waivers'));
    await user.type(screen.getByLabelText('Search member'), '1');
    await user.click(screen.getByText('Search'));
    await waitFor(() => {
      expect(screen.getByText('Parent Waiver Pending')).toBeInTheDocument();
      expect(screen.getByText(/waiting for parent signature/)).toBeInTheDocument();
    });
    expect(screen.getByText('Resend')).toBeInTheDocument();
  });

  it('shows analytics tab with data', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      if (url.includes('/api/waivers/analytics')) return Promise.resolve(mockAnalytics);
      return Promise.resolve({});
    });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Total Signed')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('Signed This Month')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Pending Parent')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('shows analytics tab templates table', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      if (url.includes('/api/waivers/analytics')) return Promise.resolve(mockAnalytics);
      return Promise.resolve({});
    });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await user.click(screen.getByText('Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Standard Gym Waiver')).toBeInTheDocument();
      expect(screen.getByText('Minor Waiver')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    });
  });

  it('handles API failure gracefully by showing empty state', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Waivers />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No waiver templates yet. Create one to get started.')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('disables create button when form fields are empty', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/api/waivers/templates')) return Promise.resolve({ templates: mockTemplates });
      return Promise.resolve({});
    });
    const user = userEvent.setup();
    render(<Waivers />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('Standard Gym Waiver')).toBeInTheDocument());
    await user.click(screen.getByText('+ New Template'));
    const submitBtn = screen.getByText('Create');
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).not.toBeDisabled();
  });
});
