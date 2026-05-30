import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIAssistant from './AIAssistant';

const mockPost = vi.fn();

vi.mock('../hooks/useAiChat', () => ({
  default: () => ({
    messages: [
      { role: 'ai', content: "Hi! I'm your AI gym assistant.", timestamp: '2025-01-01T00:00:00.000Z' },
    ],
    sendMessage: mockPost,
    isLoading: false,
    error: null,
    clearMessages: vi.fn(),
  }),
}));

describe('AIAssistant Page', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('renders the page title', () => {
    render(<AIAssistant />);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<AIAssistant />);
    expect(screen.getByText('Ask me anything about your gym')).toBeInTheDocument();
  });

  it('renders welcome message', () => {
    render(<AIAssistant />);
    expect(screen.getByText("Hi! I'm your AI gym assistant.")).toBeInTheDocument();
  });

  it('renders suggestion chips', () => {
    render(<AIAssistant />);
    expect(screen.getByText('How many active members?')).toBeInTheDocument();
    expect(screen.getByText("What's today's revenue?")).toBeInTheDocument();
    expect(screen.getByText('Give me a business summary')).toBeInTheDocument();
  });

  it('has working chat input', () => {
    render(<AIAssistant />);
    expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });
});
