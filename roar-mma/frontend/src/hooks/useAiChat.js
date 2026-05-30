import { useState, useCallback } from 'react';
import api from '../lib/api';

function createWelcomeMessage() {
  return {
    role: 'ai',
    content: "Hi! I'm your AI gym assistant. Ask me anything about members, leads, classes, revenue, or tasks.",
    timestamp: new Date().toISOString()
  };
}

export default function useAiChat() {
  const [messages, setMessages] = useState(() => [createWelcomeMessage()]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (query) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) return;

    const trimmedQuery = query.trim();
    const userMessage = {
      role: 'user',
      content: trimmedQuery,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/ai/chat', { query: trimmedQuery });
      const aiMessage = {
        role: 'ai',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        actions: response.data.actions || []
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to get response. Please try again.';
      setError(errorMessage);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `Sorry, I couldn't process your request. ${errorMessage}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([createWelcomeMessage()]);
    setError(null);
  }, []);

  return { messages, sendMessage, isLoading, error, clearMessages };
}
