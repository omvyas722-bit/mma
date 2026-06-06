import { useNavigate } from 'react-router-dom';

const AGENTS = [
  { id: 'ceo', name: 'CEO Orchestrator', role: 'Command Layer', model: 'GPT-5', path: '/agentic/ceo', icon: '👑', color: '#FF3B30', desc: 'Morning briefings, task allocation, churn monitoring' },
  { id: 'researcher', name: 'Researcher', role: 'Intel Gatherer', model: 'Gemini 2.5 Pro', path: '/agentic/intelligence', icon: '🔍', color: '#FFD60A', desc: 'Competitor tracking, market signals, opportunity spotting' },
  { id: 'cmo', name: 'CMO', role: 'Market Voice', model: 'Claude Sonnet 4', path: '/agentic/content', icon: '📢', color: '#FF3B30', desc: 'Content creation, ad copy, social media scripts' },
  { id: 'sales', name: 'Sales Rep', role: 'Revenue Ops', model: 'Claude Sonnet 4', path: '/agentic/leads', icon: '🎯', color: '#FFD60A', desc: '24/7 lead qualification, outreach, retention messages' },
  { id: 'dev', name: 'Dev Agent', role: 'Build System', model: 'GPT-5', path: '/agentic/system', icon: '⚙️', color: '#FF3B30', desc: 'System health, integrations, build monitoring' },
  { id: 'analyst', name: 'Data Analyst', role: 'Signal Layer', model: 'Gemini 2.5 Pro', path: '/agentic/reports', icon: '📊', color: '#FFD60A', desc: 'Performance analytics, retention analysis, conversion tracking' },
  { id: 'network', name: 'Agent Network', role: 'Shared Memory', model: 'Multi-Agent', path: '/agentic/network', icon: '🔗', color: '#FF3B30', desc: 'Cross-agent learning, shared insights, collective intelligence' },
];

export default function AgenticOS() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#0D0F1A' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🧠</span>
            <h1 className="text-3xl font-bold text-white">Agentic OS</h1>
          </div>
          <p className="text-sm" style={{ color: '#8E8E93' }}>
            AI-powered gym operations — 7 autonomous agents working 24/7
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {AGENTS.map(agent => (
            <button
              key={agent.id}
              onClick={() => navigate(agent.path)}
              className="text-left p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{agent.icon}</span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{
                    background: `${agent.color}20`,
                    color: agent.color,
                    border: `1px solid ${agent.color}40`,
                  }}
                >
                  {agent.model}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{agent.name}</h3>
              <p className="text-xs font-medium mb-2" style={{ color: agent.color }}>{agent.role}</p>
              <p className="text-sm" style={{ color: '#8E8E93' }}>{agent.desc}</p>

              <div className="mt-4 flex items-center gap-1 text-xs" style={{ color: '#FF3B30' }}>
                <span>Open</span>
                <span>→</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 p-4 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-xs" style={{ color: '#8E8E93' }}>
            All agents are additive — no existing features were modified.
          </p>
        </div>
      </div>
    </div>
  );
}
