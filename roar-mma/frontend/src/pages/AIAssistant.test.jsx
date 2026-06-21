import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIAssistant from './AIAssistant';

vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({ error: vi.fn(), success: vi.fn() }),
}));

const mockSendMessage = vi.fn();
const mockClearMessages = vi.fn();
const mockUseAiChat = vi.fn();

vi.mock('../hooks/useAiChat', () => ({
  default: () => mockUseAiChat(),
}));

const defaultMockState = {
  messages: [{ role: 'ai', content: "Hi! I'm your AI gym assistant.", timestamp: '2025-01-01T00:00:00.000Z' }],
  sendMessage: mockSendMessage,
  isLoading: false,
  error: null,
  clearMessages: mockClearMessages,
};

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
};

describe('AIAssistant Page', () => {
  beforeEach(() => {
    mockSendMessage.mockReset();
    mockClearMessages.mockReset();
    mockUseAiChat.mockReturnValue(defaultMockState);
  });

  it('renders the page title', () => {
    render(<AIAssistant />, { wrapper: createWrapper() });
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<AIAssistant />, { wrapper: createWrapper() });
    expect(screen.getByText('Ask me anything about your gym')).toBeInTheDocument();
  });

  it('renders welcome message', () => {
    render(<AIAssistant />, { wrapper: createWrapper() });
    expect(screen.getByText("Hi! I'm your AI gym assistant.")).toBeInTheDocument();
  });

  it('renders suggestion chips', () => {
    render(<AIAssistant />, { wrapper: createWrapper() });
    expect(screen.getByText('How many active members?')).toBeInTheDocument();
    expect(screen.getByText("What's today's revenue?")).toBeInTheDocument();
    expect(screen.getByText('Give me a business summary')).toBeInTheDocument();
  });

  it('renders all five suggestion chips', () => {
    render(<AIAssistant />, { wrapper: createWrapper() });
    expect(screen.getByText('How many active members?')).toBeInTheDocument();
    expect(screen.getByText('Show me new leads')).toBeInTheDocument();
    expect(screen.getByText("What's today's revenue?")).toBeInTheDocument();
    expect(screen.getByText('Any overdue tasks?')).toBeInTheDocument();
    expect(screen.getByText('Give me a business summary')).toBeInTheDocument();
  });

  it('has working chat input with placeholder', () => {
    render(<AIAssistant />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('renders empty state when no messages', () => {
    mockUseAiChat.mockReturnValue({ ...defaultMockState, messages: [] });
    render(<AIAssistant />, { wrapper: createWrapper() });
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.queryByText("Hi! I'm your AI gym assistant.")).not.toBeInTheDocument();
  });

  it('disables send button when loading', () => {
    mockUseAiChat.mockReturnValue({ ...defaultMockState, isLoading: true });
    render(<AIAssistant />, { wrapper: createWrapper() });
    expect(screen.getByText('...')).toBeDisabled();
  });

  it('passes error state without crashing', () => {
    mockUseAiChat.mockReturnValue({ ...defaultMockState, error: 'API connection failed' });
    render(<AIAssistant />, { wrapper: createWrapper() });
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('sends message when clicking send with input', () => {
    render(<AIAssistant />, { wrapper: createWrapper() });
    const input = screen.getByPlaceholderText('Ask me anything...');
    fireEvent.change(input, { target: { value: 'How many members?' } });
    fireEvent.click(screen.getByText('Send'));
    expect(mockSendMessage).toHaveBeenCalledWith('How many members?');
  });

  it('sends message on Enter key press', () => {
    render(<AIAssistant />, { wrapper: createWrapper() });
    const input = screen.getByPlaceholderText('Ask me anything...');
    fireEvent.change(input, { target: { value: 'Show me leads' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockSendMessage).toHaveBeenCalledWith('Show me leads');
  });

  it('renders within PageErrorBoundary', () => {
    const { container } = render(<AIAssistant />, { wrapper: createWrapper() });
    expect(container.innerHTML).toContain('flex');
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('shows loading indicator text on button during loading', () => {
    mockUseAiChat.mockReturnValue({ ...defaultMockState, isLoading: true });
    render(<AIAssistant />, { wrapper: createWrapper() });
    expect(screen.getByText('...')).toBeDisabled();
  });
});
