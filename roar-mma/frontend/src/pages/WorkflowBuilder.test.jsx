import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import WorkflowBuilder from './WorkflowBuilder';

const API_URL = 'http://localhost:3001';

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

const mockRules = [
  {
    id: 1, name: 'New Lead Follow-up', description: 'Auto-create a task when a new lead comes in',
    trigger_type: 'lead_created', action_type: 'create_task', enabled: true,
    created_by_name: 'System', trigger_config: '{}', action_config: '{"title":"Follow up","priority":"high"}',
    conditions: [], condition_type: 'all',
  },
  {
    id: 2, name: 'Welcome SMS', description: 'Send welcome SMS to new members',
    trigger_type: 'member_created', action_type: 'send_sms', enabled: false,
    created_by_name: 'Admin', trigger_config: '{}', action_config: '{"message":"Welcome to ROAR MMA!"}',
    conditions: [], condition_type: 'all',
  },
];

const mockTriggers = [
  { value: 'member_created', label: 'Member Created' },
  { value: 'lead_created', label: 'Lead Created' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'class_booked', label: 'Class Booked' },
];

const mockActions = [
  { value: 'create_task', label: 'Create Task' },
  { value: 'send_sms', label: 'Send SMS' },
  { value: 'update_lead_stage', label: 'Update Lead Stage' },
  { value: 'webhook', label: 'Webhook' },
];

