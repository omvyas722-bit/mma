import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import SignWaiverModal from './SignWaiverModal';
import api from '../../lib/api';

const mockTemplate = {
  id: 1,
  name: 'General Waiver',
  body_text: 'I hereby release the gym from all liability...',
};

vi.mock('../../lib/api', () => ({
  default: { post: vi.fn().mockResolvedValue({ data: {} }) },
}));



beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    strokeStyle: '#1f2937',
    lineWidth: 2,
    lineCap: 'round',
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillText: vi.fn(),
  });
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
});

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SignWaiverModal
        template={mockTemplate}
        onClose={vi.fn()}
        onSigned={vi.fn()}
        preselectedMemberId=""
        isMinor={false}
        memberName=""
        {...props}
      />
    </QueryClientProvider>
  );
}

describe('SignWaiverModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: {} });
  });

  it('renders waiver title with template name', () => {
    renderModal();
    expect(screen.getByText(/Sign Waiver: General Waiver/i)).toBeInTheDocument();
  });

  it('renders waiver body text', () => {
    renderModal();
    expect(screen.getByText(/I hereby release the gym/i)).toBeInTheDocument();
  });

  it('renders member ID input when no memberName', () => {
    renderModal();
    expect(document.querySelector('input[type="number"]')).toBeInTheDocument();
  });

  it('shows member name when provided', () => {
    renderModal({ memberName: 'John Doe' });
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(document.querySelector('input[type="number"]')).not.toBeInTheDocument();
  });

  it('renders signature canvas', () => {
    renderModal();
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders clear signature button', () => {
    renderModal();
    expect(screen.getByText('Clear signature')).toBeInTheDocument();
  });

  it('renders by-signing agreement text', () => {
    renderModal();
    expect(screen.getByText(/By signing above, you agree/i)).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    renderModal();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders sign waiver button', () => {
    renderModal();
    expect(screen.getByText('Sign Waiver')).toBeInTheDocument();
  });

  it('disables sign button when no member ID and no signature', () => {
    renderModal();
    expect(screen.getByText('Sign Waiver')).toBeDisabled();
  });

  it('enables sign button with member ID and signature', () => {
    renderModal({ preselectedMemberId: '1' });
    const canvas = document.querySelector('canvas');
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(canvas);
    expect(screen.getByText('Sign Waiver')).not.toBeDisabled();
  });

  it('shows guardian section when isMinor', () => {
    renderModal({ isMinor: true });
    expect(screen.getByText(/Parent\/Guardian Consent Required/i)).toBeInTheDocument();
    expect(document.querySelector('input[aria-label="Parent name"]')).toBeInTheDocument();
    expect(document.querySelector('select[aria-label="Relationship"]')).toBeInTheDocument();
  });

  it('renders guardian relationship options', () => {
    renderModal({ isMinor: true, preselectedMemberId: '2' });
    expect(screen.getByText('Mother')).toBeInTheDocument();
    expect(screen.getByText('Father')).toBeInTheDocument();
    expect(screen.getByText('Legal Guardian')).toBeInTheDocument();
    expect(screen.getByText('Grandparent')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const backdrop = document.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close on dialog click', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const dialog = document.querySelector('[role="dialog"]');
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on cancel button', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls API on sign', async () => {
    const onSigned = vi.fn();
    renderModal({ preselectedMemberId: '1', onSigned });
    const canvas = document.querySelector('canvas');
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(canvas);
    fireEvent.click(screen.getByText('Sign Waiver'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/waivers/sign', expect.objectContaining({
        member_id: 1, template_id: 1, signature_data: expect.any(String),
      }));
    });
  });

  it('includes guardian data when isMinor', async () => {
    const onSigned = vi.fn();
    renderModal({ isMinor: true, preselectedMemberId: '2', onSigned });
    const canvas = document.querySelector('canvas');
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(canvas);
    fireEvent.change(document.querySelector('input[aria-label="Parent name"]'), { target: { value: 'Parent Doe' } });
    fireEvent.change(document.querySelector('select[aria-label="Relationship"]'), { target: { value: 'mother' } });
    fireEvent.click(screen.getByText('Sign Waiver'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/waivers/sign', expect.objectContaining({
        member_id: 2, guardian_name: 'Parent Doe', guardian_relation: 'mother',
      }));
    });
  });

  it('calls onSigned on success', async () => {
    const onSigned = vi.fn();
    renderModal({ preselectedMemberId: '1', onSigned });
    const canvas = document.querySelector('canvas');
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(canvas);
    fireEvent.click(screen.getByText('Sign Waiver'));
    await waitFor(() => {
      expect(onSigned).toHaveBeenCalled();
    });
  });

  it('shows alert on API failure', async () => {
    api.post.mockRejectedValueOnce(new Error('API error'));
    window.alert = vi.fn();
    renderModal({ preselectedMemberId: '1' });
    const canvas = document.querySelector('canvas');
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(canvas);
    fireEvent.click(screen.getByText('Sign Waiver'));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to sign waiver');
    });
  });

  it('disables sign button while signing', async () => {
    api.post.mockImplementation(() => new Promise(() => {}));
    renderModal({ preselectedMemberId: '1' });
    const canvas = document.querySelector('canvas');
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(canvas);
    fireEvent.click(screen.getByText('Sign Waiver'));
    await waitFor(() => {
      expect(screen.getByText('Signing...')).toBeDisabled();
    });
  });
});
