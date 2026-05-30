import useAiChat from '../hooks/useAiChat';
import ChatPanel from '../components/AI/ChatPanel';
import { PageErrorBoundary } from '../components/Shared/ErrorBoundary';

const SUGGESTIONS = [
  'How many active members?',
  'Show me new leads',
  "What's today's revenue?",
  'Any overdue tasks?',
  'Give me a business summary'
];

function AIAssistantContent() {
  const { messages, sendMessage, isLoading } = useAiChat();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
        <p className="text-gray-500 mt-1">Ask me anything about your gym</p>
      </div>

      <div className="flex-1 flex flex-col">
        <ChatPanel
          messages={messages}
          onSend={sendMessage}
          isLoading={isLoading}
          placeholder="Ask me anything..."
          suggestions={SUGGESTIONS}
        />
      </div>
    </div>
  );
}

export default function AIAssistant() {
  return (
    <PageErrorBoundary pageName="AI Assistant">
      <AIAssistantContent />
    </PageErrorBoundary>
  );
}
