import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StripeWrapper from './StripeWrapper';

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children, options }) => <div data-testid="stripe-elements" data-options={JSON.stringify(options)}>{children}</div>,
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));

describe('StripeWrapper', () => {
  it('renders children inside Stripe Elements', () => {
    render(<StripeWrapper><div data-testid="child">Form</div></StripeWrapper>);
    expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('passes options to Elements', () => {
    const options = { appearance: { theme: 'stripe' } };
    render(<StripeWrapper options={options}><div>Content</div></StripeWrapper>);
    const elements = screen.getByTestId('stripe-elements');
    expect(JSON.parse(elements.dataset.options)).toEqual(options);
  });

  it('renders without options', () => {
    render(<StripeWrapper><div>Content</div></StripeWrapper>);
    expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <StripeWrapper>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
      </StripeWrapper>
    );
    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
  });
});
