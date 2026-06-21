import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Avatar, AvatarGroup, AvatarWithName, AvatarUpload, AvatarBadge, ClickableAvatar, AvatarPlaceholder } from './index';

describe('Avatar', () => {
  it('renders initials when no src', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders single initial for one name', () => {
    render(<Avatar name="John" />);
    expect(screen.getByText('JO')).toBeInTheDocument();
  });

  it('renders ? when no name', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders img when src provided', () => {
    render(<Avatar src="/test.jpg" alt="Test" />);
    const img = screen.getByAltText('Test');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/test.jpg');
  });

  it('shows fallback on img error', () => {
    render(<Avatar src="/bad.jpg" name="Fallback User" />);
    const img = screen.getByAltText('Photo of Fallback User');
    fireEvent.error(img);
    expect(screen.getByText('FU')).toBeInTheDocument();
  });

  it('shows custom fallback text when provided', () => {
    render(<Avatar name="John Doe" fallback="JD" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders status indicator dot', () => {
    const { container } = render(<Avatar name="John" status="online" />);
    const dot = container.querySelector('span[aria-label="Status: online"]');
    expect(dot).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Avatar name="Test" size="sm" />);
    rerender(<Avatar name="Test" size="lg" />);
    rerender(<Avatar name="Test" size="xl" />);
    expect(screen.getByText('TE')).toBeInTheDocument();
  });

  it('renders square shape', () => {
    const { container } = render(<Avatar name="Test" shape="square" />);
    expect(screen.getByText('TE')).toBeInTheDocument();
  });
});

describe('AvatarGroup', () => {
  const avatars = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
    { id: 4, name: 'Diana' },
  ];

  it('renders limited avatars by max prop', () => {
    render(<AvatarGroup avatars={avatars} max={2} />);
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.getByText('BO')).toBeInTheDocument();
  });

  it('shows remaining count', () => {
    render(<AvatarGroup avatars={avatars} max={2} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('does not show +0 when all fit', () => {
    render(<AvatarGroup avatars={avatars.slice(0, 2)} max={3} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('renders with empty avatars', () => {
    const { container } = render(<AvatarGroup avatars={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('AvatarWithName', () => {
  it('renders name and subtitle', () => {
    render(<AvatarWithName name="John Doe" subtitle="john@test.com" />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
  });

  it('renders without subtitle', () => {
    render(<AvatarWithName name="John Doe" />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});

describe('AvatarUpload', () => {
  it('renders upload button', () => {
    render(<AvatarUpload name="John" />);
    expect(screen.getByLabelText('Upload photo')).toBeInTheDocument();
  });

  it('renders remove button when src and onRemove provided', () => {
    const onRemove = vi.fn();
    render(<AvatarUpload src="/test.jpg" name="John" onRemove={onRemove} />);
    expect(screen.getByLabelText('Remove photo')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Remove photo'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('does not render remove button when no onRemove', () => {
    render(<AvatarUpload src="/test.jpg" name="John" />);
    expect(screen.queryByLabelText('Remove photo')).not.toBeInTheDocument();
  });
});

describe('AvatarBadge', () => {
  it('renders badge number', () => {
    render(<AvatarBadge name="John" badge={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render badge when null', () => {
    render(<AvatarBadge name="John" badge={null} />);
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });
});

describe('ClickableAvatar', () => {
  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ClickableAvatar name="John" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('AvatarPlaceholder', () => {
  it('renders default icon', () => {
    const { container } = render(<AvatarPlaceholder />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(<AvatarPlaceholder icon={<span data-testid="custom">*</span>} />);
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });
});
