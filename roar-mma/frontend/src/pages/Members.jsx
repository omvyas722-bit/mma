import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDate } from '../lib/formatters';
import AddMemberModal from '../components/Members/AddMemberModal';
import EditMemberModal from '../components/Members/EditMemberModal';
import ConfirmDialog from '../components/Shared/ConfirmDialog';



const LIMIT = 50;

function buildParams({ query, status, location, plan, member_type, offset }) {
  const p = new URLSearchParams();
  if (query) p.append('query', query);
  if (status) p.append('status', status);
  if (location) p.append('location', location);
  if (plan) p.append('plan', plan);
  if (member_type) p.append('member_type', member_type);
  p.append('limit', LIMIT);
  p.append('offset', String(offset));
  return p;
}

function useMemberFilters() {
  const [filters, setFilters] = useState({ query: '', status: '', location: '', plan: '', member_type: '', offset: 0 });
  const [inputValue, setInputValue] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const setQuery = useCallback((val) => {
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, query: val, offset: 0 }));
    }, 300);
  }, []);

  const setFilter = useCallback((key, val) => {
    setFilters(prev => ({ ...prev, [key]: val, offset: key !== 'offset' ? 0 : prev.offset }));
  }, []);

  return { filters, inputValue, setQuery, setFilter };
}

