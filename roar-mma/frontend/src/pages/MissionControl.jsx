import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

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

function AgentCard({ agent, onToggle, onRunNow, running }) {
  const isRunning = running === agent.agent_name;
  const statusColor = agent.enabled ? 'bg-green-500' : 'bg-gray-400';
  const hasError = agent.lastError;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
            <h3 className="font-semibold text-gray-900 text-sm capitalize truncate">{agent.agent_name.replace(/_/g, ' ')}</h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={agent.enabled} onChange={() => onToggle(agent.agent_name)} />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        {hasError && (
          <p className="text-xs text-red-600 mb-1 truncate" title={agent.lastError}>
            Error: {agent.lastError}
          </p>
        )}
        {agent.lastErrorTime && (
          <p className="text-xs text-gray-400 mb-1">{formatRelativeTime(agent.lastErrorTime)}</p>
        )}
      </div>
      <button type="button"
        onClick={() => onRunNow(agent.agent_name)}
        disabled={isRunning}
        className={`mt-3 w-full py-1.5 text-xs font-medium rounded-lg transition-all ${
          isRunning
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-800 text-white hover:bg-gray-700 active:scale-[0.98]'
        }`}
      >
        {isRunning ? 'Running...' : 'Run Now'}
      </button>
    </div>
  );
}

