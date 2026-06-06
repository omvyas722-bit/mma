import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const AGENT_POSITIONS = [
  { id: 'CEO', x: 50, y: 10, icon: '👑', color: '#FF3B30' },
  { id: 'Researcher', x: 15, y: 40, icon: '🔍', color: '#FFD60A' },
  { id: 'CMO', x: 85, y: 40, icon: '📢', color: '#FF3B30' },
  { id: 'Sales Rep', x: 10, y: 75, icon: '🎯', color: '#FFD60A' },
  { id: 'Data Analyst', x: 50, y: 55, icon: '📊', color: '#FFD60A' },
  { id: 'Dev', x: 90, y: 75, icon: '⚙️', color: '#FF3B30' },
];

const CATEGORY_EMOJIS = {
  conversion: '💰',
  marketing: '📢',
  retention: '🛡️',
  competitive: '🏁',
  trend: '📈',
};

function NetworkDiagram({ agents }) {
  const connections = [
    ['CEO', 'Researcher'], ['CEO', 'CMO'], ['CEO', 'Sales Rep'], ['CEO', 'Dev'], ['CEO', 'Data Analyst'],
    ['Researcher', 'CMO'], ['CMO', 'Sales Rep'], ['Data Analyst', 'CMO'], ['Data Analyst', 'Researcher'],
    ['Sales Rep', 'Data Analyst'],
  ];

  return (
    <div className="relative w-full" style={{ aspectRatio: '2/1', maxHeight: 350 }}>
      <svg className="absolute inset-0 w-full h-full">
        {connections.map(([from, to], i) => {
          const f = AGENT_POSITIONS.find(a => a.id === from);
          const t = AGENT_POSITIONS.find(a => a.id === to);
          if (!f || !t) return null;
          return (
            <line
              key={i}
              x1={`${f.x}%`} y1={`${f.y}%`}
              x2={`${t.x}%`} y2={`${t.y}%`}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      {AGENT_POSITIONS.map((pos, i) => {
        const agent = agents?.find(a => a.name === pos.id);
        const statusColor = agent?.status === 'running' || agent?.status === 'completed' ? '#34C759'
          : agent?.status === 'waiting' ? '#FF9500' : '#8E8E93';

        return (
          <div
            key={i}
            className="absolute flex flex-col items-center gap-1 transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-all" style={{
              background: `${pos.color}15`,
              borderColor: statusColor,
            }}>
              {pos.icon}
            </div>
            <span className="text-[10px] font-semibold text-white whitespace-nowrap">{pos.id}</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          </div>
        );
      })}
    </div>
  );
}

export default function AgentNetwork() {
  const { data, isLoading } = useQuery({
    queryKey: ['agentic-network'],
    queryFn: () => api.get('/api/agentic/network').then(r => r.data),
    refetchInterval: 30000,
  });

  const insights = data?.insights || [];

  return (
    <div className="min-h-screen" style={{ background: '#0D0F1A' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🔗</span>
              <h1 className="text-2xl font-bold text-white">Agent Network</h1>
            </div>
            <p className="text-sm" style={{ color: '#8E8E93' }}>Shared Memory System · Multi-Agent</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#8E8E93' }}>Learned This Week</p>
            <p className="text-2xl font-bold" style={{ color: '#FFD60A' }}>{data?.weeklyCount ?? 0}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: '#FF3B30', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <>
            <div className="mb-8 p-6 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <NetworkDiagram agents={data?.agentStatuses} />
            </div>

            <div className="flex items-center gap-4 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
              {['All', ...(data?.knownCategories || [])].map(cat => {
                const emoji = cat === 'All' ? '📋' : CATEGORY_EMOJIS[cat] || '📌';
                return (
                  <button
                    key={cat}
                    className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#8E8E93' }}
                  >
                    {emoji} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                );
              })}
            </div>

            <h2 className="text-lg font-bold text-white mb-4">Shared Insights</h2>
            <div className="space-y-3">
              {insights.map(insight => (
                <div
                  key={insight.id}
                  className="p-4 rounded-xl border transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{CATEGORY_EMOJIS[insight.category] || '💡'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-relaxed mb-2">{insight.summary}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: '#FF3B3020', color: '#FF3B30' }}>
                          Discovered by {insight.sourceAgent}
                        </span>
                        <span className="text-[10px]" style={{ color: '#8E8E93' }}>
                          Shared with: {insight.targetAgents.join(', ')}
                        </span>
                        <span className="text-[10px]" style={{ color: '#8E8E93' }}>
                          {new Date(insight.discoveredAt + 'Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] flex-shrink-0 px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(255,255,255,0.06)', color: '#8E8E93' }}>
                      {insight.category}
                    </span>
                  </div>
                </div>
              ))}

              {insights.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm" style={{ color: '#8E8E93' }}>No insights shared yet</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
