import { useState, useRef, useEffect } from 'react';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  );
}

function SuggestionChips({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPanel({ messages, onSend, isLoading, placeholder, suggestions }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const msgIdCounter = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map((msg) => {
          if (!msg._key) msg._key = `msg-${++msgIdCounter.current}`;
          return <MessageBubble key={msg._key} message={msg} />;
        })}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <SuggestionChips suggestions={suggestions} onSelect={(s) => { setInput(s); inputRef.current?.focus(); }} />

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Ask me anything...'}
            disabled={isLoading}
            className="flex-1 input rounded-full"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="btn btn-primary rounded-full px-5 py-2 disabled:opacity-50"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
