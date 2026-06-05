import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import { formatCurrency } from '../lib/formatters';

export default function Subscriptions() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [showCreate, setShowCreate] = useState(false);

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => { const r = await api.get('/api/transactions/subscriptions'); return r.data?.subscriptions || []; },
    retry: 2,
    staleTime: 10000,
  });

  const { data: mrrData } = useQuery({
    queryKey: ['mrr-history'],
    queryFn: async () => { const r = await api.get('/api/transactions/mrr-history'); return r.data; },
    retry: 1,
  });

  const activeSubs = subs.filter(s => s.status === 'active');
  const totalMRR = activeSubs.reduce((s, sub) => s + parseFloat(sub.amount || 0), 0);
  const atRisk = activeSubs.filter(s => s.last_payment_status === 'failed').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">+ Create Subscription</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Active Subs</p><p className="text-xl font-bold text-blue-600">{activeSubs.length}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Monthly Revenue</p><p className="text-xl font-bold text-green-600">{formatCurrency(totalMRR)}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">At Risk</p><p className="text-xl font-bold text-red-600">{atRisk}</p></div>
        <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Avg per Sub</p><p className="text-xl font-bold text-purple-600">{activeSubs.length > 0 ? formatCurrency(totalMRR / activeSubs.length) : '—'}</p></div>
      </div>

      {mrrData?.history?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">MRR History</h3>
          <div className="flex items-end gap-2 h-24">
            {mrrData.history.slice(-12).map((h, i) => {
              const max = Math.max(...mrrData.history.slice(-12).map(x => x.mrr));
              const height = max > 0 ? (h.mrr / max) * 100 : 0;
              return <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }} title={`${h.month}: ${formatCurrency(h.mrr)}`}></div>
                <span className="text-[10px] text-gray-400">{h.month?.slice(5, 7) || ''}</span>
              </div>;
            })}
          </div>
        </div>
      )}

      {showCreate && <CreateSubscriptionForm onClose={() => setShowCreate(false)} />}

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-4 space-y-3 animate-pulse">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded"></div>)}</div>
      ) : subs.length === 0 ? (
        <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No subscriptions yet</p></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3">Member</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 hidden sm:table-cell">Next Billing</th><th className="px-4 py-3 hidden sm:table-cell">Last Payment</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200">
              {subs.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{sub.member_name || `Member #${sub.member_id}`}</td>
                  <td className="px-4 py-3">{formatCurrency(sub.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{sub.next_billing_date || '—'}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {sub.last_payment_date ? (
                      <span className={sub.last_payment_status === 'failed' ? 'text-red-600' : 'text-gray-600'}>{sub.last_payment_date} {sub.last_payment_status === 'failed' && '⚠'}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const m = { active: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700', cancelled: 'bg-gray-100 text-gray-600', expired: 'bg-red-100 text-red-700' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function CreateSubscriptionForm({ onClose }) {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [amount, setAmount] = useState('');
  const [interval_, setInterval_] = useState('monthly');
  const [description, setDescription] = useState('');

  const searchMembers = async (q) => {
    if (q.length < 2) { setMemberResults([]); return; }
    try { const r = await api.get(`/api/members?query=${q}&limit=10`); setMemberResults(r.data.members || []); } catch { setMemberResults([]); }
  };

  const create = useMutation({
    mutationFn: () => api.post('/api/transactions/subscriptions', {
      member_id: selectedMember.id, amount: parseFloat(amount), interval: interval_, description,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); success('Subscription created'); onClose(); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="text-lg font-semibold mb-4">Create Subscription</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Member</label>
            {selectedMember ? (
              <div className="flex items-center justify-between bg-blue-50 p-2 rounded"><span className="text-sm font-medium">{selectedMember.first_name} {selectedMember.last_name}</span><button onClick={() => setSelectedMember(null)} className="text-xs text-red-600">Change</button></div>
            ) : (
              <><input type="text" placeholder="Search..." value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); searchMembers(e.target.value); }} className="input text-sm w-full" />
              {memberResults.length > 0 && <div className="border rounded mt-1 max-h-40 overflow-y-auto">{memberResults.map(m => <div key={m.id} onClick={() => { setSelectedMember(m); setMemberSearch(''); setMemberResults([]); }} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer">{m.first_name} {m.last_name}</div>)}</div>}</>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Amount ($)</label><input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="input text-sm w-full" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Interval</label><select value={interval_} onChange={e => setInterval_(e.target.value)} className="input text-sm w-full"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Description</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} className="input text-sm w-full" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-outline text-sm">Cancel</button>
          <button onClick={create.mutate} disabled={!selectedMember || !amount || create.isPending} className="btn-primary text-sm">{create.isPending ? 'Creating...' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}
