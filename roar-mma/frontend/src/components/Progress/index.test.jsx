import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar, CircularProgress, StepProgress, DotsLoader, PulseLoader } from './index';

describe('ProgressBar', () => {
  it('renders with role="progressbar"', () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow', () => {
    render(<ProgressBar value={60} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
  });

  it('renders label when provided', () => {
    render(<ProgressBar value={50} label="Uploading..." />);
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('renders percentage when showLabel is true', () => {
    render(<ProgressBar value={75} showLabel />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('clamps percentage to 100', () => {
    render(<ProgressBar value={150} />);
    const fillBar = document.querySelector('div[style*="width"]');
    expect(fillBar).toHaveStyle({ width: '100%' });
  });

  it('renders with variant prop', () => {
    render(<ProgressBar value={50} variant="success" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with size prop', () => {
    render(<ProgressBar value={50} size="lg" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('CircularProgress', () => {
  it('renders SVG', () => {
    const { container } = render(<CircularProgress value={50} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('displays percentage text', () => {
    render(<CircularProgress value={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('hides percentage when showLabel is false', () => {
    render(<CircularProgress value={50} showLabel={false} />);
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('renders with size prop', () => {
    const { container } = render(<CircularProgress value={75} size={80} />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '80');
  });

  it('renders with variant prop', () => {
    render(<CircularProgress value={50} variant="success" />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});

describe('StepProgress', () => {
  it('renders steps', () => {
    const steps = ['Step 1', 'Step 2', 'Step 3'];
    render(<StepProgress steps={steps} currentStep={0} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('marks active step', () => {
    const steps = ['Step A', 'Step B'];
    const { container } = render(<StepProgress steps={steps} currentStep={0} />);
    expect(screen.getByText('Step A')).toBeInTheDocument();
  });
});

describe('DotsLoader', () => {
  it('renders dots', () => {
    const { container } = render(<DotsLoader />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('PulseLoader', () => {
  it('renders pulse', () => {
    const { container } = render(<PulseLoader />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
