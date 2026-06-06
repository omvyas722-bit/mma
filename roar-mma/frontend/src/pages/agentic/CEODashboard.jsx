import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

function AgentCard({ agent }) {
  const statusColors = { completed: '#34C759', running: '#FFD60A', pending: '#8E8E93', idle: '#8E8E93', waiting: '#FF9500' };
  const statusLabels = { completed: 'Done', running: 'Working', pending: 'Waiting', idle: 'Idle', waiting: 'Pending' };
  const color = statusColors[agent.status] || '#8E8E93';

  return (
    <div
      className="flex-shrink-0 w-56 p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02]"
      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-white">{agent.name}</span>
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      </div>
      <p className="text-xs mb-1" style={{ color: '#8E8E93' }}>{agent.role}</p>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
        {statusLabels[agent.status]}
      </span>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-white text-sm font-bold">{agent.tasksDone}</p>
          <p className="text-[10px]" style={{ color: '#8E8E93' }}>Tasks</p>
        </div>
        <div>
          <p className="text-white text-sm font-bold">{agent.messagesSent}</p>
          <p className="text-[10px]" style={{ color: '#8E8E93' }}>Messages</p>
        </div>
        <div>
          <p className="text-white text-sm font-bold">{agent.routesMonitored}</p>
          <p className="text-[10px]" style={{ color: '#8E8E93' }}>Routes</p>
        </div>
      </div>
      <p className="text-[10px] mt-2" style={{ color: '#8E8E93' }}>{agent.model}</p>
    </div>
  );
}

export default function CEODashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['agentic-ceo'],
    queryFn: () => api.get('/api/agentic/ceo').then(r => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0F1A' }}>
        <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: '#FF3B30', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0D0F1A' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">👑</span>
              <h1 className="text-2xl font-bold text-white">CEO Orchestrator</h1>
            </div>
            <p className="text-sm" style={{ color: '#8E8E93' }}>Command Layer · GPT-5</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: data?.hasRunToday ? '#34C759' : '#FF9500' }} />
            <span className="text-sm" style={{ color: '#8E8E93' }}>
              {data?.hasRunToday ? 'Ran today at 7:00 AM' : 'Pending — runs at 7:00 AM'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Active Members', value: data?.kpis?.activeMembers ?? 0, color: '#34C759' },
            { label: 'Trial Members', value: data?.kpis?.trialMembers ?? 0, color: '#FFD60A' },
            { label: 'At Risk', value: data?.kpis?.atRiskMembers ?? 0, color: '#FF3B30' },
            { label: 'Today\'s Classes', value: data?.kpis?.todaysClasses ?? 0, color: '#007AFF' },
            { label: 'New Leads', value: data?.kpis?.newLeads ?? 0, color: '#FF9500' },
            { label: 'Today\'s Revenue', value: `$${data?.kpis?.todaysRevenue?.toFixed(0) ?? 0}`, color: '#34C759' },
          ].map((kpi, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: '#8E8E93' }}>{kpi.label}</p>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Today's Directives</h2>
          <div className="space-y-2">
            {(data?.directives || []).map(d => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{
                  background: d.completed ? 'rgba(52,199,89,0.08)' : 'rgba(255,255,255,0.04)',
                  borderColor: d.completed ? 'rgba(52,199,89,0.2)' : 'rgba(255,255,255,0.08)',
                  opacity: d.completed ? 0.6 : 1,
                }}
              >
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  d.completed ? 'bg-[#34C759] border-[#34C759] text-white' : ''
                }`} style={{ borderColor: d.completed ? '#34C759' : d.priority === 'high' ? '#FF3B30' : d.priority === 'medium' ? '#FFD60A' : '#8E8E93' }}>
                  {d.completed ? '✓' : ''}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-white">{d.text}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: d.priority === 'high' ? '#FF3B30' : d.priority === 'medium' ? '#FFD60A' : '#8E8E93' }}>
                    {d.priority.toUpperCase()} priority
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Agent Fleet</h2>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
            {(data?.agents || []).map((agent, i) => (
              <AgentCard key={i} agent={agent} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-4">Morning Briefing</h2>
          <div className="space-y-2">
            {(data?.activityLog || []).slice(0, 5).map((log, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-xl border"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <span className="text-lg flex-shrink-0">📌</span>
                <div>
                  <p className="text-sm text-white">{log.summary}</p>
                  <p className="text-[10px] mt-1" style={{ color: '#8E8E93' }}>
                    {log.agent_name} · {new Date(log.created_at + 'Z').toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
