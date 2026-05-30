import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const AGENT_LABELS = {
  sales_team: { name: 'Sales & Marketing', icon: '🎯', color: 'bg-blue-500', desc: 'Manages leads, drafts personalized outreach, moves leads through pipeline' },
  member_success_team: { name: 'Member Success', icon: '❤️', color: 'bg-green-500', desc: 'Monitors retention, engagement, attendance, risk detection & celebration' },
  operations_team: { name: 'Operations', icon: '⚙️', color: 'bg-purple-500', desc: 'Optimizes class schedules, inventory, staff allocation, facility usage' },
  finance_team: { name: 'Finance & Billing', icon: '💰', color: 'bg-yellow-500', desc: 'Tracks revenue, flags billing issues, analyzes margins & commissions' },
};

function AgentCard({ name, info, stats, onRun, running }) {
  const isRunning = running === name;
  const agentStats = stats?.agents?.find(a => a.name === name);
  const logs = agentStats?.recentActions || [];

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
      <div className={`${info.color} px-5 py-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{info.icon}</span>
            <div>
              <h3 className="font-bold text-lg">{info.name}</h3>
              <p className="text-sm opacity-80">{info.desc}</p>
            </div>
          </div>
          <span className={`w-3 h-3 rounded-full ${agentStats?.enabled ? 'bg-green-300' : 'bg-red-300'}`}></span>
        </div>
      </div>

      <div className="p-5">
        {logs.length > 0 ? (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Activity</p>
            {logs.map((log, i) => (
              <div key={log.id || i} className="text-sm bg-gray-50 rounded-lg p-3 border-l-4 border-gray-300">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-gray-800">{log.summary?.substring(0, 100)}{log.summary?.length > 100 ? '...' : ''}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${log.status === 'completed' ? 'bg-green-100 text-green-700' : log.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{log.status}</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">{formatLogDate(log.created_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-4 italic">No activity yet. Run the agent to see actions.</p>
        )}

        <button
          onClick={() => onRun(name)}
          disabled={isRunning}
          className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
            isRunning
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]'
          }`}
        >
          {isRunning ? 'Running...' : `Run ${info.name} Agent`}
        </button>
      </div>
    </div>
  );
}

function ActionLog({ log }) {
  const details = log.details;
  const hasDetails = details && typeof details === 'object';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              AGENT_LABELS[log.agent_name]
                ? 'bg-' + AGENT_LABELS[log.agent_name].color.replace('bg-', '').replace('-500', '-100') + ' text-' + AGENT_LABELS[log.agent_name].color.replace('bg-', '').replace('-500', '-700')
                : 'bg-gray-100 text-gray-700'
            }`}>
              {AGENT_LABELS[log.agent_name]?.name || log.agent_name}
            </span>
            <span className="text-xs text-gray-400">{formatLogDate(log.created_at)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              log.status === 'completed' ? 'bg-green-100 text-green-700' :
              log.status === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>{log.status}</span>
          </div>
          <p className="text-sm text-gray-800 mt-1.5">{log.summary}</p>
          {hasDetails && details.actions_taken && details.actions_taken.length > 0 && (
            <div className="mt-2 space-y-1">
              {details.actions_taken.slice(0, 5).map((action, i) => (
                <div key={action.action + i} className="text-xs bg-gray-50 rounded px-2 py-1.5 text-gray-600 font-mono">
                  <span className="font-medium text-gray-800">{action.action}</span>
                  {action.status === 'ok' ? ' ✅' : action.error ? ` ❌ ${action.error}` : ''}
                </div>
              ))}
            </div>
          )}
          {hasDetails && details.actions_decided > 0 && (
            <p className="text-xs text-gray-400 mt-1">{details.actions_decided} actions decided, {details.actions_taken?.length || 0} executed</p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatLogDate(dateStr) {
  if (!dateStr) return '';
  try {
    const normalized = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString();
  } catch {
    return '';
  }
}

export default function AgentTracking() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(null);
  const [logFilter, setLogFilter] = useState('all');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['agent-stats'],
    queryFn: async () => {
      const res = await api.get('/api/agents/stats');
      return res.data;
    },
    refetchInterval: 15000
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['agent-logs', logFilter],
    queryFn: async () => {
      const params = logFilter !== 'all' ? `?agent=${logFilter}` : '';
      const res = await api.get(`/api/agents/logs${params}`);
      return res.data;
    },
    refetchInterval: 10000
  });

  const runAll = async () => {
    setRunning('all');
    try {
      await api.post('/api/agents/run');
      queryClient.invalidateQueries({ queryKey: ['agent-stats'] });
      queryClient.invalidateQueries({ queryKey: ['agent-logs'] });
    } catch (err) {
      console.error('Error running agents:', err);
    } finally {
      setRunning(null);
    }
  };

  const runAgent = useCallback(async (name) => {
    setRunning(name);
    try {
      await api.post('/api/agents/run', { agent: name });
      queryClient.invalidateQueries({ queryKey: ['agent-stats'] });
      queryClient.invalidateQueries({ queryKey: ['agent-logs'] });
    } catch (err) {
      console.error('Error running agent:', err);
    } finally {
      setRunning(null);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Employee Dashboard</h1>
          <p className="text-gray-500 mt-1">Autonomous AI agents managing ROAR MMA departments in real-time</p>
        </div>
        <div className="flex items-center gap-4">
          {stats && (
            <div className="text-right">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{stats.actionsToday}</span> actions today
                {' · '}
                <span className="font-semibold text-gray-800">{stats.totalActions}</span> total
              </p>
              <p className="text-xs text-gray-400">{stats.pendingTasks} pending tasks in queue</p>
            </div>
          )}
          <button
            onClick={runAll}
            disabled={running === 'all'}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {running === 'all' ? 'Running All Agents...' : '⚡ Run All Agents'}
          </button>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {Object.entries(AGENT_LABELS).map(([name, info]) => (
          <AgentCard key={name} name={name} info={info} stats={stats} onRun={runAgent} running={running} />
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Activity Timeline</h2>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All Agents' },
              ...Object.entries(AGENT_LABELS).map(([k, v]) => ({ value: k, label: v.icon + ' ' + v.name }))
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setLogFilter(opt.value)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  logFilter === opt.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6 space-y-3 max-h-[600px] overflow-y-auto">
          {logsLoading ? (
            <p className="text-gray-400 text-center py-8">Loading activity...</p>
          ) : !logsData?.logs?.length ? (
            <p className="text-gray-400 text-center py-8">No activity yet. Click "Run All Agents" to see autonomous actions.</p>
          ) : (
            logsData.logs.map((log) => <ActionLog key={log.id} log={log} />)
          )}
        </div>
      </div>
    </div>
  );
}