export default function Members() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const { filters, inputValue, setQuery, setFilter } = useMemberFilters();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [pausingMember, setPausingMember] = useState(null);
  const [cancellingMember, setCancellingMember] = useState(null);
  const [changingPlanMember, setChangingPlanMember] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [ctxMenu, setCtxMenu] = useState(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('click', close); document.removeEventListener('scroll', close, true); };
  }, [ctxMenu]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['members', filters],
    queryFn: async () => { const r = await api.get(`/api/members?${buildParams(filters)}`); return r.data; },
    retry: 2,
    staleTime: 10000,
    placeholderData: (prev) => prev,
  });

  const members = data?.members || [];
  const total = data?.total || 0;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['members'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  const deleteMember = useMutation({
    mutationFn: (id) => api.delete(`/api/members/${id}`),
    onSuccess: () => { invalidate(); setDeletingMember(null); success('Member deleted'); },
    onError: () => error('Failed to delete member'),
  });

  const pauseMember = useMutation({
    mutationFn: ({ id, data: d }) => api.post(`/api/members/${id}/pause`, d),
    onSuccess: () => { invalidate(); success('Member paused'); setPausingMember(null); },
    onError: () => error('Failed to pause member'),
  });

  const resumeMember = useMutation({
    mutationFn: (id) => api.post(`/api/members/${id}/resume`),
    onSuccess: () => { invalidate(); success('Member resumed'); },
    onError: () => error('Failed to resume member'),
  });

  const cancelMember = useMutation({
    mutationFn: ({ id, ...d }) => api.post(`/api/members/${id}/cancel`, d),
    onSuccess: () => { invalidate(); success('Membership cancelled'); setCancellingMember(null); },
    onError: () => error('Failed to cancel member'),
  });

  const changePlan = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/api/members/${id}`, d),
    onSuccess: () => { invalidate(); success('Plan updated'); setChangingPlanMember(null); },
    onError: () => error('Failed to change plan'),
  });

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(filters.offset / LIMIT) + 1;
  const allSelected = members.length > 0 && selected.size === members.length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => exportCSV(members)} disabled={members.length === 0} className="btn-outline text-sm">Export</button>
          <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary text-sm">+ Add Member</button>
        </div>
      </div>

      <AddMemberModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <EditMemberModal isOpen={!!editingMember} onClose={() => setEditingMember(null)} member={editingMember} />
      <ConfirmDialog isOpen={!!deletingMember} onClose={() => setDeletingMember(null)} onConfirm={() => deleteMember.mutate(deletingMember.id)}
        title="Delete Member" message={`Delete ${deletingMember?.first_name} ${deletingMember?.last_name}?`} confirmText="Delete" type="danger" />
      {pausingMember && <PauseModal member={pausingMember} onClose={() => setPausingMember(null)} onConfirm={(d) => pauseMember.mutate({ id: pausingMember.id, data: d })} />}
      {cancellingMember && <CancelModal member={cancellingMember} onClose={() => setCancellingMember(null)} onConfirm={(d) => cancelMember.mutate({ id: cancellingMember.id, ...d })} />}
      {changingPlanMember && <ChangePlanModal member={changingPlanMember} onClose={() => setChangingPlanMember(null)} onConfirm={(d) => changePlan.mutate({ id: changingPlanMember.id, ...d })} />}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input type="text" placeholder="Search name, email, phone..." value={inputValue} onChange={(e) => setQuery(e.target.value)} className="input text-sm" aria-label="Search members" />
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="input text-sm" aria-label="Filter by status">
            <option value="">All Statuses</option>
            <option value="active">Active</option><option value="trial">Trial</option><option value="paused">Paused</option><option value="cancelled">Cancelled</option>
          </select>
          <select value={filters.plan} onChange={(e) => setFilter('plan', e.target.value)} className="input text-sm" aria-label="Filter by plan">
            <option value="">All Plans</option>
            <option value="unlimited">Unlimited</option><option value="2x_week">2x Week</option><option value="3x_week">3x Week</option>
            <option value="casual">Casual</option><option value="fighter">Fighter</option><option value="pt_only">PT Only</option>
          </select>
          <select value={filters.member_type} onChange={(e) => setFilter('member_type', e.target.value)} className="input text-sm" aria-label="Filter by type">
            <option value="">All Types</option>
            <option value="ninja">Ninja</option><option value="kids">Kids</option><option value="teen">Teen</option>
            <option value="adult">Adult</option><option value="fighter">Fighter</option><option value="casual">Casual</option>
          </select>
          <select value={filters.location} onChange={(e) => setFilter('location', e.target.value)} className="input text-sm" aria-label="Filter by location">
            <option value="">All Locations</option>
            <option value="rockingham">Rockingham</option><option value="bibra_lake">Bibra Lake</option>
          </select>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between gap-3 flex-wrap" role="status" aria-live="polite">
          <span className="text-sm text-blue-800 font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => exportCSV(members.filter(m => selected.has(m.id)))} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">Export Selected</button>
            <button type="button" onClick={() => { if (confirm(`Send message to ${selected.size} members?`)) { success('Bulk messaging coming soon'); } }} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">Bulk Message</button>
            <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
          <p className="text-red-700 text-sm mb-3">Failed to load members</p>
          <button type="button" onClick={refetch} className="text-sm text-red-600 underline hover:no-underline">Try again</button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? <SkeletonTable rows={8} cols={8} /> :
          members.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-2">No members found</p>
              {(filters.query || filters.status || filters.plan || filters.location) && (
                <button type="button" onClick={() => { setFilter('query', ''); setFilter('status', ''); setFilter('plan', ''); setFilter('location', ''); }} className="text-sm text-red-600 hover:underline">Clear filters</button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200" role="table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(members.map(m => m.id)))}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500" aria-label="Select all members" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Plan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Location</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/members/${member.id}`)}
                        onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, member }); }}>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(member.id)} onChange={() => { const s = new Set(selected); s.has(member.id) ? s.delete(member.id) : s.add(member.id); setSelected(s); }}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500" aria-label={`Select ${member.first_name} ${member.last_name}`} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><span className="text-sm font-medium text-gray-900">{member.first_name} {member.last_name}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{member.email}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">{member.phone}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={member.status} /></td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize hidden sm:table-cell">{member.plan?.replace(/_/g, ' ') || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize hidden lg:table-cell">{member.location?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <ActionBtn label="View" onClick={() => navigate(`/members/${member.id}`)}>👁</ActionBtn>
                            {member.status === 'active' && <ActionBtn label="Pause" onClick={() => setPausingMember(member)}>⏸</ActionBtn>}
                            {member.status === 'paused' && <ActionBtn label="Resume" onClick={() => resumeMember.mutate(member.id)}>▶</ActionBtn>}
                            <ActionBtn label="Change plan" onClick={() => setChangingPlanMember(member)}>📋</ActionBtn>
                            {(member.status === 'active' || member.status === 'trial') && <ActionBtn label="Cancel" onClick={() => setCancellingMember(member)}>✕</ActionBtn>}
                            <ActionBtn label="Edit" onClick={() => setEditingMember(member)}>✎</ActionBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="bg-gray-50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-200">
                <span className="text-sm text-gray-700">{filters.offset + 1}–{Math.min(filters.offset + LIMIT, total)} of {total}</span>
                <div className="flex gap-1">
                  <button type="button" disabled={filters.offset === 0} onClick={() => setFilter('offset', Math.max(0, filters.offset - LIMIT))}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-100" aria-label="Previous page">Prev</button>
                  {renderPageButtons(totalPages, currentPage, filters.offset, LIMIT, setFilter)}
                  <button type="button" disabled={filters.offset + LIMIT >= total} onClick={() => setFilter('offset', filters.offset + LIMIT)}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-100" aria-label="Next page">Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {ctxMenu && (
        <div style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 50 }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
          onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => { navigate(`/members/${ctxMenu.member.id}`); setCtxMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">View Profile</button>
          <button type="button" onClick={() => { navigate(`/communications?member=${ctxMenu.member.id}`); setCtxMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Send Message</button>
          <div className="my-1 h-px bg-gray-200" />
          {ctxMenu.member.status === 'active' && (
            <button type="button" onClick={() => { setPausingMember(ctxMenu.member); setCtxMenu(null); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Pause Membership</button>
          )}
          {ctxMenu.member.status === 'paused' && (
            <button type="button" onClick={() => { resumeMember.mutate(ctxMenu.member.id); setCtxMenu(null); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Resume Membership</button>
          )}
          <div className="my-1 h-px bg-gray-200" />
          <button type="button" onClick={() => { setEditingMember(ctxMenu.member); setCtxMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit</button>
          <button type="button" onClick={() => { setDeletingMember(ctxMenu.member); setCtxMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
        </div>
      )}
    </div>
  );
}

function renderPageButtons(totalPages, currentPage, offset, limit, setFilter) {
  const start = Math.max(0, Math.min(currentPage - 3, totalPages - 5));
  return Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    const page = start + i + 1;
    if (page > totalPages) return null;
    return (
      <button key={page} type="button" onClick={() => setFilter('offset', (page - 1) * limit)}
        className={`px-3 py-1 text-sm border rounded ${page === currentPage ? 'bg-red-600 text-white border-red-600' : 'hover:bg-gray-100'}`}
        aria-label={`Page ${page}`} aria-current={page === currentPage ? 'page' : undefined}
      >{page}</button>
    );
  });
}

function ActionBtn({ label, onClick, children }) {
  return <button type="button" onClick={onClick} className="text-gray-500 hover:text-gray-700 p-1 text-xs" title={label} aria-label={label}>{children}</button>;
}

function StatusBadge({ status }) {
  const cls = { active: 'bg-green-100 text-green-700', trial: 'bg-yellow-100 text-yellow-700', paused: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-700' };
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${cls[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function SkeletonTable({ rows, cols }) {
  return (
    <div className="animate-pulse p-4" aria-label="Loading">
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex gap-4 py-3 border-b border-gray-100">
          {[...Array(cols)].map((_, c) => (
            <div key={c} className="h-4 bg-gray-200 rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PauseModal({ member, onClose, onConfirm }) {
  const [start, setStart] = useState(new Date().toISOString().split('T')[0]);
  const [end, setEnd] = useState('');
  const [holdRate, setHoldRate] = useState(0.71);
  const [maxDays, setMaxDays] = useState(84);
  useEffect(() => {
    fetch('/api/settings', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json()).then(s => {
        if (s.system?.hold_fee_rate) setHoldRate(parseFloat(s.system.hold_fee_rate));
        if (s.system?.hold_max_days) setMaxDays(parseInt(s.system.hold_max_days, 10));
      }).catch(() => {});
  }, []);
  const days = end && start ? Math.max(0, Math.ceil((new Date(end) - new Date(start)) / 86400000)) : 0;
  const fee = (days * holdRate).toFixed(2);
  const valid = start && end && days > 0 && days <= maxDays;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <h2 id="pause-title" className="text-lg font-semibold text-gray-900 mb-4">Pause Membership</h2>
        <p className="text-sm text-gray-500 mb-4">{member.first_name} {member.last_name}</p>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="input text-sm w-full" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">End Date (max {maxDays} days)</label><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="input text-sm w-full" /></div>
          {days > 0 && <p className="text-sm text-gray-600">Hold fee: <span className="font-medium">${fee}</span> ({days} days × ${holdRate.toFixed(2)}/day)</p>}
          {days > maxDays && <p className="text-sm text-red-500">Maximum hold period is {maxDays} days</p>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline text-sm">Cancel</button>
          <button type="button" disabled={!valid} onClick={() => onConfirm({ pause_start: start, pause_end: end })} className="btn-primary text-sm">Pause</button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({ member, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [lastBilling, setLastBilling] = useState('immediate');
  const [winBack, setWinBack] = useState(true);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cancel-title">
        <h2 id="cancel-title" className="text-lg font-semibold text-gray-900 mb-4">Cancel Membership</h2>
        <p className="text-sm text-gray-500 mb-4">{member.first_name} {member.last_name}</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="input text-sm w-full" required>
              <option value="">Select reason...</option>
              <option value="too_expensive">Too expensive</option><option value="moving">Moving away</option>
              <option value="schedule">Schedule conflict</option><option value="injury">Injury / health</option>
              <option value="not_attending">Not attending enough</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Last Billing</label>
            <select value={lastBilling} onChange={(e) => setLastBilling(e.target.value)} className="input text-sm w-full">
              <option value="immediate">Bill now, cancel immediately</option>
              <option value="end_period">End of billing period</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={winBack} onChange={(e) => setWinBack(e.target.checked)} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
            Add to win-back pipeline (HERMES will follow up)
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline text-sm">Keep Membership</button>
          <button type="button" disabled={!reason} onClick={() => onConfirm({ reason, last_billing: lastBilling, win_back: winBack })} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-40">Confirm Cancellation</button>
        </div>
      </div>
    </div>
  );
}

function ChangePlanModal({ member, onClose, onConfirm }) {
  const plans = [
    { value: 'unlimited', label: 'Unlimited', price: 69 },
    { value: '3x_week', label: '3x Week', price: 55 },
    { value: '2x_week', label: '2x Week', price: 45 },
    { value: 'fighter', label: 'Fighter', price: 79 },
    { value: 'casual', label: 'Casual', price: 30 },
    { value: 'pt_only', label: 'PT Only', price: 99 },
  ];
  const [newPlan, setNewPlan] = useState(member.plan || '');
  const currentPrice = plans.find(p => p.value === member.plan)?.price || 0;
  const targetPrice = plans.find(p => p.value === newPlan)?.price || 0;
  const diff = targetPrice - currentPrice;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="plan-title">
        <h2 id="plan-title" className="text-lg font-semibold text-gray-900 mb-4">Change Plan</h2>
        <p className="text-sm text-gray-500 mb-1">{member.first_name} {member.last_name}</p>
        <p className="text-xs text-gray-400 mb-4">Current: <span className="capitalize">{member.plan?.replace(/_/g, ' ') || 'None'} (${currentPrice}/mo)</span></p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New Plan</label>
            <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} className="input text-sm w-full">
              <option value="">Select plan...</option>
              {plans.map(p => <option key={p.value} value={p.value}>{p.label} — ${p.price}/mo</option>)}
            </select>
          </div>
          {newPlan && newPlan !== member.plan && (
            <div className={`p-3 rounded-lg text-sm ${diff > 0 ? 'bg-orange-50 text-orange-700' : diff < 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
              {diff > 0 ? `Price increase: +$${diff}/mo (prorated difference billed today)` : diff < 0 ? `Price decrease: -$${Math.abs(diff)}/mo` : 'Same price tier'}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline text-sm">Cancel</button>
          <button type="button" disabled={!newPlan || newPlan === member.plan} onClick={() => onConfirm({ plan: newPlan })} className="btn-primary text-sm">Change Plan</button>
        </div>
      </div>
    </div>
  );
}

function exportCSV(members) {
  if (!members.length) return;
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Plan', 'Location', 'Joined'];
  const rows = members.map(m => [m.first_name, m.last_name, m.email, m.phone, m.status, m.plan, m.location, m.joined_date].map(v => `"${v || ''}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'members.csv'; a.click();
  URL.revokeObjectURL(url);
}
