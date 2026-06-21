import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Badge, StatusBadge, DotBadge, NotificationBadge, Tag, TagGroup,
  MembershipBadge, BeltBadge, ClassTypeBadge, PaymentStatusBadge, LeadStatusBadge,
} from './index';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('renders variants', () => {
    const variants = ['default', 'primary', 'success', 'danger', 'warning', 'info', 'purple', 'pink'];
    variants.forEach(v => {
      const { unmount } = render(<Badge variant={v}>{v}</Badge>);
      expect(screen.getByText(v)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg'];
    sizes.forEach(s => {
      const { unmount } = render(<Badge size={s}>{s}</Badge>);
      expect(screen.getByText(s)).toBeInTheDocument();
      unmount();
    });
  });

  it('shows remove button when removable', () => {
    render(<Badge removable>X</Badge>);
    expect(screen.getByLabelText('Remove')).toBeInTheDocument();
  });

  it('calls onRemove when remove clicked', () => {
    const onRemove = vi.fn();
    render(<Badge removable onRemove={onRemove}>X</Badge>);
    fireEvent.click(screen.getByLabelText('Remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders rounded by default', () => {
    const { container } = render(<Badge>R</Badge>);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('renders square when rounded=false', () => {
    const { container } = render(<Badge rounded={false}>S</Badge>);
    expect(container.firstChild).toHaveClass('rounded');
    expect(container.firstChild).not.toHaveClass('rounded-full');
  });
});

describe('StatusBadge', () => {
  it('renders status label', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders all known statuses', () => {
    const statuses = ['active', 'inactive', 'pending', 'trial', 'paused', 'cancelled', 'completed', 'failed', 'processing'];
    statuses.forEach(s => {
      const { unmount } = render(<StatusBadge status={s} />);
      expect(screen.getByText(s.charAt(0).toUpperCase() + s.slice(1))).toBeInTheDocument();
      unmount();
    });
  });

  it('falls back to raw status text for unknown', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });
});

describe('DotBadge', () => {
  it('renders children', () => {
    render(<DotBadge>Online</DotBadge>);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
});

describe('NotificationBadge', () => {
  it('renders count', () => {
    render(<NotificationBadge count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders max+ format for overflow', () => {
    render(<NotificationBadge count={150} max={99} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('returns null when count is 0 and showZero is false', () => {
    const { container } = render(<NotificationBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows 0 when showZero is true', () => {
    render(<NotificationBadge count={0} showZero />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

describe('Tag', () => {
  it('renders as div when no onClick', () => {
    const { container } = render(<Tag>Static</Tag>);
    expect(container.firstChild.tagName).toBe('DIV');
  });

  it('renders as button when onClick provided', () => {
    render(<Tag onClick={() => {}}>Clickable</Tag>);
    expect(screen.getByText('Clickable').closest('button')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Tag onClick={onClick}>Click</Tag>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows remove button when removable', () => {
    render(<Tag removable>X</Tag>);
    expect(screen.getByLabelText('Remove tag')).toBeInTheDocument();
  });

  it('stops propagation on remove click', () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(<Tag onClick={onClick} removable onRemove={onRemove}>Tag</Tag>);
    fireEvent.click(screen.getByLabelText('Remove tag'));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders selected state', () => {
    const { container } = render(<Tag selected color="blue">Selected</Tag>);
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });
});

describe('TagGroup', () => {
  it('renders children', () => {
    render(<TagGroup><Tag>One</Tag><Tag>Two</Tag></TagGroup>);
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
  });
});

describe('MembershipBadge', () => {
  it('renders label for known types', () => {
    render(<MembershipBadge type="unlimited" />);
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });
});

describe('BeltBadge', () => {
  it('renders belt rank label', () => {
    render(<BeltBadge rank="blue" />);
    expect(screen.getByText('Blue Belt')).toBeInTheDocument();
  });
});

describe('ClassTypeBadge', () => {
  it('renders class type label', () => {
    render(<ClassTypeBadge type="bjj" />);
    expect(screen.getByText('BJJ')).toBeInTheDocument();
  });
});

describe('PaymentStatusBadge', () => {
  it('renders payment status', () => {
    render(<PaymentStatusBadge status="succeeded" />);
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });
});

describe('LeadStatusBadge', () => {
  it('renders lead status', () => {
    render(<LeadStatusBadge status="new" />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });
});
