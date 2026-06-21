import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Alert, AlertWithAction, BannerAlert, InlineAlert, AlertList, Callout } from './index';

describe('Alert', () => {
  it('renders children', () => {
    render(<Alert>Message</Alert>);
    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Alert title="Warning">Message</Alert>);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('renders with role="alert"', () => {
    render(<Alert>Alert!</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows dismiss button when dismissible', () => {
    render(<Alert dismissible>Dismiss me</Alert>);
    expect(screen.getByLabelText('Dismiss alert')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();
    render(<Alert dismissible onDismiss={onDismiss}>X</Alert>);
    fireEvent.click(screen.getByLabelText('Dismiss alert'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not show dismiss button when not dismissible', () => {
    render(<Alert>No dismiss</Alert>);
    expect(screen.queryByLabelText('Dismiss alert')).not.toBeInTheDocument();
  });

  it('renders with all variants', () => {
    const variants = ['info', 'success', 'warning', 'error'];
    variants.forEach(v => {
      const { unmount } = render(<Alert variant={v}>{v} alert</Alert>);
      expect(screen.getByText(`${v} alert`)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders custom icon', () => {
    render(<Alert icon={<span data-testid="custom-icon">*</span>}>With icon</Alert>);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Alert className="my-class">Styled</Alert>);
    expect(container.firstChild).toHaveClass('my-class');
  });
});

describe('AlertWithAction', () => {
  it('renders action button with label', () => {
    const onAction = vi.fn();
    render(<AlertWithAction actionLabel="Click me" onAction={onAction}>Do it</AlertWithAction>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Click me'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when no label', () => {
    render(<AlertWithAction>No action</AlertWithAction>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('BannerAlert', () => {
  it('renders children', () => {
    render(<BannerAlert>Banner message</BannerAlert>);
    expect(screen.getByText('Banner message')).toBeInTheDocument();
  });

  it('renders dismiss button when dismissible', () => {
    render(<BannerAlert dismissible>Banner</BannerAlert>);
    expect(screen.getByLabelText('Dismiss banner')).toBeInTheDocument();
  });

  it('calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(<BannerAlert dismissible onDismiss={onDismiss}>Banner</BannerAlert>);
    fireEvent.click(screen.getByLabelText('Dismiss banner'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has role="alert"', () => {
    render(<BannerAlert>Alert</BannerAlert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('InlineAlert', () => {
  it('renders children', () => {
    render(<InlineAlert>Inline message</InlineAlert>);
    expect(screen.getByText('Inline message')).toBeInTheDocument();
  });

  it('renders with default error variant', () => {
    const { container } = render(<InlineAlert>Error</InlineAlert>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('AlertList', () => {
  it('renders multiple alerts', () => {
    render(<AlertList alerts={[{ message: 'First' }, { message: 'Second' }]} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('calls onDismiss with alert id', () => {
    const onDismiss = vi.fn();
    render(<AlertList alerts={[{ id: 1, message: 'Test', dismissible: true }]} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText('Dismiss alert'));
    expect(onDismiss).toHaveBeenCalledWith(1);
  });
});

describe('Callout', () => {
  it('renders children', () => {
    render(<Callout>Callout content</Callout>);
    expect(screen.getByText('Callout content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Callout title="Note">Content</Callout>);
    expect(screen.getByText('Note')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(<Callout icon={<span data-testid="callout-icon">i</span>}>Content</Callout>);
    expect(screen.getByTestId('callout-icon')).toBeInTheDocument();
  });
});
