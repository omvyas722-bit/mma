import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

export default function MakeupClasses() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [showGrant, setShowGrant] = useState(false);
  const [tab, setTab] = useState('active');

  const { data: active = [], isLoading: loadingActive } = useQuery({
    queryKey: ['makeup-classes-active'],
    queryFn: async () => { const r = await api.get('/api/makeup-classes/active'); return r.data?.makeups || []; },
    retry: 2,
    refetchInterval: 15000,
  });

  const useMakeup = useMutation({
    mutationFn: (id) => api.post(`/api/makeup-classes/${id}/use`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['makeup-classes-active'] }); success('Makeup used'); },
    onError: () => error('Failed to use makeup'),
  });

  const deleteMakeup = useMutation({
    mutationFn: (id) => api.delete(`/api/makeup-classes/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['makeup-classes-active'] }); success('Makeup removed'); },
    onError: () => error('Failed to delete'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Makeup Classes</h1>
        <button onClick={() => setShowGrant(true)} className="btn-primary text-sm">+ Grant Makeup</button>
      </div>

      <nav className="flex gap-1 border-b border-gray-200 mb-4">
        <button onClick={() => setTab('active')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'active' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Active ({active.length})</button>
        <button onClick={() => setTab('member')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'member' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Lookup Member</button>
      </nav>

      {showGrant && <GrantMakeupForm onClose={() => setShowGrant(false)} />}

      {tab === 'active' && (
        loadingActive ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>
        ) : active.length === 0 ? (
          <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No active makeup classes</p></div>
        ) : (
          <div className="space-y-2">
            {active.map(m => (
              <div key={m.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{m.member_name || `Member #${m.member_id}`}</p>
                  <p className="text-xs text-gray-500">Granted: {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'} {m.expires_at && `· Expires: ${new Date(m.expires_at).toLocaleDateString()}`}</p>
                  {m.used_at && <p className="text-xs text-green-600">Used: {new Date(m.used_at).toLocaleDateString()}</p>}
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.used_at ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>{m.used_at ? 'Used' : 'Available'}</span>
                  {!m.used_at && <button onClick={() => useMakeup.mutate(m.id)} className="text-xs text-blue-600 hover:underline">Use</button>}
                  <button onClick={() => deleteMakeup.mutate(m.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'member' && <MemberMakeupLookup />}
    </div>
  );
}

function MemberMakeupLookup() {
  const [search, setSearch] = useState('');
  const [memberId, setMemberId] = useState(null);

  const { data: results = [] } = useQuery({
    queryKey: ['member-search-makeup', search],
    queryFn: () => api.get(`/api/members?query=${encodeURIComponent(search)}&limit=10`).then(r => r.data?.members || []),
    enabled: search.length >= 2,
  });

  const { data: memberMakeups = [] } = useQuery({
    queryKey: ['member-makeups', memberId],
    queryFn: () => api.get(`/api/makeup-classes/member/${memberId}`).then(r => r.data?.makeups || []),
    enabled: !!memberId,
  });

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <input type="text" placeholder="Search member..." value={search} onChange={e => { setSearch(e.target.value); setMemberId(null); }} className="input text-sm w-full" />
        {search.length >= 2 && results.length > 0 && (
          <div className="mt-2 border rounded max-h-40 overflow-y-auto">
            {results.map(m => <button key={m.id} onClick={() => { setMemberId(m.id); setSearch(`${m.first_name} ${m.last_name}`); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{m.first_name} {m.last_name}</button>)}
          </div>
        )}
      </div>
      {memberId && (
        memberMakeups.length === 0 ? (
          <div className="bg-white rounded-lg shadow text-center py-8"><p className="text-gray-500">No makeup classes for this member</p></div>
        ) : (
          <div className="space-y-2">
            {memberMakeups.map(m => (
              <div key={m.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div><p className="text-sm text-gray-900">Granted: {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</p><p className="text-xs text-gray-500">{m.used_at ? `Used: ${new Date(m.used_at).toLocaleDateString()}` : 'Not used yet'}</p></div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.used_at ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>{m.used_at ? 'Used' : 'Available'}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function GrantMakeupForm({ onClose }) {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [expiryDays, setExpiryDays] = useState('30');
  const [reason, setReason] = useState('');

  const searchMembers = async (q) => {
    if (q.length < 2) { setMemberResults([]); return; }
    try { const r = await api.get(`/api/members?query=${q}&limit=10`); setMemberResults(r.data.members || []); } catch { setMemberResults([]); }
  };

  const create = useMutation({
    mutationFn: () => api.post('/api/makeup-classes', {
      member_id: selectedMember.id, expires_in_days: parseInt(expiryDays), reason,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['makeup-classes-active'] }); success('Makeup granted'); onClose(); },
    onError: () => error('Failed to grant makeup'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="text-lg font-semibold mb-4">Grant Makeup Class</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Member</label>
            {selectedMember ? <div className="flex items-center justify-between bg-blue-50 p-2 rounded"><span className="text-sm font-medium">{selectedMember.first_name} {selectedMember.last_name}</span><button onClick={() => setSelectedMember(null)} className="text-xs text-red-600">Change</button></div> : <>
              <input type="text" placeholder="Search..." value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); searchMembers(e.target.value); }} className="input text-sm w-full" />
              {memberResults.length > 0 && <div className="border rounded mt-1 max-h-40 overflow-y-auto">{memberResults.map(m => <div key={m.id} onClick={() => { setSelectedMember(m); setMemberSearch(''); setMemberResults([]); }} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer">{m.first_name} {m.last_name}</div>)}</div>}
            </>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Expires in (days)</label><input type="number" min="1" value={expiryDays} onChange={e => setExpiryDays(e.target.value)} className="input text-sm w-full" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Reason</label><input type="text" value={reason} onChange={e => setReason(e.target.value)} className="input text-sm w-full" placeholder="e.g. Missed class" /></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-outline text-sm">Cancel</button>
          <button onClick={create.mutate} disabled={!selectedMember || create.isPending} className="btn-primary text-sm">{create.isPending ? 'Granting...' : 'Grant'}</button>
        </div>
      </div>
    </div>
  );
}
