import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import AddMemberModal from './AddMemberModal';
import api from '../../lib/api';
import { useOptions } from '../../lib/useOptions';

vi.mock('../../lib/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    get: vi.fn().mockResolvedValue({ data: { templates: [] } }),
  },
}));

vi.mock('../../lib/useOptions', () => ({
  useOptions: () => ({ data: { locations: ['rockingham'], plans: ['unlimited'], experience_levels: ['beginner', 'intermediate', 'advanced'] } }),
  optionLabel: (v) => v?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
}));

vi.mock('../Modal', () => ({
  Modal: ({ isOpen, children, title }) => isOpen ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
}));

vi.mock('../Waivers/SignWaiverModal', () => ({
  default: ({ onClose, onSigned }) => (
    <div data-testid="sign-waiver-modal">
      <button onClick={onClose} data-testid="close-sign">Close</button>
      <button onClick={onSigned} data-testid="sign-waiver">Sign</button>
    </div>
  ),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AddMemberModal isOpen={true} onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('AddMemberModal', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders modal when open', () => {
    renderModal();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('renders step indicator with all steps', () => {
    renderModal();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Membership')).toBeInTheDocument();
    expect(screen.getByText('Waiver')).toBeInTheDocument();
    expect(screen.getByText('Emergency')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('renders step 0 personal info fields by default', () => {
    renderModal();
    expect(document.querySelector('input[name="first_name"]')).toBeInTheDocument();
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
  });

  it('shows validation errors on next without fields', () => {
    renderModal();
    fireEvent.click(screen.getByText('Next'));
    const requiredErrors = screen.getAllByText('Required');
    expect(requiredErrors.length).toBeGreaterThanOrEqual(3);
  });

  it('validates email format', () => {
    renderModal();
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'John' } });
    fireEvent.change(document.querySelector('input[name="last_name"]'), { target: { name: 'last_name', value: 'Doe' } });
    fireEvent.change(document.querySelector('input[name="phone"]'), { target: { name: 'phone', value: '0400123456' } });
    fireEvent.change(document.querySelector('input[name="email"]'), { target: { name: 'email', value: 'invalid' } });
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('navigates to step 1 with valid personal info', () => {
    renderModal();
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'John' } });
    fireEvent.change(document.querySelector('input[name="last_name"]'), { target: { name: 'last_name', value: 'Doe' } });
    fireEvent.change(document.querySelector('input[name="email"]'), { target: { name: 'email', value: 'john@test.com' } });
    fireEvent.change(document.querySelector('input[name="phone"]'), { target: { name: 'phone', value: '0400123456' } });
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Membership Details')).toBeInTheDocument();
  });

  it('shows no-templates message in waiver step', () => {
    renderModal();
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'John' } });
    fireEvent.change(document.querySelector('input[name="last_name"]'), { target: { name: 'last_name', value: 'Doe' } });
    fireEvent.change(document.querySelector('input[name="email"]'), { target: { name: 'email', value: 'john@test.com' } });
    fireEvent.change(document.querySelector('input[name="phone"]'), { target: { name: 'phone', value: '0400123456' } });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(document.querySelector('select[name="location"]'), { target: { name: 'location', value: 'rockingham' } });
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText(/no waiver templates/i)).toBeInTheDocument();
  });

  it('calls onClose in step 0 cancel button', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('goes back from step 1 to step 0', () => {
    renderModal();
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'John' } });
    fireEvent.change(document.querySelector('input[name="last_name"]'), { target: { name: 'last_name', value: 'Doe' } });
    fireEvent.change(document.querySelector('input[name="email"]'), { target: { name: 'email', value: 'john@test.com' } });
    fireEvent.change(document.querySelector('input[name="phone"]'), { target: { name: 'phone', value: '0400123456' } });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
  });

  it('submits form on final step', async () => {
    renderModal();
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'John' } });
    fireEvent.change(document.querySelector('input[name="last_name"]'), { target: { name: 'last_name', value: 'Doe' } });
    fireEvent.change(document.querySelector('input[name="email"]'), { target: { name: 'email', value: 'john@test.com' } });
    fireEvent.change(document.querySelector('input[name="phone"]'), { target: { name: 'phone', value: '0400123456' } });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(document.querySelector('select[name="location"]'), { target: { name: 'location', value: 'rockingham' } });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(document.querySelector('input[name="emergency_contact_name"]'), { target: { name: 'emergency_contact_name', value: 'Jane Doe' } });
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText(/Review & Confirm/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Create Member'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it('renders experience level dropdown with default option', () => {
    renderModal();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });
});
