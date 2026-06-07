import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../lib/api';

const CARD_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#374151',
      fontFamily: 'system-ui, sans-serif',
      '::placeholder': { color: '#9CA3AF' },
    },
    invalid: { color: '#DC2626' },
  },
};

export default function StripePaymentForm({ amount, memberId, onSuccess, onError, description = '', type = 'membership' }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || loading) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const { client_secret, intent_id } = await api.post('/api/transactions/stripe/intent', {
        amount,
        member_id: memberId,
        description,
      });

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (confirmError) throw new Error(confirmError.message);

      if (paymentIntent.status === 'succeeded') {
        await api.post('/api/transactions/stripe/confirm', {
          intent_id,
          member_id: memberId,
          amount,
          type,
          description,
          payment_method: 'card',
        });
        onSuccess?.(paymentIntent);
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Payment failed';
      setErrorMsg(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-center mb-4">
          <p className="text-2xl font-bold text-gray-900">${amount.toFixed(2)}</p>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        <div className="bg-white border border-gray-300 rounded-lg p-3">
          <CardElement options={CARD_OPTIONS} />
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            Processing...
          </span>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </button>
    </form>
  );
}
