import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { formatDate, formatCurrency } from '../lib/formatters';
import { useNotifications } from '../contexts/NotificationContext';

const LIMIT = 50;

export default function Billing() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearchQuery(search); setOffset(0); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const resetFilters = useCallback(() => { setSearch(''); setSearchQuery(''); setStatusFilter(''); setTypeFilter(''); setOffset(0); }, []);

  const { data: txData, isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions', { status: statusFilter, type: typeFilter, query: searchQuery, offset }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (searchQuery) params.append('query', searchQuery);
      params.append('limit', String(LIMIT));
      params.append('offset', String(offset));
      const r = await api.get(`/api/transactions?${params}`);
      return r.data;
    },
    retry: 2,
    staleTime: 10000,
    placeholderData: (prev) => prev,
  });

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['transaction-stats'],
    queryFn: async () => { const r = await api.get('/api/transactions/stats'); return r.data; },
    retry: 1,
    staleTime: 30000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
  }, [queryClient]);

  const refundTx = useMutation({
    mutationFn: (id) => api.post(`/api/transactions/${id}/refund`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transactions'] }); queryClient.invalidateQueries({ queryKey: ['transaction-stats'] }); success('Transaction refunded'); },
    onError: () => error('Failed to refund transaction'),
  });

  const emailBill = useMutation({
    mutationFn: (tx) => api.post('/api/messaging/send', { to: tx.member_email, subject: `Your ROAR MMA Receipt`, body: `Hi ${tx.member_name},\n\nYour ${tx.type} payment of ${formatCurrency(tx.amount)} has been processed.\n\nThank you for choosing ROAR MMA!` }),
    onSuccess: () => success('Bill emailed'),
    onError: () => error('Failed to email bill'),
  });

  const transactions = txData?.transactions || [];
  const total = txData?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const renderPageButtons = () => {
    const start = Math.max(0, Math.min(currentPage - 3, totalPages - 5));
    return Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
      const page = start + i + 1;
      if (page > totalPages) return null;
      return (
        <button key={page} type="button" onClick={() => setOffset((page - 1) * LIMIT)}
          className={`px-3 py-1 text-sm border rounded ${page === currentPage ? 'bg-red-600 text-white border-red-600' : 'hover:bg-gray-100'}`}
          aria-label={`Page ${page}`} aria-current={page === currentPage ? 'page' : undefined}>{page}</button>
      );
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => exportCSV(transactions)} disabled={transactions.length === 0} className="btn-outline text-sm">Export CSV</button>
          <button type="button" onClick={() => setShowRecordModal(true)} className="btn-primary text-sm">+ Record Payment</button>
        </div>
      </div>

      {showRecordModal && <ProcessPaymentModal onClose={() => setShowRecordModal(false)} />}

      {/* Stats */}
      {!statsError && stats && !statsLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="MRR" value={stats.mrr != null ? formatCurrency(stats.mrr) : '—'} color="purple" />
          <StatCard label="Today" value={stats.today != null ? formatCurrency(stats.today) : '—'} color="green" />
          <StatCard label="Failed This Month" value={stats.failed_this_month ? `${stats.failed_this_month.count || 0} ($${(stats.failed_this_month.total || 0).toFixed(2)})` : '—'} color="red" />
          <StatCard label="This Month" value={stats.this_month != null ? formatCurrency(stats.this_month) : '—'} color="blue" />
        </div>
      )}

      {/* Revenue Forecast */}
      {!statsError && stats && !statsLoading && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Revenue Forecast</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Confirmed MRR</span><span>{formatCurrency(stats.mrr || 0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, ((stats.mrr || 0) - (stats.failed_this_month?.total || 0)) / (stats.mrr || 1) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>At Risk</span><span>{formatCurrency(stats.failed_this_month?.total || 0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-red-400 h-2.5 rounded-full" style={{ width: `${Math.min(100, (stats.failed_this_month?.total || 0) / (stats.mrr || 1) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue by type */}
      {stats?.by_type?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {stats.by_type.map(item => (
              <div key={item.type} className="text-center p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500 capitalize">{item.type.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold text-gray-900">${(item.total || 0).toFixed(0)}</p>
                <p className="text-[10px] text-gray-400">{item.count} tx</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input type="text" placeholder="Search member, amount..." value={search} onChange={(e) => setSearch(e.target.value)} className="input text-sm" aria-label="Search transactions" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} className="input text-sm" aria-label="Filter by status">
            <option value="">All Statuses</option>
            <option value="completed">Succeeded</option><option value="failed">Failed</option><option value="pending">Pending</option><option value="refunded">Refunded</option>
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }} className="input text-sm" aria-label="Filter by type">
            <option value="">All Types</option>
            <option value="membership">Membership</option><option value="hold_fee">Hold Fee</option><option value="pt_pack">PT Pack</option><option value="product">Product</option><option value="other">Other</option>
          </select>
          <button onClick={() => exportCSV(transactions)} disabled={transactions.length === 0} className="btn-outline text-sm">Export CSV</button>
        </div>
      </div>

      {/* Error state */}
      {isError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
          <p className="text-red-700 text-sm mb-3">Failed to load transactions</p>
          <button onClick={refetch} className="text-sm text-red-600 underline hover:no-underline">Try again</button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3 animate-pulse" aria-label="Loading">
              {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded"></div>)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-2">No transactions found</p>
              {(searchQuery || statusFilter || typeFilter) && (
                <button onClick={resetFilters} className="text-sm text-red-600 hover:underline">Clear filters</button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200" role="table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Method</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(tx.created_at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{tx.member_name}</span>
                          {tx.member_email && <span className="text-xs text-gray-500 block hidden lg:block">{tx.member_email}</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><TypeBadge type={tx.type} /></td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(tx.amount)}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={tx.status} /></td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize hidden md:table-cell">{tx.payment_method || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {tx.status === 'failed' && (
                            <span className="text-xs text-gray-400">Retry</span>
                          )}
                          {tx.status === 'completed' && (
                            <>
                              <button onClick={() => { if (window.confirm('Refund this transaction?')) refundTx.mutate(tx.id); }}
                                className="text-xs text-orange-600 hover:underline mr-2">Refund</button>
                              {tx.member_email && (
                                <button onClick={() => emailBill.mutate(tx)} disabled={emailBill.isPending}
                                  className="text-xs text-blue-600 hover:underline">Email Bill</button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="bg-gray-50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t">
                <span className="text-sm text-gray-700">{offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
                <div className="flex gap-1">
                  <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))} className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-100" aria-label="Previous page">Prev</button>
                  {renderPageButtons()}
                  <button disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)} className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-100" aria-label="Next page">Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = { blue: 'text-blue-600', green: 'text-green-600', purple: 'text-purple-600', red: 'text-red-600' };
  return <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">{label}</p><p className={`text-xl font-bold ${colors[color] || 'text-gray-900'}`}>{value}</p></div>;
}

function StatusBadge({ status }) {
  const m = { completed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700', pending: 'bg-yellow-100 text-yellow-700', refunded: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${m[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function TypeBadge({ type }) {
  const colors = { membership: 'bg-blue-100 text-blue-700', hold_fee: 'bg-yellow-100 text-yellow-700', pt_pack: 'bg-green-100 text-green-700', product: 'bg-purple-100 text-purple-700', other: 'bg-gray-100 text-gray-600' };
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[type] || 'bg-gray-100 text-gray-600'}`}>{type?.replace(/_/g, ' ') || ''}</span>;
}

function ProcessPaymentModal({ onClose }) {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('membership');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [tendered, setTendered] = useState('');

  const searchMembers = async (q) => {
    if (q.length < 2) { setMemberResults([]); return; }
    try { const r = await api.get(`/api/members?query=${q}&limit=10`); setMemberResults(r.data.members || []); }
    catch { setMemberResults([]); }
  };

  const amountNum = parseFloat(amount) || 0;
  const tenderedNum = parseFloat(tendered) || 0;
  const change = tenderedNum - amountNum;

  const createTx = useMutation({
    mutationFn: () => api.post('/api/transactions', {
      member_id: selectedMember.id, amount: amountNum, description, type, payment_method: paymentMethod, status: 'completed',
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transactions'] }); queryClient.invalidateQueries({ queryKey: ['transaction-stats'] }); success('Payment recorded'); onClose(); },
    onError: () => error('Failed to record payment'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="payment-title">
        <h2 id="payment-title" className="text-lg font-semibold mb-4">Record Payment</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Member</label>
            {selectedMember ? (
              <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
                <span className="text-sm font-medium">{selectedMember.first_name} {selectedMember.last_name}</span>
                <button onClick={() => setSelectedMember(null)} className="text-xs text-red-600 hover:underline">Change</button>
              </div>
            ) : (
              <>
                <input type="text" placeholder="Search members..." value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); searchMembers(e.target.value); }}
                  className="input text-sm w-full" aria-label="Search member" />
                {memberResults.length > 0 && (
                  <div className="border rounded mt-1 max-h-40 overflow-y-auto" role="listbox">
                    {memberResults.map(m => (
                      <div key={m.id} onClick={() => { setSelectedMember(m); setMemberSearch(''); setMemberResults([]); }}
                        className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" role="option">{m.first_name} {m.last_name} ({m.email})</div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Amount ($)</label><input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="input text-sm w-full" required /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="input text-sm w-full">
                <option value="membership">Membership</option><option value="hold_fee">Hold Fee</option><option value="pt_pack">PT Pack</option><option value="product">Product</option><option value="other">Other</option>
              </select>
            </div>
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Description</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input text-sm w-full" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input text-sm w-full">
                <option value="card">Card</option><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option>
              </select>
            </div>
            {paymentMethod === 'cash' && (
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tendered ($)</label>
                <input type="number" step="0.01" value={tendered} onChange={(e) => setTendered(e.target.value)} className="input text-sm w-full" />
              </div>
            )}
          </div>
          {paymentMethod === 'cash' && tendered && (
            <div className={`p-2 rounded text-sm ${change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {change >= 0 ? `Change: $${change.toFixed(2)}` : `Short: $${Math.abs(change).toFixed(2)}`}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-outline text-sm">Cancel</button>
          <button onClick={createTx.mutate} disabled={!selectedMember || !amount || amountNum <= 0 || (paymentMethod === 'cash' && tenderedNum < amountNum)}
            className="btn-primary text-sm">{createTx.isPending ? 'Recording...' : 'Record Payment'}</button>
        </div>
      </div>
    </div>
  );
}

function exportCSV(transactions) {
  if (!transactions.length) return;
  const headers = ['Date', 'Member', 'Type', 'Amount', 'Status', 'Method'];
  const rows = transactions.map(tx => [tx.created_at, tx.member_name, tx.type, tx.amount, tx.status, tx.payment_method].map(v => `"${v || ''}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'transactions.csv'; a.click();
  URL.revokeObjectURL(url);
}
