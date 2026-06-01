import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import { format } from 'date-fns';

const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };

export default function ApprovalQueue() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [expanded, setExpanded] = useState(null);
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  const { data, isLoading } = useQuery({
    queryKey: ['approval-queue', statusFilter],
    queryFn: () => api.get(`/api/approval-queue?status=${statusFilter}`).then(r => r.data?.queue || []),
    refetchInterval: 15000,
  });

  const approve = useMutation({
    mutationFn: (id) => api.post(`/api/approval-queue/${id}/approve`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['approval-queue'] }); success('Approved'); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

  const reject = useMutation({
    mutationFn: (id) => api.post(`/api/approval-queue/${id}/reject`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['approval-queue'] }); success('Rejected'); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Approval Queue</h1>
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected', ''].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${statusFilter === s ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >{s || 'All'}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />)}</div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-16 text-gray-400">{statusFilter === 'pending' ? 'No pending approvals. All AI actions have been reviewed.' : 'No items found.'}</div>
      ) : (
        <div className="space-y-2">
          {data.map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 flex items-start justify-between cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>{item.status}</span>
                    <span className="text-xs font-medium text-gray-700">{item.agent_name}</span>
                    <span className="text-xs text-gray-400">{item.action_type?.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-sm text-gray-900 truncate">{item.reason || JSON.stringify(JSON.parse(item.payload || '{}')).substring(0, 120)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{format(new Date(item.created_at), 'MMM d, HH:mm')}</p>
                </div>
                {item.status === 'pending' && (
                  <div className="flex gap-1 ml-3 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => approve.mutate(item.id)} disabled={approve.isPending} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40">✓ Approve</button>
                    <button onClick={() => reject.mutate(item.id)} disabled={reject.isPending} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40">✕ Reject</button>
                  </div>
                )}
                {item.status !== 'pending' && (
                  <span className="text-xs text-gray-400 ml-3 shrink-0">{item.status === 'approved' ? '✓' : '✕'} by {item.reviewed_by || 'system'}</span>
                )}
              </div>
              {expanded === item.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto font-mono whitespace-pre-wrap">{JSON.stringify({ ...item, payload: JSON.parse(item.payload || '{}') }, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
