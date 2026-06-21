import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import EditMemberModal from './EditMemberModal';
import api from '../../lib/api';

const mockMember = {
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@test.com',
  phone: '0400123456',
  date_of_birth: '1990-01-15',
  gender: 'male',
  address: '123 Main St',
  suburb: 'Rockingham',
  postcode: '6168',
  membership_type: 'unlimited',
  membership_status: 'active',
  belt_rank: 'blue',
  emergency_contact_name: 'Jane Doe',
  emergency_contact_phone: '0411122233',
  medical_conditions: 'None',
  goals: 'Get fit',
  parent_id: '',
};

vi.mock('../../lib/api', () => ({
  default: {
    put: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    get: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  },
}));

vi.mock('../../lib/useOptions', () => ({
  useOptions: () => ({
    data: { plans: ['unlimited', '2x_week'], belt_levels: ['white', 'blue', 'purple'], locations: ['rockingham'] },
  }),
  optionLabel: (v) => v?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
}));

vi.mock('../Modal', () => ({
  Modal: ({ isOpen, children, title }) => isOpen ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <EditMemberModal isOpen={true} onClose={vi.fn()} member={mockMember} {...props} />
    </QueryClientProvider>
  );
}

describe('EditMemberModal', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders modal when open', () => {
    renderModal();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('pre-fills form with member data', () => {
    renderModal();
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@test.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0400123456')).toBeInTheDocument();
  });

  it('renders all form sections', () => {
    renderModal();
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Membership Details')).toBeInTheDocument();
    expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
    expect(screen.getByText('Medical & Goals')).toBeInTheDocument();
  });

  it('shows required field markers', () => {
    renderModal();
    expect(screen.getByText('First Name *')).toBeInTheDocument();
    expect(screen.getByText('Last Name *')).toBeInTheDocument();
    expect(screen.getByText('Email *')).toBeInTheDocument();
    expect(screen.getByText('Phone *')).toBeInTheDocument();
    expect(screen.getByText('Membership Type *')).toBeInTheDocument();
    expect(screen.getByText('Membership Status *')).toBeInTheDocument();
  });

  it('renders gender select', () => {
    renderModal();
    expect(screen.getByDisplayValue('Male')).toBeInTheDocument();
  });

  it('renders address fields with pre-filled data', () => {
    renderModal();
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rockingham')).toBeInTheDocument();
    expect(screen.getByDisplayValue('6168')).toBeInTheDocument();
  });

  it('renders belt rank select', () => {
    renderModal();
    expect(screen.getByDisplayValue('Blue')).toBeInTheDocument();
  });

  it('renders emergency contact fields', () => {
    renderModal();
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0411122233')).toBeInTheDocument();
  });

  it('renders medical and goals fields', () => {
    renderModal();
    expect(screen.getByDisplayValue('None')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Get fit')).toBeInTheDocument();
  });

  it('returns null when no member provided', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <EditMemberModal isOpen={true} onClose={vi.fn()} member={null} />
      </QueryClientProvider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('validates required fields on submit', () => {
    renderModal();
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: '' } });
    fireEvent.click(screen.getByText('Update Member'));
    expect(screen.getByText('First name is required')).toBeInTheDocument();
  });

  it('validates membership type is required', () => {
    renderModal();
    fireEvent.change(document.querySelector('select[name="membership_type"]'), { target: { name: 'membership_type', value: '' } });
    fireEvent.click(screen.getByText('Update Member'));
    expect(screen.getByText('Membership type is required')).toBeInTheDocument();
  });

  it('calls API on submit with valid data', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Update Member'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/members/1', expect.objectContaining({
        first_name: 'John', last_name: 'Doe',
      }));
    });
  });

  it('calls onClose on cancel', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows submit error on API failure', async () => {
    api.put.mockRejectedValueOnce(new Error('Network error'));
    renderModal();
    fireEvent.click(screen.getByText('Update Member'));
    await waitFor(() => {
      expect(screen.getByText('Failed to update member. Please try again.')).toBeInTheDocument();
    });
  });
});
