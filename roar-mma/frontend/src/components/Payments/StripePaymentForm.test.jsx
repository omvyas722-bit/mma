import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StripePaymentForm from './StripePaymentForm';
import api from '../../lib/api';
import { useStripe, useElements } from '@stripe/react-stripe-js';

vi.mock('@stripe/react-stripe-js', () => ({
  CardElement: (props) => <div data-testid="card-element" data-options={JSON.stringify(props.options)} />,
  useStripe: vi.fn(),
  useElements: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  default: { post: vi.fn() },
}));

const mockStripe = {
  confirmCardPayment: vi.fn(),
};

const mockElements = {
  getElement: vi.fn(),
};

describe('StripePaymentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStripe.mockReturnValue(mockStripe);
    useElements.mockReturnValue(mockElements);
    api.post.mockResolvedValue({});
  });

  it('renders amount', () => {
    render(<StripePaymentForm amount={99.99} memberId={1} />);
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('shows submit button with amount', () => {
    render(<StripePaymentForm amount={49.99} memberId={1} />);
    expect(screen.getByText('Pay $49.99')).toBeInTheDocument();
  });

  it('renders card element', () => {
    render(<StripePaymentForm amount={99.99} memberId={1} />);
    expect(screen.getByTestId('card-element')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<StripePaymentForm amount={99.99} memberId={1} description="Monthly Dues" />);
    expect(screen.getByText('Monthly Dues')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<StripePaymentForm amount={99.99} memberId={1} />);
    expect(screen.queryByText('Monthly Dues')).not.toBeInTheDocument();
  });

  it('disables submit when stripe not loaded', () => {
    useStripe.mockReturnValue(null);
    render(<StripePaymentForm amount={99.99} memberId={1} />);
    expect(screen.getByText('Pay $99.99')).toBeDisabled();
  });

  it('disables submit while loading', () => {
    render(<StripePaymentForm amount={99.99} memberId={1} />);
    expect(screen.getByText('Pay $99.99')).not.toBeDisabled();
  });

  it('calls create intent API on submit', async () => {
    api.post.mockResolvedValueOnce({ client_secret: 'secret_123', intent_id: 'pi_123' });
    mockStripe.confirmCardPayment.mockResolvedValueOnce({
      paymentIntent: { status: 'succeeded' },
    });
    mockElements.getElement.mockReturnValue({});

    render(<StripePaymentForm amount={99.99} memberId={1} />);
    fireEvent.click(screen.getByText('Pay $99.99'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/transactions/stripe/intent', {
        amount: 99.99,
        member_id: 1,
        description: '',
      });
    });
  });

  it('calls confirm API on successful payment', async () => {
    api.post
      .mockResolvedValueOnce({ client_secret: 'secret_123', intent_id: 'pi_123' })
      .mockResolvedValueOnce({});
    mockStripe.confirmCardPayment.mockResolvedValueOnce({
      paymentIntent: { status: 'succeeded' },
    });
    mockElements.getElement.mockReturnValue({});

    const onSuccess = vi.fn();
    render(<StripePaymentForm amount={99.99} memberId={1} type="membership" description="Monthly" onSuccess={onSuccess} />);
    fireEvent.click(screen.getByText('Pay $99.99'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/transactions/stripe/confirm', {
        intent_id: 'pi_123',
        member_id: 1,
        amount: 99.99,
        type: 'membership',
        description: 'Monthly',
        payment_method: 'card',
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows error on confirm failure', async () => {
    api.post.mockResolvedValueOnce({ client_secret: 'secret_123', intent_id: 'pi_123' });
    mockStripe.confirmCardPayment.mockResolvedValueOnce({
      error: { message: 'Card declined' },
    });
    mockElements.getElement.mockReturnValue({});

    const onError = vi.fn();
    render(<StripePaymentForm amount={99.99} memberId={1} onError={onError} />);
    fireEvent.click(screen.getByText('Pay $99.99'));

    await waitFor(() => {
      expect(screen.getByText('Card declined')).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith('Card declined');
    });
  });

  it('shows error on unsuccessful payment status', async () => {
    api.post
      .mockResolvedValueOnce({ client_secret: 'secret_123', intent_id: 'pi_123' })
      .mockResolvedValueOnce({});
    mockStripe.confirmCardPayment.mockResolvedValueOnce({
      paymentIntent: { status: 'requires_payment_method' },
    });
    mockElements.getElement.mockReturnValue({});

    render(<StripePaymentForm amount={99.99} memberId={1} />);
    fireEvent.click(screen.getByText('Pay $99.99'));

    await waitFor(() => {
      expect(screen.getByText('Payment was not successful')).toBeInTheDocument();
    });
  });

  it('shows error on API exception', async () => {
    api.post.mockRejectedValue({ response: { data: { error: 'Server error' } } });
    mockStripe.confirmCardPayment.mockResolvedValue({ paymentIntent: { status: 'succeeded' } });

    render(<StripePaymentForm amount={99.99} memberId={1} />);
    fireEvent.click(screen.getByText('Pay $99.99'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('shows processing state while submitting', async () => {
    api.post.mockImplementation(() => new Promise(() => {}));

    render(<StripePaymentForm amount={99.99} memberId={1} />);
    fireEvent.click(screen.getByText('Pay $99.99'));

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('passes style options to CardElement', () => {
    render(<StripePaymentForm amount={99.99} memberId={1} />);
    const cardElement = screen.getByTestId('card-element');
    const options = JSON.parse(cardElement.dataset.options);
    expect(options.style.base.color).toBe('#374151');
    expect(options.style.base.fontSize).toBe('16px');
  });
});