describe('WorkflowBuilder Page', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_URL}/api/workflows`, () => HttpResponse.json(mockRules)),
      http.get(`${API_URL}/api/workflows/trigger-types`, () => HttpResponse.json(mockTriggers)),
      http.get(`${API_URL}/api/workflows/action-types`, () => HttpResponse.json(mockActions)),
      http.post(`${API_URL}/api/workflows`, () => HttpResponse.json({ id: 3 }, { status: 201 })),
      http.put(`${API_URL}/api/workflows/:id`, () => HttpResponse.json({ success: true })),
      http.post(`${API_URL}/api/workflows/:id/toggle`, () => HttpResponse.json({ enabled: true })),
      http.delete(`${API_URL}/api/workflows/:id`, () => HttpResponse.json({ success: true })),
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('shows loading state initially', () => {
    server.use(
      http.get(`${API_URL}/api/workflows`, () => new Promise(() => {})),
    );
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state when no automation rules', async () => {
    server.use(
      http.get(`${API_URL}/api/workflows`, () => HttpResponse.json([])),
    );
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No automation rules yet')).toBeInTheDocument();
      expect(screen.getByText(/Create rules to automate/)).toBeInTheDocument();
    });
  });

  it('renders rule list with names, descriptions, and creator', async () => {
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('New Lead Follow-up')).toBeInTheDocument();
      expect(screen.getByText('Welcome SMS')).toBeInTheDocument();
      expect(screen.getByText(/Auto-create a task/)).toBeInTheDocument();
      expect(screen.getByText(/Send welcome SMS/)).toBeInTheDocument();
      expect(screen.getAllByText(/System/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Admin/).length).toBeGreaterThan(0);
    });
  });

  it('shows Enable/Disable buttons based on rule state', async () => {
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('New Lead Follow-up')).toBeInTheDocument();
      expect(screen.getByText('Disable')).toBeInTheDocument();
      expect(screen.getByText('Enable')).toBeInTheDocument();
    });
  });

  it('opens new rule modal on button click', async () => {
    const user = userEvent.setup();
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('+ New Rule')).toBeInTheDocument());
    await user.click(screen.getByText('+ New Rule'));
    expect(screen.getByText('New Automation Rule')).toBeInTheDocument();
    expect(screen.getByText('Rule Name')).toBeInTheDocument();
    expect(screen.getByText('Trigger')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Save Rule')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('creates a new rule on form submission', async () => {
    const user = userEvent.setup();
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('+ New Rule')).toBeInTheDocument());
    await user.click(screen.getByText('+ New Rule'));
    const textboxes = screen.getAllByRole('textbox');
    await user.type(textboxes[0], 'Test Rule');
    await user.type(textboxes[1], 'Test description');
    const triggerSelect = screen.getByDisplayValue('Select trigger...');
    await user.selectOptions(triggerSelect, 'lead_created');
    const actionSelect = screen.getByDisplayValue('Select action...');
    await user.selectOptions(actionSelect, 'create_task');
    await waitFor(() => expect(screen.getByPlaceholderText('Task title')).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('Task title'), 'Follow up with lead');
    const prioritySelect = screen.getByDisplayValue('Medium');
    await user.selectOptions(prioritySelect, 'high');
    await user.click(screen.getByText('Save Rule'));
    await waitFor(() => {
      expect(screen.getByText('Rule created')).toBeInTheDocument();
    });
  });

  it('opens edit modal with pre-filled data', async () => {
    const user = userEvent.setup();
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('New Lead Follow-up')).toBeInTheDocument());
    await user.click(screen.getAllByText('Edit')[0]);
    expect(screen.getByText('Edit Rule')).toBeInTheDocument();
    expect(screen.getByDisplayValue('New Lead Follow-up')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Auto-create a task/)).toBeInTheDocument();
    expect(screen.getByText('Save Rule')).toBeInTheDocument();
  });

  it('toggles rule enable/disable on button click', async () => {
    const user = userEvent.setup();
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('New Lead Follow-up')).toBeInTheDocument());
    expect(screen.getByText('Disable')).toBeInTheDocument();
    await user.click(screen.getByText('Disable'));
    await waitFor(() => {
      expect(screen.getByText('New Lead Follow-up')).toBeInTheDocument();
    });
  });

  it('deletes rule after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('New Lead Follow-up')).toBeInTheDocument());
    await user.click(screen.getAllByText('Delete')[0]);
    expect(window.confirm).toHaveBeenCalledWith('Delete this rule?');
    await waitFor(() => {
      expect(screen.getByText('Rule deleted')).toBeInTheDocument();
    });
  });

  it('disables Save button when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('+ New Rule')).toBeInTheDocument());
    await user.click(screen.getByText('+ New Rule'));
    const saveBtn = screen.getByText('Save Rule');
    expect(saveBtn).toBeDisabled();
    await user.type(screen.getAllByRole('textbox')[0], 'Test');
    expect(saveBtn).toBeDisabled();
    const triggerSelect = screen.getByDisplayValue('Select trigger...');
    await user.selectOptions(triggerSelect, 'member_created');
    expect(saveBtn).toBeDisabled();
    const actionSelect = screen.getByDisplayValue('Select action...');
    await user.selectOptions(actionSelect, 'create_task');
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
  });

  it('renders create_task action config panel', async () => {
    const user = userEvent.setup();
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('+ New Rule')).toBeInTheDocument());
    await user.click(screen.getByText('+ New Rule'));
    const actionSelect = screen.getByDisplayValue('Select action...');
    await user.selectOptions(actionSelect, 'create_task');
    expect(screen.getByText('Task Config')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Task title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Task description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Medium')).toBeInTheDocument();
  });

  it('renders send_sms action config panel', async () => {
    const user = userEvent.setup();
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('+ New Rule')).toBeInTheDocument());
    await user.click(screen.getByText('+ New Rule'));
    const actionSelect = screen.getByDisplayValue('Select action...');
    await user.selectOptions(actionSelect, 'send_sms');
    expect(screen.getByText('SMS Config')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Message')).toBeInTheDocument();
  });

  it('renders update_lead_stage action config panel', async () => {
    const user = userEvent.setup();
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('+ New Rule')).toBeInTheDocument());
    await user.click(screen.getByText('+ New Rule'));
    const actionSelect = screen.getByDisplayValue('Select action...');
    await user.selectOptions(actionSelect, 'update_lead_stage');
    expect(screen.getByText('Lead Stage Config')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Contacted')).toBeInTheDocument();
  });

  it('renders webhook action config panel', async () => {
    const user = userEvent.setup();
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('+ New Rule')).toBeInTheDocument());
    await user.click(screen.getByText('+ New Rule'));
    const actionSelect = screen.getByDisplayValue('Select action...');
    await user.selectOptions(actionSelect, 'webhook');
    expect(screen.getByText('Webhook Config')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://...')).toBeInTheDocument();
  });

  it('closes modal on Cancel button click', async () => {
    const user = userEvent.setup();
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('+ New Rule')).toBeInTheDocument());
    await user.click(screen.getByText('+ New Rule'));
    expect(screen.getByText('New Automation Rule')).toBeInTheDocument();
    await user.click(screen.getByText('Cancel'));
    expect(screen.queryByText('New Automation Rule')).not.toBeInTheDocument();
  });

  it('handles API error by showing empty state', async () => {
    server.use(
      http.get(`${API_URL}/api/workflows`, () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 }),
      ),
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No automation rules yet')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('shows Edit and Delete buttons for each rule', async () => {
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('New Lead Follow-up')).toBeInTheDocument());
    const editBtns = screen.getAllByText('Edit');
    const deleteBtns = screen.getAllByText('Delete');
    expect(editBtns.length).toBe(2);
    expect(deleteBtns.length).toBe(2);
  });

  it('does not delete rule when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<WorkflowBuilder />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText('New Lead Follow-up')).toBeInTheDocument());
    await user.click(screen.getAllByText('Delete')[0]);
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('New Lead Follow-up')).toBeInTheDocument();
    });
  });
});
