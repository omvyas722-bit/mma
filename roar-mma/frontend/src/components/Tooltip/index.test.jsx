import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Tooltip, TooltipIcon, HelpText, TruncatedText,
  TooltipButton, TooltipIconButton, RichTooltip, KeyboardShortcutTooltip,
} from './index';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders trigger', () => {
    render(<Tooltip content="Tooltip text"><button>Hover me</button></Tooltip>);
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('shows content on mouse enter after delay', () => {
    render(<Tooltip content="Tooltip text"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('Hover me'));
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Tooltip text')).toBeInTheDocument();
  });

  it('hides content on mouse leave', () => {
    render(<Tooltip content="Tooltip text"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('Hover me'));
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByText('Hover me'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('renders with different placements', () => {
    const placements = ['top', 'bottom', 'left', 'right'];
    placements.forEach(p => {
      const { unmount } = render(
        <Tooltip content="Pos" placement={p}><button>Btn</button></Tooltip>
      );
      expect(screen.getByText('Btn')).toBeInTheDocument();
      unmount();
    });
  });

  it('does not show when disabled', () => {
    render(<Tooltip content="Hidden" disabled><button>Btn</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('Btn'));
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows on focus', () => {
    render(<Tooltip content="Focus tooltip"><button>Focus me</button></Tooltip>);
    fireEvent.focus(screen.getByText('Focus me'));
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText('Focus tooltip')).toBeInTheDocument();
  });

  it('hides on blur', () => {
    render(<Tooltip content="FT"><button>Btn</button></Tooltip>);
    fireEvent.focus(screen.getByText('Btn'));
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText('FT')).toBeInTheDocument();
    fireEvent.blur(screen.getByText('Btn'));
    expect(screen.queryByText('FT')).not.toBeInTheDocument();
  });
});

describe('TooltipIcon', () => {
  it('renders icon with tooltip', () => {
    render(<TooltipIcon content="Info" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('shows tooltip on hover', () => {
    vi.useFakeTimers();
    render(<TooltipIcon content="Help icon" />);
    fireEvent.mouseEnter(screen.getByText('?'));
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText('Help icon')).toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe('HelpText', () => {
  it('renders children', () => {
    render(<HelpText tooltip="Tip">Email</HelpText>);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders tooltip icon', () => {
    render(<HelpText tooltip="Tip">Label</HelpText>);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});

describe('TruncatedText', () => {
  it('renders full text when short', () => {
    render(<TruncatedText>Short</TruncatedText>);
    expect(screen.getByText('Short')).toBeInTheDocument();
  });

  it('truncates long text', () => {
    render(<TruncatedText maxLength={10}>This is a very long text</TruncatedText>);
    expect(screen.getByText('This is a ...')).toBeInTheDocument();
  });
});

describe('TooltipButton', () => {
  it('renders button with tooltip', () => {
    render(<TooltipButton tooltip="Save">Save</TooltipButton>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<TooltipButton tooltip="Save" onClick={onClick}>Save</TooltipButton>);
    fireEvent.click(screen.getByText('Save'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('TooltipIconButton', () => {
  it('renders icon button', () => {
    render(<TooltipIconButton icon={<span data-testid="icon">*</span>} tooltip="Edit" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('has aria-label from tooltip', () => {
    render(<TooltipIconButton icon={<span>*</span>} tooltip="Delete" />);
    expect(screen.getByLabelText('Delete')).toBeInTheDocument();
  });
});

describe('RichTooltip', () => {
  it('renders trigger', () => {
    render(<RichTooltip title="Premium" description="Upgrade"><button>Get</button></RichTooltip>);
    expect(screen.getByText('Get')).toBeInTheDocument();
  });
});

describe('KeyboardShortcutTooltip', () => {
  it('renders shortcut tooltip', () => {
    render(<KeyboardShortcutTooltip shortcut="⌘K" description="Search"><button>Find</button></KeyboardShortcutTooltip>);
    expect(screen.getByText('Find')).toBeInTheDocument();
  });
});