function ScheduledTasksList() {
  const { success, error: showError } = useNotifications();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['scheduled-tasks'],
    queryFn: async () => { const r = await api.get('/api/agents/scheduled-tasks'); return r.data?.tasks || []; },
    refetchInterval: 15000,
  });

  const deleteTask = useMutation({
    mutationFn: (id) => api.delete('/api/agents/scheduled-tasks/' + id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] }); success('Task deleted'); setConfirmDelete(null); },
    onError: () => showError('Failed to delete task'),
  });

  const toggleTask = useMutation({
    mutationFn: (id) => api.put('/api/agents/scheduled-tasks/' + id + '/toggle'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] }); },
    onError: () => showError('Failed to toggle task'),
  });

  if (isLoading) return <div className="h-16 bg-gray-50 rounded animate-pulse" />;
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-4">No scheduled tasks yet - use the scheduler above to create one.</p>;

  return (
    <div className="space-y-2">
      {data.map(task => (
        <div key={task.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-900 capitalize">{task.agent_name?.replace(/_/g, ' ')}</span>
              <span className="text-xs text-gray-500">{task.frequency}{task.day_of_week !== null ? ' on ' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][task.day_of_week] : ''}{task.day_of_month ? ' day ' + task.day_of_month : ''}{task.time_of_day ? ' at ' + task.time_of_day : ''}{task.interval_hours ? ' every ' + task.interval_hours + 'h' : ''}</span>
            </div>
            <p className="text-sm text-gray-700 truncate mt-0.5">{task.task_description}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={() => toggleTask.mutate(task.id)}
              className={'text-xs px-2 py-1 rounded-full ' + (task.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500')}>
              {task.enabled ? 'On' : 'Off'}
            </button>
            {confirmDelete === task.id ? (
              <div className="flex gap-1">
                <button type="button" onClick={() => deleteTask.mutate(task.id)} className="text-xs text-red-600 hover:underline">Confirm</button>
                <button type="button" onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 hover:underline">No</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(task.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function NlSchedulerForm() {
  const { success, error: showError } = useNotifications();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.post('/api/agents/nl-schedule', { query: query.trim() });
      setResult(res);
      success('Schedule created!');
      setQuery('');
      queryClient.invalidateQueries({ queryKey: ['mission-control-overview'] });
    } catch (err) {
      showError(err?.response?.data?.error || 'Failed to create schedule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "Every Monday at 7am, have ORACLE send me membership count"'
          className="input flex-1 text-sm"
          disabled={submitting}
        />
        <button type="submit"
          disabled={submitting || !query.trim()}
          className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {submitting ? 'Scheduling...' : 'Schedule'}
        </button>
      </form>
      {result && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
          <p className="text-green-800 font-medium">Schedule created!</p>
          <p className="text-green-700 text-xs mt-1">
            Frequency: <span className="font-medium">{result.parsed?.frequency}</span>
            {result.parsed?.day && <> · Day: <span className="font-medium">{result.parsed.day}</span></>}
            {result.parsed?.time && <> · Time: <span className="font-medium">{result.parsed.time}</span></>}
            {result.parsed?.agentName && <> · Agent: <span className="font-medium">{result.parsed.agentName}</span></>}
          </p>
        </div>
      )}
    </div>
  );
}

export default function MissionControl() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotifications();
  const [running, setRunning] = useState(null);
  const [historyAgentFilter, setHistoryAgentFilter] = useState('');

  const { data: overview, isLoading: overviewLoading, isError: overviewError, refetch: refetchOverview } = useQuery({
    queryKey: ['mission-control-overview'],
    queryFn: () => api.get('/api/mission-control/overview'),
    refetchInterval: 30000,
  });

  const { data: history, isLoading: historyLoading, isError: historyError, refetch: refetchHistory } = useQuery({
    queryKey: ['mission-control-history', historyAgentFilter],
    queryFn: async () => {
      const params = historyAgentFilter ? `?agent=${historyAgentFilter}` : '';
      return api.get(`/api/ai/history${params}`);
    },
    refetchInterval: 30000,
  });

  const { data: tokenData, isLoading: tokenLoading } = useQuery({
    queryKey: ['mission-control-token-usage'],
    queryFn: () => api.get('/api/agents/token-usage?days=30'),
    refetchInterval: 60000,
  });

  const daemon = overview?.daemon;
  const agents = overview?.agents || [];
  const circuitBreakers = overview?.circuitBreakers || [];
  const pendingApprovals = overview?.pendingApprovals || 0;
  const stats = overview?.stats || {};
  const historyList = history || [];
  const agentNames = [...new Set(historyList.map(h => h.agent_name))];

  const runAllAgents = async () => {
    setRunning('all');
    try {
      await api.post('/api/agents/run');
      queryClient.invalidateQueries({ queryKey: ['mission-control-overview'] });
      success('All agents triggered');
    } catch (err) {
      showError('Failed to run agents');
    } finally {
      setRunning(null);
    }
  };

  const runAgent = useCallback(async (name) => {
    setRunning(name);
    try {
      await api.post('/api/agents/run', { agent: name });
      queryClient.invalidateQueries({ queryKey: ['mission-control-overview'] });
      success(`${name} agent triggered`);
    } catch (err) {
      showError(`Failed to run ${name}`);
    } finally {
      setRunning(null);
    }
  }, [queryClient, success, showError]);

  const handleToggle = useCallback(async (agentName) => {
    try {
      await api.post(`/api/ai/agents/${agentName}/toggle`);
      queryClient.invalidateQueries({ queryKey: ['mission-control-overview'] });
    } catch (err) {
      showError(`Failed to toggle ${agentName}`);
    }
  }, [queryClient, showError]);

  const resetCircuitBreakers = useMutation({
    mutationFn: () => api.post('/api/mission-control/reset-circuit-breakers'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission-control-overview'] });
      success('Circuit breakers reset');
    },
    onError: () => showError('Failed to reset circuit breakers'),
  });

  const daemonStatusColor = !daemon?.running ? 'bg-red-500' : stats?.actionsToday > 0 ? 'bg-green-500' : 'bg-yellow-500';
  const daemonStatusText = !daemon?.running ? 'Stopped' : stats?.actionsToday > 0 ? 'Running' : 'Idle';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mission Control</h1>
          <p className="text-gray-500 mt-1">Central command for AI agent fleet</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={refetchOverview} className="text-xs text-gray-500 hover:text-gray-700 underline">Refresh</button>
          <Link to="/ai-dashboard" className="text-xs text-red-600 hover:underline">← AI Dashboard</Link>
        </div>
      </div>

      {/* Daemon Status Bar */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${daemonStatusColor}`} />
              <span className="text-sm font-semibold text-gray-900">Daemon {daemonStatusText}</span>
            </div>
            <div className="text-xs text-gray-500">Uptime: <span className="font-medium text-gray-700">{formatUptime(daemon?.uptime)}</span></div>
            <div className="text-xs text-gray-500">Last Tick: <span className="font-medium text-gray-700">{formatRelativeTime(daemon?.lastTick)}</span></div>
            <div className="text-xs text-gray-500">Ticks: <span className="font-medium text-gray-700">{daemon?.ticksExecuted || 0}</span></div>
            <div className="text-xs text-gray-500">Agents: <span className="font-medium text-gray-700">{daemon?.agentsRegistered || 0}</span></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">
              Actions Today: <span className="font-medium text-gray-700">{stats?.actionsToday || 0}</span>
              {' · '}
              Pending Tasks: <span className="font-medium text-gray-700">{stats?.pendingTasks || 0}</span>
            </div>
            <button type="button"
              onClick={runAllAgents}
              disabled={running === 'all'}
              className="px-4 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {running === 'all' ? 'Running...' : 'Run All Agents'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button"
          onClick={resetCircuitBreakers.mutate}
          disabled={circuitBreakers.length === 0 || resetCircuitBreakers.isPending}
          className="px-4 py-2 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {resetCircuitBreakers.isPending ? 'Resetting...' : `Reset Circuit Breakers (${circuitBreakers.length} open)`}
        </button>
        <Link to="/approval-queue" className="px-4 py-2 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-all">
          Approval Queue {pendingApprovals > 0 ? `(${pendingApprovals})` : ''}
        </Link>
        <Link to="/ai-dashboard" className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-all">
          Agent Config
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Agent Fleet Grid */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Agent Fleet ({agents.length})</h2>
          </div>
          <div className="p-4">
            {overviewLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : overviewError ? (
              <div className="text-center py-6">
                <p className="text-sm text-red-600 mb-2">Failed to load agents</p>
                <button type="button" onClick={refetchOverview} className="text-xs text-red-600 underline">Retry</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {agents.map((agent) => (
                  <AgentCard key={agent.agent_name} agent={agent} onToggle={handleToggle} onRunNow={runAgent} running={running} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Circuit Breaker Status */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Circuit Breakers</h2>
            </div>
            <div className="p-4">
              {circuitBreakers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">All circuits closed</p>
              ) : (
                <div className="space-y-2">
                  {circuitBreakers.map((cb) => (
                    <div key={cb.agent} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-red-800 capitalize">{cb.agent.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-red-600">{cb.failures} failures</p>
                      </div>
                      <span className="text-xs text-red-500 font-mono">{(cb.retryInMs / 1000).toFixed(0)}s</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Approval Queue Summary */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Approval Queue</h2>
            </div>
            <div className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{pendingApprovals}</p>
              <p className="text-sm text-gray-500 mb-3">pending approvals</p>
              <Link to="/approval-queue" className="text-sm text-red-600 hover:underline">
                View Queue →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Natural Language Scheduler */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Natural Language Scheduler</h2>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-500 mb-3">Describe a recurring task in plain English. Example: <em>"Every Monday at 7am, have ORACLE send me membership count"</em></p>
          <NlSchedulerForm />
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Existing Scheduled Tasks</h3>
            <ScheduledTasksList />
          </div>
        </div>
      </div>

      {/* Token Usage Panel */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Token Usage (30d)</h2>
        </div>
        <div className="p-5">
          {tokenLoading ? (
            <div className="h-16 bg-gray-50 rounded animate-pulse" />
          ) : !tokenData ? (
            <p className="text-sm text-gray-400 text-center py-4">No token data</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Total Tokens</p>
                  <p className="text-lg font-bold text-gray-900">{(tokenData.total?.total_tokens || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Prompt</p>
                  <p className="text-lg font-bold text-gray-900">{(tokenData.total?.prompt_tokens || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Completion</p>
                  <p className="text-lg font-bold text-gray-900">{(tokenData.total?.completion_tokens || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cost</p>
                  <p className="text-lg font-bold text-gray-900">${(tokenData.total?.cost || 0).toFixed(4)}</p>
                </div>
              </div>
              {tokenData?.byAgent?.length > 0 && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 uppercase">
                      <th className="pb-1 pr-3">Agent</th>
                      <th className="pb-1 pr-3">Calls</th>
                      <th className="pb-1 pr-3">Tokens</th>
                      <th className="pb-1">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tokenData.byAgent.map(a => (
                      <tr key={a.agent_name} className="text-gray-700">
                        <td className="py-1 pr-3 font-medium capitalize">{a.agent_name.replace(/_/g, ' ')}</td>
                        <td className="py-1 pr-3">{a.calls}</td>
                        <td className="py-1 pr-3">{(a.total_tokens || 0).toLocaleString()}</td>
                        <td className="py-1">${(a.cost || 0).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
          <select
            value={historyAgentFilter}
            onChange={(e) => setHistoryAgentFilter(e.target.value)}
            className="input max-w-xs text-sm"
          >
            <option value="">All Agents</option>
            {agentNames.map((name) => (
              <option key={name} value={name}>{name.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="p-5 max-h-[500px] overflow-y-auto">
          {historyError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-700 text-sm mb-2">Failed to load activity</p>
              <button type="button" onClick={refetchHistory} className="text-sm text-red-600 underline">Retry</button>
            </div>
          ) : historyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          ) : historyList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No activity recorded yet</p>
          ) : (
            <div className="space-y-3">
              {historyList.map((log) => (
                <div key={log.id} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    log.status === 'completed' ? 'bg-green-500' : log.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-900 capitalize">{log.agent_name?.replace(/_/g, ' ')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        log.status === 'completed' ? 'bg-green-100 text-green-700' : log.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{log.status}</span>
                      <span className="text-[10px] text-gray-400">{formatLogDate(log.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{log.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
