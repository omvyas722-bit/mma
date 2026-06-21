import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Card, CardHeader, CardBody, CardFooter, PricingCard } from './index';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders variant classes', () => {
    render(<Card variant="elevated">Elevated</Card>);
    expect(screen.getByText('Elevated')).toBeInTheDocument();
  });

  it('is clickable when onClick provided', () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Click</Card>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('PricingCard', () => {
  it('renders name and price', () => {
    render(<PricingCard name="Pro" price="49" period="mo" features={['Feature 1']} />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('$49')).toBeInTheDocument();
    expect(screen.getByText('/mo')).toBeInTheDocument();
  });

  it('renders features list', () => {
    render(<PricingCard name="Pro" price="49" features={['Feature 1', 'Feature 2']} />);
    expect(screen.getByText('Feature 1')).toBeInTheDocument();
    expect(screen.getByText('Feature 2')).toBeInTheDocument();
  });

  it('shows popular badge when highlighted', () => {
    render(<PricingCard name="Pro" price="49" features={[]} highlighted />);
    expect(screen.getByText('Popular')).toBeInTheDocument();
  });

  it('has select button when onSelect provided', () => {
    const onSelect = vi.fn();
    render(<PricingCard name="Free" price="0" features={[]} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Select Plan'));
    expect(onSelect).toHaveBeenCalled();
  });
});

describe('CardHeader', () => {
  it('renders title', () => {
    render(<Card><CardHeader title="Section Title" /></Card>);
    expect(screen.getByText('Section Title')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<Card><CardHeader title="T" subtitle="Sub" /></Card>);
    expect(screen.getByText('Sub')).toBeInTheDocument();
  });

  it('renders action element', () => {
    render(<Card><CardHeader title="T" action={<button>Edit</button>} /></Card>);
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });
});

describe('CardBody', () => {
  it('renders children', () => {
    render(<Card><CardBody><p>Body text</p></CardBody></Card>);
    expect(screen.getByText('Body text')).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('renders children', () => {
    render(<Card><CardFooter><button>Action</button></CardFooter></Card>);
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});
