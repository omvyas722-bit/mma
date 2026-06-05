import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

export default function PhoneSystem() {
  const [tab, setTab] = useState('calls');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Phone System</h1>
      </div>

      <nav className="flex gap-1 border-b border-gray-200 mb-4">
        <button onClick={() => setTab('calls')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'calls' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Recent Calls</button>
        <button onClick={() => setTab('voicemails')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'voicemails' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Voicemails</button>
        <button onClick={() => setTab('analytics')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'analytics' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Analytics</button>
        <button onClick={() => setTab('settings')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'settings' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>AI Settings</button>
      </nav>

      {tab === 'calls' && <RecentCalls />}
      {tab === 'voicemails' && <Voicemails />}
      {tab === 'analytics' && <PhoneAnalytics />}
      {tab === 'settings' && <PhoneSettings />}
    </div>
  );
}

function RecentCalls() {
  const { data: calls = [], isLoading } = useQuery({
    queryKey: ['phone-calls'],
    queryFn: async () => { const r = await api.get('/api/phone/calls'); return r.data?.calls || []; },
    refetchInterval: 15000,
  });

  const { data: pendingFollowups = [] } = useQuery({
    queryKey: ['phone-followups'],
    queryFn: async () => { const r = await api.get('/api/phone/calls/followup/pending'); return r.data?.calls || []; },
    refetchInterval: 15000,
  });

  if (pendingFollowups.length > 0) {
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
      <p className="text-sm font-medium text-orange-700">{pendingFollowups.length} calls need follow-up</p>
    </div>;
  }

  if (isLoading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>;

  if (calls.length === 0) return <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No calls yet</p></div>;

  return (
    <div className="space-y-2">
      {calls.map(call => (
        <div key={call.id} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900">{call.caller_name || call.from_number || 'Unknown caller'}</p>
              <p className="text-xs text-gray-500">{call.from_number} {call.to_number && `→ ${call.to_number}`}</p>
              <p className="text-xs text-gray-400">{call.duration ? `${call.duration}s` : ''} · {call.call_time ? new Date(call.call_time).toLocaleString() : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${call.status === 'completed' ? 'bg-green-100 text-green-700' : call.status === 'missed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{call.status || 'completed'}</span>
              {call.needs_followup && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Follow-up</span>}
            </div>
          </div>
          {call.transcript && (
            <details className="mt-2">
              <summary className="text-xs text-blue-600 cursor-pointer hover:underline">View transcript</summary>
              <p className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap">{call.transcript}</p>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function Voicemails() {
  const queryClient = useQueryClient();
  const { success } = useNotifications();

  const { data: voicemails = [], isLoading } = useQuery({
    queryKey: ['phone-voicemails'],
    queryFn: async () => { const r = await api.get('/api/phone/voicemails/new'); return r.data?.voicemails || []; },
    refetchInterval: 15000,
  });

  const markHeard = useMutation({
    mutationFn: (id) => api.post(`/api/phone/voicemails/${id}/listened`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['phone-voicemails'] }); success('Marked as heard'); },
  });

  if (isLoading) return <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>;

  if (voicemails.length === 0) return <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No new voicemails</p></div>;

  return (
    <div className="space-y-2">
      {voicemails.map(v => (
        <div key={v.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-400">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900">{v.from_number || 'Unknown'}</p>
              <p className="text-xs text-gray-500">{v.duration ? `${v.duration}s` : ''} · {v.received_at ? new Date(v.received_at).toLocaleString() : ''}</p>
              {v.transcript && <p className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded">{v.transcript}</p>}
            </div>
            {!v.listened && <button onClick={() => markHeard.mutate(v.id)} className="text-xs text-gray-500 hover:underline">Mark heard</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhoneAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['phone-analytics'],
    queryFn: async () => { const r = await api.get('/api/phone/analytics'); return r.data; },
    retry: 2,
  });

  if (isLoading) return <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>;
  if (!analytics) return <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No analytics data yet</p></div>;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Total Calls</p><p className="text-xl font-bold text-blue-600">{analytics.total_calls || 0}</p></div>
      <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Answered by AI</p><p className="text-xl font-bold text-green-600">{analytics.answered || 0}</p></div>
      <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Missed</p><p className="text-xl font-bold text-red-600">{analytics.missed || 0}</p></div>
      <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Avg Duration</p><p className="text-xl font-bold text-purple-600">{analytics.avg_duration ? `${analytics.avg_duration}s` : '—'}</p></div>
    </div>
  );
}

function PhoneSettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['phone-settings'],
    queryFn: async () => { const r = await api.get('/api/phone/settings'); return r.data?.settings || {}; },
  });

  if (isLoading) return <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">AI Phone Receptionist Settings</h3>
      {settings && Object.entries(settings).length > 0 ? (
        <div className="space-y-3">
          {Object.entries(settings).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-sm text-gray-500 font-mono">{String(val)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Configure your AI phone receptionist settings in the backend.</p>
      )}
    </div>
  );
}
