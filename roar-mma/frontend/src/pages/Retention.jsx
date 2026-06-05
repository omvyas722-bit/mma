import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import { formatCurrency } from '../lib/formatters';

export default function Retention() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [tab, setTab] = useState('requests');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Retention & Win-Back</h1>
      </div>

      <nav className="flex gap-1 border-b border-gray-200 mb-4">
        <button onClick={() => setTab('requests')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'requests' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Cancellation Requests</button>
        <button onClick={() => setTab('winback')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'winback' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Win-Back Campaigns</button>
        <button onClick={() => setTab('analytics')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'analytics' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Analytics</button>
      </nav>

      {tab === 'requests' && <CancellationRequests />}
      {tab === 'winback' && <WinbackCampaigns />}
      {tab === 'analytics' && <RetentionAnalytics />}
    </div>
  );
}

function CancellationRequests() {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [selected, setSelected] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['cancellation-requests'],
    queryFn: async () => { const r = await api.get('/api/retention/cancellation-requests'); return r.data?.requests || []; },
    refetchInterval: 15000,
  });

  const processCancellation = useMutation({
    mutationFn: ({ id, action }) => {
      if (action === 'accept') return api.post(`/api/retention/retention-offers/${id}/accept`);
      if (action === 'reject') return api.post(`/api/retention/retention-offers/${id}/reject`);
      return api.post(`/api/retention/cancellation-requests/${id}/process`);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cancellation-requests'] }); setSelected(null); success('Processed'); },
    onError: () => error('Failed to process'),
  });

  if (isLoading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>;

  if (requests.length === 0) return <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No pending cancellation requests</p></div>;

  return (
    <div className="space-y-3">
      {requests.map(req => (
        <div key={req.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-400">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900">{req.member_name || `Member #${req.member_id}`}</p>
              <p className="text-xs text-gray-500">{req.reason || 'No reason given'}</p>
              {req.requested_at && <p className="text-xs text-gray-400 mt-1">Requested: {new Date(req.requested_at).toLocaleDateString()}</p>}
            </div>
            <button onClick={() => setSelected(selected === req.id ? null : req.id)} className="text-xs text-blue-600 hover:underline">{selected === req.id ? 'Close' : 'Review'}</button>
          </div>
          {selected === req.id && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
              {req.offers?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700">Retention Offers</p>
                  {req.offers.map(offer => (
                    <div key={offer.id} className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                      <div><p className="text-sm font-medium text-green-800">{offer.type}: {offer.description || offer.discount_pct ? `${offer.discount_pct}% off` : ''}</p></div>
                      <div className="flex gap-2">
                        <button onClick={() => processCancellation.mutate({ id: offer.id, action: 'accept' })} className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Accept</button>
                        <button onClick={() => processCancellation.mutate({ id: offer.id, action: 'reject' })} className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => processCancellation.mutate({ id: req.id, action: 'process' })} className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded hover:bg-gray-700">Process Cancellation</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function WinbackCampaigns() {
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['winback-campaigns'],
    queryFn: async () => { const r = await api.get('/api/retention/winback-campaigns'); return r.data?.campaigns || []; },
    retry: 2,
  });

  if (isLoading) return <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>;

  if (campaigns.length === 0) return <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No active win-back campaigns</p></div>;

  return (
    <div className="space-y-3">
      {campaigns.map(c => (
        <div key={c.id} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-500">{c.description || ''}</p>
              <p className="text-xs text-gray-400 mt-1">Target: {c.target_segment || 'All'} · {c.recipient_count || 0} recipients</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.status || 'draft'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RetentionAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['retention-analytics'],
    queryFn: async () => { const r = await api.get('/api/retention/analytics'); return r.data; },
    retry: 2,
  });

  if (isLoading) return <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>;
  if (!analytics) return <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No analytics data yet</p></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Retention Rate" value={analytics.retention_rate != null ? `${analytics.retention_rate}%` : '—'} />
        <MetricCard label="Saved This Month" value={analytics.saved_this_month ?? '—'} />
        <MetricCard label="Churn Rate" value={analytics.churn_rate != null ? `${analytics.churn_rate}%` : '—'} color="red" />
        <MetricCard label="Win-Back Success" value={analytics.winback_rate != null ? `${analytics.winback_rate}%` : '—'} color="green" />
      </div>
      {analytics.cancellation_reasons?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Cancellation Reasons</h3>
          <div className="space-y-2">
            {analytics.cancellation_reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-40 truncate">{r.reason || 'Unknown'}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-red-400 h-2 rounded-full" style={{ width: `${r.percentage || 0}%` }}></div>
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">{label}</p><p className={`text-xl font-bold ${color === 'red' ? 'text-red-600' : color === 'green' ? 'text-green-600' : 'text-blue-600'}`}>{value}</p></div>;
}
