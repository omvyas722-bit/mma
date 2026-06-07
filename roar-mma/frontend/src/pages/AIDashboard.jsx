import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import ActivityFeed from '../components/AI/ActivityFeed';
import AgentToggle from '../components/AI/AgentToggle';
import { useNotifications } from '../contexts/NotificationContext';

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

const FREE_TIER_LIMITS = {
  OPENROUTER_FREE: { prompt: 1000000, completion: 1000000, total: 2000000, label: 'OpenRouter Free' }
};

function TokenUsageChart({ data, period }) {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-8">No token usage data for this period</p>;

  const maxTokens = Math.max(...data.map(d => d.tokens || 0), 1);
  const maxBarHeight = 120;

  return (
    <div className="relative">
      <div className="flex items-end gap-1 h-[140px] mb-2 overflow-x-auto pb-2">
        {data.map((d, i) => {
          const pct = ((d.tokens || 0) / maxTokens) * maxBarHeight;
          return (
            <div key={d.date || i} className="flex flex-col items-center flex-shrink-0" title={`${d.date}: ${(d.tokens || 0).toLocaleString()} tokens ($${(d.cost || 0).toFixed(4)})`}>
              <div className="w-8 bg-red-500 rounded-t" style={{ height: `${Math.max(pct, 2)}px` }} />
              <span className="text-[9px] text-gray-400 mt-1 whitespace-nowrap">
                {d.date ? d.date.slice(5) : ''}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-6 text-xs text-gray-500">
        <span>Max: {maxTokens.toLocaleString()} tokens</span>
        <span>Total: {data.reduce((s, d) => s + (d.tokens || 0), 0).toLocaleString()} tokens</span>
      </div>
    </div>
  );
}

function HealerProposals() {
  const { success, error: showError } = useNotifications();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['healer-proposals'],
    queryFn: () => api.get('/api/agents/healer/proposals').then(r => r.data?.proposals || []),
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.post(`/api/agents/healer/proposals/${id}/approve`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['healer-proposals'] }); success('Proposal approved'); },
    onError: (err) => showError(err?.response?.data?.error || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => api.post(`/api/agents/healer/proposals/${id}/reject`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['healer-proposals'] }); success('Proposal rejected'); },
    onError: (err) => showError(err?.response?.data?.error || 'Failed to reject'),
  });

  const proposals = data || [];

  if (isLoading) return <div className="h-32 bg-gray-50 rounded animate-pulse" />;

  if (proposals.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No self-improvement proposals yet. HEALER will generate suggestions when it detects recurring failures.</p>;
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => {
        const details = p.details || {};
        return (
          <div key={p.id} className={`border rounded-lg p-4 ${p.status === 'approved' ? 'border-green-200 bg-green-50' : p.status === 'rejected' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {details.message_type || 'Proposal'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    p.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-sm text-gray-800 font-medium">{p.suggestion}</p>
                {details.failure_count && (
                  <p className="text-xs text-gray-500 mt-1">{details.failure_count} failures detected in last 7 days</p>
                )}
                {details.samples && details.samples.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {details.samples.slice(0, 2).map((s, i) => (
                      <p key={i} className="text-xs text-gray-400 bg-gray-50 rounded p-1.5">{s}</p>
                    ))}
                  </div>
                )}
              </div>
              {p.status === 'pending' && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => approveMutation.mutate(p.id)}
                    disabled={approveMutation.isPending}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(p.id)}
                    disabled={rejectMutation.isPending}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AIDashboard() {
  const { error: showError } = useNotifications();
  const [agentFilter, setAgentFilter] = useState('');
  const [tab, setTab] = useState('overview');

  const { data: status, isLoading: statusLoading, isError: statusError, refetch: refetchStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: async () => {
      const response = await api.get('/api/ai/status');
      return response.data;
    },
    refetchInterval: 30000
  });

  const { data: agents, isLoading: agentsLoading, isError: agentsError, refetch: refetchAgents } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const response = await api.get('/api/ai/agents');
      return response.data;
    },
    refetchInterval: 30000
  });

  const { data: history, isLoading: historyLoading, isError: historyError, refetch: refetchHistory } = useQuery({
    queryKey: ['ai-history', agentFilter],
    queryFn: async () => {
      const params = agentFilter ? `?agent=${agentFilter}` : '';
      const response = await api.get(`/api/ai/history${params}`);
      return response.data;
    },
    refetchInterval: 30000
  });

  const { data: tokenData, isLoading: tokenLoading } = useQuery({
    queryKey: ['ai-token-usage'],
    queryFn: () => api.get('/api/agents/token-usage?days=30').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: ['ai-agent-configs'],
    queryFn: () => api.get('/api/agents/config').then(r => r.data?.configs || []),
    refetchInterval: 30000,
  });

  const handleToggle = useCallback(async (agentName) => {
    try {
      await api.post(`/api/ai/agents/${agentName}/toggle`);
    } catch (err) {
      showError(`Failed to toggle ${agentName}`);
    }
  }, [showError]);

  const agentNames = [...new Set((history || []).map(h => h.agent_name))];

  const { data: tokenDailyData, isLoading: tokenDailyLoading } = useQuery({
    queryKey: ['ai-token-daily'],
    queryFn: () => api.get('/api/agents/token-usage?days=30').then(r => r.data?.daily || []),
    refetchInterval: 60000,
  });

  const { data: tokenWeeklyData, isLoading: tokenWeeklyLoading } = useQuery({
    queryKey: ['ai-token-weekly'],
    queryFn: () => api.get('/api/agents/token-usage?days=90').then(r => r.data?.daily || []),
    refetchInterval: 60000,
  });

  const isNearFreeLimit = useMemo(() => {
    if (!tokenData?.total?.total_tokens) return false;
    const limit = FREE_TIER_LIMITS.OPENROUTER_FREE;
    const pct = (tokenData.total.total_tokens / limit.total) * 100;
    return pct > 70;
  }, [tokenData]);

  const [tokenPeriod, setTokenPeriod] = useState('daily');

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'self-improvement', label: 'Self-Improvement' },
    { key: 'token-usage', label: 'Token Usage' },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Dashboard</h1>
            <p className="text-gray-500 mt-1">Monitor AI system status and activity</p>
          </div>
          <Link to="/mission-control" className="text-sm text-red-600 hover:underline">Switch to Mission Control →</Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? 'bg-white text-gray-900 border border-b-0 border-gray-200 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === OVERVIEW TAB === */}
      {tab === 'overview' && (
        <>
          {/* Status Cards */}
          {statusError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8" role="alert">
              <p className="text-red-700 text-sm mb-3">Failed to load AI status</p>
              <button type="button" onClick={refetchStatus} className="text-sm text-red-600 underline hover:no-underline">Retry</button>
            </div>
          ) : (
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
          )}

          {/* Agent Controls */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Agent Controls</h2>
            </div>
            <div className="p-6">
              {agentsError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center" role="alert">
                  <p className="text-red-700 text-sm mb-2">Failed to load agents</p>
                  <button type="button" onClick={refetchAgents} className="text-sm text-red-600 underline hover:no-underline">Retry</button>
                </div>
              ) : agentsLoading ? (
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

          {/* Agent Config */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Agent Configuration</h2>
            </div>
            <div className="p-6">
              {configsLoading ? <div className="h-16 bg-gray-50 rounded animate-pulse" /> : !configs?.length ? <p className="text-sm text-gray-400">No configs</p> : (
                <div className="space-y-3">
                  {configs.map(c => (
                    <AgentConfigRow key={c.id} config={c} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
              <Link to="/approval-queue" className="text-xs text-red-600 hover:underline">Approval Queue →</Link>
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
              {historyError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center" role="alert">
                  <p className="text-red-700 text-sm mb-2">Failed to load activity history</p>
                  <button type="button" onClick={refetchHistory} className="text-sm text-red-600 underline hover:no-underline">Retry</button>
                </div>
              ) : (
                <ActivityFeed
                  activities={history}
                  isLoading={historyLoading}
                  emptyMessage="No AI activity recorded yet"
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* === SELF-IMPROVEMENT TAB === */}
      {tab === 'self-improvement' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">HEALER Self-Improvement Proposals</h2>
          </div>
          <div className="p-6">
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              HEALER monitors agent failure patterns and suggests prompt improvements.
              Approved proposals will be applied on the next agent restart.
            </div>
            <HealerProposals />
          </div>
        </div>
      )}

      {/* === TOKEN USAGE TAB === */}
      {tab === 'token-usage' && (
        <div className="space-y-6">
          {isNearFreeLimit && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
              <span className="text-amber-600 text-lg">⚠</span>
              <div>
                <p className="text-sm font-medium text-amber-800">Approaching OpenRouter Free Tier Limit</p>
                <p className="text-xs text-amber-700">Current usage: {(tokenData?.total?.total_tokens || 0).toLocaleString()} / {FREE_TIER_LIMITS.OPENROUTER_FREE.total.toLocaleString()} tokens ({((tokenData?.total?.total_tokens || 0) / FREE_TIER_LIMITS.OPENROUTER_FREE.total * 100).toFixed(1)}%)</p>
              </div>
            </div>
          )}

          {/* Token Summary */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Token Usage Summary</h2>
            </div>
            <div className="p-6">
              {tokenLoading ? <div className="h-16 bg-gray-50 rounded animate-pulse" /> : !tokenData ? <p className="text-sm text-gray-400">No token data</p> : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div><p className="text-xs text-gray-500">Total Tokens</p><p className="text-lg font-bold text-gray-900">{(tokenData.total?.total_tokens || 0).toLocaleString()}</p></div>
                  <div><p className="text-xs text-gray-500">Prompt</p><p className="text-lg font-bold text-gray-900">{(tokenData.total?.prompt_tokens || 0).toLocaleString()}</p></div>
                  <div><p className="text-xs text-gray-500">Completion</p><p className="text-lg font-bold text-gray-900">{(tokenData.total?.completion_tokens || 0).toLocaleString()}</p></div>
                  <div><p className="text-xs text-gray-500">Cost</p><p className="text-lg font-bold text-gray-900">${(tokenData.total?.cost || 0).toFixed(4)}</p></div>
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Usage Over Time</h2>
              <div className="flex gap-1">
                {[
                  { key: 'daily', label: 'Daily (30d)' },
                  { key: 'weekly', label: 'Weekly (90d)' }
                ].map(p => (
                  <button key={p.key}
                    onClick={() => setTokenPeriod(p.key)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      tokenPeriod === p.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6">
              {tokenDailyLoading || tokenWeeklyLoading ? (
                <div className="h-32 bg-gray-50 rounded animate-pulse" />
              ) : (
                <TokenUsageChart
                  data={tokenPeriod === 'daily' ? tokenDailyData : tokenWeeklyData}
                  period={tokenPeriod}
                />
              )}
            </div>
          </div>

          {/* Per-Agent Breakdown */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Per-Agent Breakdown</h2>
            </div>
            <div className="p-6">
              {tokenData?.byAgent?.length > 0 ? (
                <div className="space-y-3">
                  {tokenData.byAgent.map(a => {
                    const maxTokens = Math.max(...tokenData.byAgent.map(x => x.total_tokens || 0), 1);
                    const pct = ((a.total_tokens || 0) / maxTokens) * 100;
                    return (
                      <div key={a.agent_name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-800 capitalize">{a.agent_name.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-gray-500">{(a.total_tokens || 0).toLocaleString()} tokens · ${(a.cost || 0).toFixed(4)} · {a.calls} calls</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div className="bg-red-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No per-agent data</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentConfigRow({ config }) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ interval_ms: config.interval_ms, model_override: config.model_override || '', token_budget: config.token_budget || 100000 });

  const saveConfig = useMutation({
    mutationFn: () => api.put(`/api/agents/config/${config.agent_name}`, form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-agent-configs'] }); success('Config saved'); setEditing(false); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-900 capitalize">{config.agent_name?.replace(/_/g, ' ')}</span>
        <button onClick={() => setEditing(!editing)} className="text-xs text-red-600 hover:underline">{editing ? 'Cancel' : 'Edit'}</button>
      </div>
      {editing ? (
        <div className="flex flex-wrap gap-2 mt-2">
          <div><label className="text-[10px] text-gray-500 block">Interval (ms)</label><input type="number" value={form.interval_ms} onChange={e => setForm(f => ({ ...f, interval_ms: parseInt(e.target.value) || 60000 }))} className="input text-xs w-24" /></div>
          <div><label className="text-[10px] text-gray-500 block">Model</label><input type="text" value={form.model_override} onChange={e => setForm(f => ({ ...f, model_override: e.target.value }))} className="input text-xs w-32" placeholder="default" /></div>
          <div><label className="text-[10px] text-gray-500 block">Token Budget</label><input type="number" value={form.token_budget} onChange={e => setForm(f => ({ ...f, token_budget: parseInt(e.target.value) || 100000 }))} className="input text-xs w-24" /></div>
          <button onClick={saveConfig.mutate} disabled={saveConfig.isPending} className="self-end bg-red-600 text-white px-3 py-1.5 rounded text-xs hover:bg-red-700 disabled:opacity-40">Save</button>
        </div>
      ) : (
        <div className="flex gap-4 text-xs text-gray-500 mt-1">
          <span>Interval: {(config.interval_ms / 60000).toFixed(0)}m</span>
          <span>Model: {config.model_override || 'default'}</span>
          <span>Budget: {(config.token_budget || 100000).toLocaleString()} tokens</span>
          <span>Used: {config.token_used || 0}</span>
        </div>
      )}
    </div>
  );
}
