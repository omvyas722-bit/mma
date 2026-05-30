import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useAiChat from './useAiChat';

const mockPost = vi.fn();

vi.mock('../lib/api', () => ({
  default: {
    post: (...args) => mockPost(...args),
  },
}));

describe('useAiChat hook', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('initializes with welcome message', () => {
    const { result } = renderHook(() => useAiChat());
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('ai');
    expect(result.current.messages[0].content).toContain('AI gym assistant');
  });

  it('adds user message and gets AI response on send', async () => {
    mockPost.mockResolvedValue({ data: { response: '156 active members', actions: [] } });

    const { result } = renderHook(() => useAiChat());

    await act(async () => {
      await result.current.sendMessage('How many active members?');
    });

    expect(mockPost).toHaveBeenCalledWith('/api/ai/chat', { query: 'How many active members?' });
    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[1].role).toBe('user');
    expect(result.current.messages[2].role).toBe('ai');
    expect(result.current.messages[2].content).toBe('156 active members');
  });

  it('handles error responses gracefully', async () => {
    mockPost.mockRejectedValue({
      response: { data: { error: 'AI service unavailable' } },
    });

    const { result } = renderHook(() => useAiChat());

    await act(async () => {
      await result.current.sendMessage('trigger fail');
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.messages[2].content).toContain('Sorry');
  });

  it('ignores empty messages', async () => {
    const { result } = renderHook(() => useAiChat());

    await act(async () => {
      await result.current.sendMessage('');
    });

    expect(result.current.messages).toHaveLength(1);
  });

  it('ignores whitespace-only messages', async () => {
    const { result } = renderHook(() => useAiChat());

    await act(async () => {
      await result.current.sendMessage('   ');
    });

    expect(result.current.messages).toHaveLength(1);
  });

  it('clears messages back to welcome', () => {
    const { result } = renderHook(() => useAiChat());

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toContain('AI gym assistant');
  });

  it('includes actions in response', async () => {
    mockPost.mockResolvedValue({
      data: { response: 'Task created', actions: [{ type: 'task_created', text: 'Created follow-up' }] },
    });

    const { result } = renderHook(() => useAiChat());

    await act(async () => {
      await result.current.sendMessage('Create a task');
    });

    expect(result.current.messages[2].actions).toHaveLength(1);
    expect(result.current.messages[2].actions[0].type).toBe('task_created');
  });
});
