import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ChatPanel from './ChatPanel';

const sampleMessages = [
  { role: 'ai', content: 'Hello! How can I help?', timestamp: '2025-01-01T00:00:00.000Z' },
  { role: 'user', content: 'Show me members', timestamp: '2025-01-01T00:01:00.000Z' },
];

describe('ChatPanel Component', () => {
  it('renders messages', () => {
    render(<ChatPanel messages={sampleMessages} onSend={() => {}} isLoading={false} />);
    expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
    expect(screen.getByText('Show me members')).toBeInTheDocument();
  });

  it('shows typing indicator when loading', () => {
    const { container } = render(<ChatPanel messages={[sampleMessages[0]]} onSend={() => {}} isLoading={true} />);
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots.length).toBe(3);
  });

  it('calls onSend when send button clicked', async () => {
    const handleSend = vi.fn();
    render(<ChatPanel messages={[sampleMessages[0]]} onSend={handleSend} isLoading={false} />);

    const input = screen.getByPlaceholderText('Ask me anything...');
    await userEvent.type(input, 'test query');
    await userEvent.click(screen.getByText('Send'));

    expect(handleSend).toHaveBeenCalledWith('test query');
  });

  it('sends message on Enter key', async () => {
    const handleSend = vi.fn();
    render(<ChatPanel messages={[sampleMessages[0]]} onSend={handleSend} isLoading={false} />);

    const input = screen.getByPlaceholderText('Ask me anything...');
    await userEvent.type(input, 'enter query');
    await userEvent.keyboard('{Enter}');

    expect(handleSend).toHaveBeenCalledWith('enter query');
  });

  it('disables input and button while loading', () => {
    render(<ChatPanel messages={[sampleMessages[0]]} onSend={() => {}} isLoading={true} />);

    expect(screen.getByPlaceholderText('Ask me anything...')).toBeDisabled();
    expect(screen.getByText('...')).toBeDisabled();
  });

  it('renders suggestion chips', () => {
    const suggestions = ['How many members?', 'Show revenue'];
    render(<ChatPanel messages={[sampleMessages[0]]} onSend={() => {}} isLoading={false} suggestions={suggestions} />);

    expect(screen.getByText('How many members?')).toBeInTheDocument();
    expect(screen.getByText('Show revenue')).toBeInTheDocument();
  });

  it('clicking suggestion fills input', async () => {
    const suggestions = ['How many members?'];
    render(<ChatPanel messages={[sampleMessages[0]]} onSend={() => {}} isLoading={false} suggestions={suggestions} />);

    await userEvent.click(screen.getByText('How many members?'));
    const input = screen.getByPlaceholderText('Ask me anything...');
    expect(input.value).toBe('How many members?');
  });

  it('displays user messages on the right and ai messages on the left', () => {
    const { container } = render(<ChatPanel messages={sampleMessages} onSend={() => {}} isLoading={false} />);

    const messagesArea = container.querySelector('.flex-1.overflow-y-auto');
    const messageRows = messagesArea.querySelectorAll(':scope > .flex');
    expect(messageRows.length).toBe(2);
    expect(messageRows[0].className).toContain('justify-start');
    expect(messageRows[1].className).toContain('justify-end');
  });
});
