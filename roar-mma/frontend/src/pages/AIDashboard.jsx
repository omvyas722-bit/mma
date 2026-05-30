import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ActivityFeed from '../components/AI/ActivityFeed';
import AgentToggle from '../components/AI/AgentToggle';

function StatusCard({ title, value, status }) {
  const isGood = status === 'good' || status === true;
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <div className="flex items-center gap-2">
        {status !== undefined && (
          <span className={`w-2.5 h-2.5 rounded-full ${isGood ? 'bg-green-500' : 'bg-red-500'}`}></span>
        )}
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function formatUptime(seconds) {
  if (!seconds || seconds < 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function AIDashboard() {
  const [agentFilter, setAgentFilter] = useState('');

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['ai-status'],
    queryFn: async () => {
      const response = await api.get('/api/ai/status');
      return response.data;
    },
    refetchInterval: 30000
  });

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const response = await api.get('/api/ai/agents');
      return response.data;
    },
    refetchInterval: 30000
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['ai-history', agentFilter],
    queryFn: async () => {
      const params = agentFilter ? `?agent=${agentFilter}` : '';
      const response = await api.get(`/api/ai/history${params}`);
      return response.data;
    },
    refetchInterval: 30000
  });

  const handleToggle = useCallback(async (agentName, enabled) => {
    try {
      await api.post(`/api/ai/agents/${agentName}/toggle`);
    } catch (err) {
      console.error('Failed to toggle agent:', err);
    }
  }, []);

  const agentNames = [...new Set((history || []).map(h => h.agent_name))];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Dashboard</h1>
        <p className="text-gray-500 mt-1">Monitor AI system status and activity</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatusCard
          title="AI Status"
          value={statusLoading ? '...' : status?.running ? 'Running' : 'Stopped'}
          status={status?.running}
        />
        <StatusCard
          title="Uptime"
          value={formatUptime(status?.uptime)}
        />
        <StatusCard
          title="Last Tick"
          value={formatRelativeTime(status?.lastTick)}
        />
        <StatusCard
          title="Actions Today"
          value={status?.actionsToday ?? 0}
        />
        <StatusCard
          title="Daily API Calls"
          value={`${status?.dailyApiCalls ?? 0}/${status?.dailyApiLimit ?? 50}`}
          status={(status?.dailyApiCalls ?? 0) < (status?.dailyApiLimit ?? 50)}
        />
      </div>

      {/* Agent Controls */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Agent Controls</h2>
        </div>
        <div className="p-6">
          {agentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {(agents || []).map((agent) => (
                <AgentToggle
                  key={agent.agent_name}
                  agentName={agent.agent_name}
                  enabled={agent.enabled}
                  description={agent.description}
                  onChange={handleToggle}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="input max-w-xs text-sm"
          >
            <option value="">All Agents</option>
            {agentNames.map((name) => (
              <option key={name} value={name}>{name.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="p-6">
          <ActivityFeed
            activities={history}
            isLoading={historyLoading}
            emptyMessage="No AI activity recorded yet"
          />
        </div>
      </div>
    </div>
  );
}
