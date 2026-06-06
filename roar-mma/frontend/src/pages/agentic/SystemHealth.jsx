import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

function IntegrationCard({ integration }) {
  const isHealthy = integration.status === 'healthy';
  return (
    <div
      className="p-4 rounded-xl border transition-all"
      style={{ background: 'rgba(255,255,255,0.04)', borderColor: isHealthy ? 'rgba(52,199,89,0.2)' : 'rgba(255,59,48,0.2)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-white">{integration.name}</h3>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: isHealthy ? '#34C759' : '#FF3B30' }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: '#8E8E93' }}>{isHealthy ? 'Operational' : 'Degraded'}</span>
        <span className="text-[10px]" style={{ color: '#8E8E93' }}>{integration.uptime}% uptime</span>
      </div>
    </div>
  );
}

export default function SystemHealth() {
  const { data, isLoading } = useQuery({
    queryKey: ['agentic-system'],
    queryFn: () => api.get('/api/agentic/system').then(r => r.data),
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
              <span className="text-2xl">⚙️</span>
              <h1 className="text-2xl font-bold text-white">System Health Monitor</h1>
            </div>
            <p className="text-sm" style={{ color: '#8E8E93' }}>Dev Agent · GPT-5</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs" style={{ color: '#8E8E93' }}>API Response</p>
              <p className="text-sm font-bold text-white">{data?.apiStatus?.responseTime ?? '—'}ms</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: '#8E8E93' }}>Uptime</p>
              <p className="text-sm font-bold text-white">{data?.apiStatus?.uptime ?? '—'}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: '#8E8E93' }}>Errors (24h)</p>
              <p className="text-sm font-bold" style={{ color: (data?.errors24h ?? 0) > 0 ? '#FF3B30' : '#34C759' }}>{data?.errors24h ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full" style={{ background: data?.agentStatus?.status === 'idle' ? '#8E8E93' : '#34C759' }} />
          <span className="text-xs" style={{ color: '#8E8E93' }}>
            {data?.agentStatus?.status === 'idle' ? 'Idle — all systems nominal' : 'Active'} · Last check: {data?.agentStatus?.lastRunTime ? new Date(data.agentStatus.lastRunTime + 'Z').toLocaleTimeString() : '—'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {(data?.integrations || []).map((int, i) => (
            <IntegrationCard key={i} integration={int} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Recent Builds</h2>
            <div className="space-y-2">
              {(data?.recentBuilds || []).map(build => (
                <div
                  key={build.id}
                  className="p-3 rounded-xl border flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{build.description}</p>
                    <p className="text-[10px] mt-1" style={{ color: '#8E8E93' }}>
                      {new Date(build.timestamp + 'Z').toLocaleString()}
                    </p>
                  </div>
                  <span className="w-2 h-2 rounded-full flex-shrink-0 ml-2" style={{ background: build.status === 'success' ? '#34C759' : '#FF3B30' }} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-4">Active Scripts</h2>
            <div className="space-y-2">
              {(data?.activeScripts || []).map((script, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-mono truncate">{script.name}</p>
                    <p className="text-[10px] mt-1" style={{ color: '#8E8E93' }}>
                      {script.lastRun ? new Date(script.lastRun + 'Z').toLocaleTimeString() : '—'}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                    style={{
                      background: script.status === 'running' ? '#34C75920' : 'rgba(255,255,255,0.06)',
                      color: script.status === 'running' ? '#34C759' : '#8E8E93',
                    }}
                  >
                    {script.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
