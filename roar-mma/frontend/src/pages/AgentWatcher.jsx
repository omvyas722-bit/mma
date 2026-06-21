import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

const AGENT_COLORS = {
  zeus: '#6366f1', scout: '#06b6d4', healer: '#10b981', pixel: '#f59e0b',
  leads: '#ef4444', trials: '#f97316', retention: '#8b5cf6', tasks: '#3b82f6',
  analytics: '#14b8a6', billing: '#22c55e', grading: '#eab308', stock: '#a855f7',
  staff: '#64748b', messaging: '#0ea5e9', student_coaching: '#84cc16',
  sales_team: '#ec4899', member_success_team: '#06b6d4', operations_team: '#f59e0b',
  finance_team: '#22c55e',
};

const AGENT_LABELS = {
  zeus: 'Zeus (Orchestrator)', scout: 'Scout (Lead Scoring)', healer: 'Healer (Health)',
  pixel: 'Pixel (Tracking)', leads: 'Leads', trials: 'Trials', retention: 'Retention',
  tasks: 'Tasks', analytics: 'Analytics', billing: 'Billing', grading: 'Grading',
  stock: 'Stock', staff: 'Staff', messaging: 'Messaging',
  student_coaching: 'Student Coaching', sales_team: 'Sales Team',
  member_success_team: 'Member Success', operations_team: 'Operations',
  finance_team: 'Finance',
};

function StepIcon({ step }) {
  if (step.step === 'starting') return '▶️';
  if (step.step === 'complete') return '✅';
  if (step.step === 'error') return '❌';
  if (step.step === 'llm') return '🤖';
  if (step.step === 'actions') return '⚡';
  return '●';
}

export default function AgentWatcher() {
  const { addStepListener, getRecentSteps } = useWebSocket();
  const [steps, setSteps] = useState([]);
  const [filter, setFilter] = useState('all');
  const [paused, setPaused] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [bufferedCount, setBufferedCount] = useState(0);
  const bottomRef = useRef(null);
  const pausedStepsRef = useRef([]);

  useEffect(() => {
    const unsub = addStepListener((step) => {
      if (paused) {
        pausedStepsRef.current.push(step);
        setBufferedCount(pausedStepsRef.current.length);
        return;
      }
      setSteps(prev => [step, ...prev].slice(0, 300));
      if (step.step === 'starting') setActiveAgent(step.agent);
      if (step.step === 'complete' || step.step === 'error') {
        setActiveAgent(prev => prev === step.agent ? null : prev);
      }
    });
    return unsub;
  }, [addStepListener, paused]);

  useEffect(() => {
    if (!paused && pausedStepsRef.current.length > 0) {
      const batch = pausedStepsRef.current;
      pausedStepsRef.current = [];
      setBufferedCount(0);
      setSteps(prev => [...batch.reverse(), ...prev].slice(0, 300));
    }
  }, [paused]);

  const filtered = filter === 'all' ? steps : steps.filter(s => s.agent === filter);
  const agents = [...new Set(steps.map(s => s.agent))];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-white shrink-0">
        <h1 className="text-lg font-bold whitespace-nowrap">👁 Agent Watcher</h1>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Filter:</span>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="border rounded px-2 py-1 text-sm">
            <option value="all">All Agents</option>
            {agents.map(a => (
              <option key={a} value={a}>{AGENT_LABELS[a] || a}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {activeAgent && (
            <span className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: AGENT_COLORS[activeAgent] || '#666' }}>
              <span className="animate-pulse w-2 h-2 rounded-full inline-block" style={{ backgroundColor: AGENT_COLORS[activeAgent] || '#666' }} />
              {AGENT_LABELS[activeAgent] || activeAgent} running...
            </span>
          )}
          <button onClick={() => setPaused(v => !v)}
            className={`px-3 py-1.5 rounded text-sm font-medium border ${paused ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-white border-gray-300 text-gray-600'}`}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button onClick={() => setSteps([])}
            className="px-3 py-1.5 rounded text-sm font-medium border bg-white border-gray-300 text-gray-600 hover:bg-gray-50">
            🗑 Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono text-xs bg-gray-950 text-gray-200">
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm font-sans">
            {steps.length === 0
              ? 'Waiting for agent steps...'
              : 'No steps match this filter'}
          </div>
        )}
        {filtered.map((step, i) => {
          const color = AGENT_COLORS[step.agent] || '#666';
          const isCurrent = step.agent === activeAgent && step.step !== 'complete' && step.step !== 'error';
          return (
            <div key={`${step.timestamp}-${i}`}
              className={`flex items-start gap-2 py-0.5 px-2 rounded ${isCurrent ? 'bg-white/5' : ''} transition-colors`}>
              <span className="shrink-0 w-4 text-center" style={{ color }}>{StepIcon({ step })}</span>
              <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: color }} />
              <span className="shrink-0 font-semibold whitespace-nowrap" style={{ color }}>
                {AGENT_LABELS[step.agent] || step.agent}
              </span>
              <span className="text-gray-500 shrink-0">
                {step.step}
              </span>
              <span className="text-gray-400 truncate">
                {step.detail}
              </span>
              <span className="ml-auto shrink-0 text-gray-600">
                {new Date(step.timestamp).toLocaleTimeString()}
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-1.5 border-t bg-gray-900 text-gray-400 text-xs flex items-center gap-4 shrink-0">
        <span>{filtered.length} steps displayed</span>
        <span>{(steps.length - filtered.length) > 0 && `${steps.length - filtered.length} hidden by filter`}</span>
        {paused && <span className="text-yellow-400 font-medium">⏸ PAUSED ({bufferedCount} buffered)</span>}
        {!paused && <span className="text-green-400">● Live</span>}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .animate-pulse { animation: pulse 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
