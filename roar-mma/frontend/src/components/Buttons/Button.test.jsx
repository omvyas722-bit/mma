import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button, IconButton, ButtonGroup, CloseButton, CopyButton, DropdownButton, SocialButton } from './index';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });

  it('applies variant classes', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('bg-blue-600', 'text-white');
  });

  it('applies secondary variant class', () => {
    render(<Button variant="secondary">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('bg-gray-600', 'text-white');
  });

  it('applies success variant class', () => {
    render(<Button variant="success">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('bg-green-600', 'text-white');
  });

  it('applies danger variant class', () => {
    render(<Button variant="danger">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('bg-red-600', 'text-white');
  });

  it('applies outline variant class', () => {
    render(<Button variant="outline">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('border-2', 'border-gray-300');
  });

  it('applies ghost variant class', () => {
    render(<Button variant="ghost">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('text-gray-700', 'hover:bg-gray-100');
  });

  it('applies link variant class', () => {
    render(<Button variant="link">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('text-blue-600', 'hover:text-blue-700');
  });

  it('shows loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });

  it('renders with icon', () => {
    const Icon = () => <span data-testid="icon">icon</span>;
    render(<Button leftIcon={<Icon />}>Click me</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders right icon', () => {
    const Icon = () => <span data-testid="right-icon">icon</span>;
    render(<Button rightIcon={<Icon />}>Click me</Button>);
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('hides icons when loading', () => {
    const Icon = () => <span data-testid="icon">icon</span>;
    render(<Button loading leftIcon={<Icon />}>Click me</Button>);
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });

  it('applies full width', () => {
    render(<Button fullWidth>Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('w-full');
  });

  it('applies size classes', () => {
    const { rerender } = render(<Button size="xs">X</Button>);
    expect(screen.getByText('X')).toHaveClass('px-2', 'py-1', 'text-xs');
    rerender(<Button size="xl">X</Button>);
    expect(screen.getByText('X')).toHaveClass('px-8', 'py-4', 'text-xl');
  });

  it('forwards ref', () => {
    const ref = { current: null };
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

describe('IconButton', () => {
  it('renders with children', () => {
    render(<IconButton aria-label="Edit"><span data-testid="icon">X</span></IconButton>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('uses aria-label', () => {
    render(<IconButton aria-label="Close">X</IconButton>);
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('is disabled', () => {
    render(<IconButton disabled aria-label="X">X</IconButton>);
    expect(screen.getByLabelText('X')).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<IconButton loading aria-label="X">X</IconButton>);
    expect(screen.getByLabelText('X')).toBeDisabled();
    expect(screen.queryByText('X')).not.toBeInTheDocument();
  });

  it('applies rounded class', () => {
    render(<IconButton aria-label="X">X</IconButton>);
    expect(screen.getByLabelText('X')).toHaveClass('rounded-full');
  });

  it('applies variant classes', () => {
    render(<IconButton variant="danger" aria-label="X">X</IconButton>);
    expect(screen.getByLabelText('X')).toHaveClass('bg-red-600', 'text-white');
  });
});

describe('ButtonGroup', () => {
  it('renders children', () => {
    render(<ButtonGroup><Button>Left</Button><Button>Right</Button></ButtonGroup>);
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Right')).toBeInTheDocument();
  });

  it('applies role group', () => {
    render(<ButtonGroup><Button>A</Button></ButtonGroup>);
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('applies border radius classes to first and last', () => {
    render(<ButtonGroup><Button>Left</Button><Button>Mid</Button><Button>Right</Button></ButtonGroup>);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveClass('rounded-r-none');
    expect(buttons[2]).toHaveClass('rounded-l-none');
    expect(buttons[1]).toHaveClass('rounded-none');
  });
});

describe('CloseButton', () => {
  it('renders with close icon', () => {
    render(<CloseButton />);
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('calls onClick', () => {
    const onClick = vi.fn();
    render(<CloseButton onClick={onClick} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies size class', () => {
    render(<CloseButton size="lg" />);
    expect(document.querySelector('svg')).toHaveClass('w-6', 'h-6');
  });
});

describe('CopyButton', () => {
  it('renders with copy icon', () => {
    render(<CopyButton text="hello" />);
    expect(screen.getByLabelText('Copy to clipboard')).toBeInTheDocument();
  });

  it('shows copied state after click', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
    render(<CopyButton text="hello" />);
    fireEvent.click(screen.getByLabelText('Copy to clipboard'));
    expect(await screen.findByLabelText('Copied')).toBeInTheDocument();
  });

  it('calls onCopy after copy', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
    const onCopy = vi.fn();
    render(<CopyButton text="hello" onCopy={onCopy} />);
    fireEvent.click(screen.getByLabelText('Copy to clipboard'));
    await screen.findByLabelText('Copied');
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('uses fallback when clipboard not available', async () => {
    delete navigator.clipboard;
    const execCommand = vi.fn();
    document.execCommand = execCommand;
    render(<CopyButton text="hello" />);
    fireEvent.click(screen.getByLabelText('Copy to clipboard'));
    await screen.findByLabelText('Copied');
    expect(execCommand).toHaveBeenCalledWith('copy');
  });
});

describe('DropdownButton', () => {
  const items = [
    { label: 'Edit', onClick: vi.fn() },
    { label: 'Delete', onClick: vi.fn(), disabled: true },
  ];

  it('renders trigger button', () => {
    render(<DropdownButton items={items}>Actions</DropdownButton>);
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('shows dropdown items on click', () => {
    render(<DropdownButton items={items}>Actions</DropdownButton>);
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls item onClick and closes', () => {
    render(<DropdownButton items={items}>Actions</DropdownButton>);
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByText('Edit'));
    expect(items[0].onClick).toHaveBeenCalled();
  });

  it('disables menu item', () => {
    render(<DropdownButton items={items}>Actions</DropdownButton>);
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByText('Delete')).toBeDisabled();
  });

  it('closes on outside click', () => {
    render(<DropdownButton items={items}>Actions</DropdownButton>);
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});

describe('SocialButton', () => {
  it('renders Google button', () => {
    render(<SocialButton provider="google" />);
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('renders Facebook button', () => {
    render(<SocialButton provider="facebook" />);
    expect(screen.getByText('Continue with Facebook')).toBeInTheDocument();
  });

  it('renders GitHub button', () => {
    render(<SocialButton provider="github" />);
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
  });

  it('calls onClick', () => {
    const onClick = vi.fn();
    render(<SocialButton provider="google" onClick={onClick} />);
    fireEvent.click(screen.getByText('Continue with Google'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
