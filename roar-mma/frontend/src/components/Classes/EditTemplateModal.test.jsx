import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import EditTemplateModal from './EditTemplateModal';
import api from '../../lib/api';

const mockTemplate = {
  id: 1, name: 'BJJ Fundamentals', description: 'Beginner BJJ', instructor: 'Coach A',
  location: 'rockingham', day_of_week: 1, start_time: '09:00', end_time: '10:00',
  capacity: 20, class_type: 'bjj', min_belt: 'white', fighter_only: false,
};

vi.mock('../../lib/api', () => ({
  default: {
    put: vi.fn().mockResolvedValue({ data: { instances_updated: 5 } }),
    get: vi.fn().mockImplementation((url) => {
      if (url === '/api/classes/templates') return Promise.resolve({ data: { templates: [mockTemplate] } });
      if (url === '/api/classes/1') return Promise.resolve({ data: mockTemplate });
      return Promise.resolve({ data: {} });
    }),
  },
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotifications: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../../lib/useOptions', () => ({
  useOptions: () => ({ data: { class_types: ['bjj', 'muay_thai'], locations: ['rockingham', 'bibra_lake'], belt_levels: ['white', 'blue'] } }),
  optionLabel: (v) => v?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
}));

vi.mock('../Modal', () => ({
  Modal: ({ isOpen, children, title }) => isOpen ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <EditTemplateModal isOpen={true} onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('EditTemplateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    api.get.mockImplementation((url) => {
      if (url === '/api/classes/templates') return Promise.resolve({ data: { templates: [mockTemplate] } });
      if (url === '/api/classes/1') return Promise.resolve({ data: mockTemplate });
      return Promise.resolve({ data: {} });
    });
    api.put.mockResolvedValue({ data: { instances_updated: 5 } });
  });

  it('renders modal when open', () => {
    renderModal();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows template selection list when no classId', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText(/Select a class template to edit/i)).toBeInTheDocument();
    });
  });

  it('shows templates in selection list', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('BJJ Fundamentals')).toBeInTheDocument();
    });
  });

  it('shows no templates message when list empty', async () => {
    api.get.mockResolvedValue({ data: { templates: [] } });
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('No templates found.')).toBeInTheDocument();
    });
  });

  it('selects template and shows edit form', async () => {
    renderModal({ classId: 1 });
    await waitFor(() => {
      expect(screen.getByDisplayValue('BJJ Fundamentals')).toBeInTheDocument();
    });
  });

  it('pre-fills form with template data when classId provided', async () => {
    renderModal({ classId: 1 });
    await waitFor(() => {
      expect(screen.getByDisplayValue('BJJ Fundamentals')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Coach A')).toBeInTheDocument();
    });
  });

  it('shows propagate checkbox', async () => {
    renderModal({ classId: 1 });
    await waitFor(() => {
      expect(screen.getByText(/Apply to all future instances/i)).toBeInTheDocument();
    });
  });

  it('shows warning when changes detected', async () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <EditTemplateModal isOpen={true} onClose={vi.fn()} classId={1} />
      </QueryClientProvider>
    );
    await waitFor(() => {
      fireEvent.change(screen.getByDisplayValue('BJJ Fundamentals'), { target: { name: 'name', value: 'Changed Name' } });
      expect(screen.getByText(/This changes all future instances/i)).toBeInTheDocument();
    });
  });

  it('allows back navigation from edit form', async () => {
    renderModal({ classId: 1 });
    await waitFor(() => {
      const backBtn = screen.getByText(/Back to template list/i);
      fireEvent.click(backBtn);
      expect(screen.getByText(/Select a class template to edit/i)).toBeInTheDocument();
    });
  });

  it('calls API on valid submit', async () => {
    const onClose = vi.fn();
    renderModal({ classId: 1, onClose });
    await waitFor(() => {
      fireEvent.click(screen.getByText(/Update Template & Propagate/i));
      expect(api.put).toHaveBeenCalled();
    });
  });

  it('calls onClose on cancel', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation errors on empty submit', async () => {
    renderModal({ classId: 1 });
    await waitFor(() => {
      fireEvent.change(screen.getByDisplayValue('BJJ Fundamentals'), { target: { name: 'name', value: '' } });
      fireEvent.click(screen.getByText(/Update Template/i));
      expect(screen.getByText('Class name is required')).toBeInTheDocument();
    });
  });
});
