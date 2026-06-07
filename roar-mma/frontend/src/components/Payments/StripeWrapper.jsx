import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function StripeWrapper({ children, options }) {
  return <Elements stripe={stripePromise} options={options}>{children}</Elements>;
}
