import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

export default function FamilyDiscounts() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['family-discounts'],
    queryFn: async () => { const r = await api.get('/api/family-discounts'); return r.data?.groups || []; },
    retry: 2,
  });

  const deleteGroup = useMutation({
    mutationFn: (id) => api.delete(`/api/family-discounts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['family-discounts'] }); success('Group deleted'); },
    onError: () => error('Failed to delete'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Family Discounts</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">+ New Group</button>
      </div>

      {showCreate && <GroupForm onClose={() => setShowCreate(false)} />}

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No family discount groups yet</p></div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <div key={g.id} className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === g.id ? null : g.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👪</span>
                  <div>
                    <p className="font-medium text-gray-900">{g.name || `Family Group #${g.id}`}</p>
                    <p className="text-xs text-gray-500">{g.discount_pct}% discount · {g.member_count || 0} members</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); deleteGroup.mutate(g.id); }} className="text-xs text-red-500 hover:underline">Delete</button>
                  <span className={`text-gray-400 transition-transform ${expanded === g.id ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </div>
              {expanded === g.id && <GroupDetail group={g} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupDetail({ group }) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);

  const removeMember = useMutation({
    mutationFn: (memberId) => api.delete(`/api/family-discounts/${group.id}/members/${memberId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['family-discounts'] }); success('Member removed'); },
    onError: () => error('Failed to remove'),
  });

  const addMember = useMutation({
    mutationFn: (memberId) => api.post(`/api/family-discounts/${group.id}/members`, { member_id: memberId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['family-discounts'] }); setMemberSearch(''); setMemberResults([]); success('Member added'); },
    onError: () => error('Failed to add'),
  });

  const searchMembers = async (q) => {
    if (q.length < 2) { setMemberResults([]); return; }
    try { const r = await api.get(`/api/members?query=${q}&limit=10`); setMemberResults(r.data.members || []); } catch { setMemberResults([]); }
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
      <div className="flex gap-2">
        <input type="text" placeholder="Add member by name..." value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); searchMembers(e.target.value); }} className="input text-sm flex-1" />
        {memberResults.length > 0 && (
          <div className="absolute mt-8 bg-white border rounded-lg shadow max-h-40 overflow-y-auto z-10">
            {memberResults.map(m => <button key={m.id} onClick={() => addMember.mutate(m.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{m.first_name} {m.last_name}</button>)}
          </div>
        )}
      </div>
      {group.members?.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {group.members.map(m => (
            <div key={m.id} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-900">{m.first_name} {m.last_name}</span>
              <button onClick={() => removeMember.mutate(m.id)} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-2">No members in this group yet</p>
      )}
    </div>
  );
}

function GroupForm({ onClose }) {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [name, setName] = useState('');
  const [discountPct, setDiscountPct] = useState('10');

  const create = useMutation({
    mutationFn: () => api.post('/api/family-discounts', { name: name.trim() || null, discount_pct: parseFloat(discountPct) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['family-discounts'] }); success('Group created'); onClose(); },
    onError: () => error('Failed to create'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="text-lg font-semibold mb-4">New Family Discount Group</h2>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Group Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="input text-sm w-full" placeholder="e.g. Smith Family" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Discount %</label><input type="number" min="0" max="100" step="1" value={discountPct} onChange={e => setDiscountPct(e.target.value)} className="input text-sm w-full" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-outline text-sm">Cancel</button>
          <button onClick={create.mutate} disabled={!discountPct || create.isPending} className="btn-primary text-sm">{create.isPending ? 'Creating...' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}
