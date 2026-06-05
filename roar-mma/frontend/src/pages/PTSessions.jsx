import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import { formatCurrency } from '../lib/formatters';

export default function PTSessions() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState('upcoming');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['pt-sessions', tab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab === 'upcoming') params.append('status', 'scheduled');
      if (tab === 'completed') params.append('status', 'completed');
      const r = await api.get(`/api/pt-sessions?${params}`);
      return r.data?.sessions || [];
    },
    retry: 2,
    refetchInterval: 15000,
  });

  const completeSession = useMutation({
    mutationFn: (id) => api.post(`/api/pt-sessions/${id}/complete`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pt-sessions'] }); success('Session completed'); },
    onError: () => error('Failed to complete'),
  });

  const cancelSession = useMutation({
    mutationFn: (id) => api.post(`/api/pt-sessions/${id}/cancel`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pt-sessions'] }); success('Session cancelled'); },
    onError: () => error('Failed to cancel'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">PT Sessions</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">+ Book Session</button>
      </div>

      <nav className="flex gap-1 border-b border-gray-200 mb-4">
        <button onClick={() => setTab('upcoming')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'upcoming' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Upcoming</button>
        <button onClick={() => setTab('completed')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'completed' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Completed</button>
        <button onClick={() => setTab('all')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'all' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>All</button>
      </nav>

      {showCreate && <CreatePTSession onClose={() => setShowCreate(false)} />}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No PT sessions found</p></div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{s.member_name || `Member #${s.member_id}`}</p>
                <p className="text-xs text-gray-500">Coach: {s.coach_name || `Coach #${s.coach_id}`}</p>
                <p className="text-xs text-gray-400">{s.scheduled_date ? new Date(s.scheduled_date).toLocaleDateString() : '—'} {s.start_time && `· ${s.start_time}`}{s.end_time && ` - ${s.end_time}`}</p>
                {s.amount && <p className="text-xs text-green-600 font-medium">{formatCurrency(s.amount)}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === 'completed' ? 'bg-green-100 text-green-700' : s.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{s.status}</span>
                {s.status === 'scheduled' && (
                  <>
                    <button onClick={() => completeSession.mutate(s.id)} className="text-xs text-green-600 hover:underline">Complete</button>
                    <button onClick={() => cancelSession.mutate(s.id)} className="text-xs text-red-500 hover:underline">Cancel</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreatePTSession({ onClose }) {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [coachId, setCoachId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [amount, setAmount] = useState('');

  const { data: coaches = [] } = useQuery({
    queryKey: ['staff-coaches'],
    queryFn: () => api.get('/api/staff?role=coach').then(r => r.data || []),
  });

  const searchMembers = async (q) => {
    if (q.length < 2) { setMemberResults([]); return; }
    try { const r = await api.get(`/api/members?query=${q}&limit=10`); setMemberResults(r.data.members || []); } catch { setMemberResults([]); }
  };

  const create = useMutation({
    mutationFn: () => api.post('/api/pt-sessions', {
      member_id: selectedMember.id, coach_id: parseInt(coachId), scheduled_date: date, start_time: startTime, end_time: endTime, amount: parseFloat(amount) || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pt-sessions'] }); success('PT session booked'); onClose(); },
    onError: () => error('Failed to book'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="text-lg font-semibold mb-4">Book PT Session</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Member</label>
            {selectedMember ? <div className="flex items-center justify-between bg-blue-50 p-2 rounded"><span className="text-sm font-medium">{selectedMember.first_name} {selectedMember.last_name}</span><button onClick={() => setSelectedMember(null)} className="text-xs text-red-600">Change</button></div> : <>
              <input type="text" placeholder="Search..." value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); searchMembers(e.target.value); }} className="input text-sm w-full" />
              {memberResults.length > 0 && <div className="border rounded mt-1 max-h-40 overflow-y-auto">{memberResults.map(m => <div key={m.id} onClick={() => { setSelectedMember(m); setMemberSearch(''); setMemberResults([]); }} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer">{m.first_name} {m.last_name}</div>)}</div>}
            </>}
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Coach</label><select value={coachId} onChange={e => setCoachId(e.target.value)} className="input text-sm w-full"><option value="">Select coach...</option>{coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="input text-sm w-full" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Start</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input text-sm w-full" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">End</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input text-sm w-full" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Amount ($)</label><input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="input text-sm w-full" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-outline text-sm">Cancel</button>
          <button onClick={create.mutate} disabled={!selectedMember || !coachId || !date || create.isPending} className="btn-primary text-sm">{create.isPending ? 'Booking...' : 'Book'}</button>
        </div>
      </div>
    </div>
  );
}
