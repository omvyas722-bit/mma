import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

export default function Gradings() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [showSchedule, setShowSchedule] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['grading-sessions', sessionFilter],
    queryFn: async () => { const p = sessionFilter ? `?status=${sessionFilter}` : ''; const r = await api.get(`/api/grading/sessions${p}`); return r.data?.sessions || []; },
  });

  const { data: belts } = useQuery({
    queryKey: ['belt-levels'],
    queryFn: async () => { const r = await api.get('/api/grading/belts'); return r.data?.belts || []; },
  });

  const createSession = useMutation({
    mutationFn: (d) => api.post('/api/grading/sessions', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['grading-sessions'] }); setShowSchedule(false); success('Session created'); },
    onError: () => error('Failed'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Belt Gradings</h1>
        <button onClick={() => setShowSchedule(true)} className="btn-primary text-sm">+ Schedule Grading</button>
      </div>

      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onSave={createSession.mutate} />}

      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)} className="input text-sm">
          <option value="">All Sessions</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {isLoading ? <div className="col-span-3 text-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div></div> :
        sessions.length === 0 ? <div className="col-span-3 text-center py-12"><p className="text-gray-500">No grading sessions</p></div> :
        sessions.map(s => (
          <div key={s.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">{s.name || `Grading #${s.id}`}</h3>
              <StatusBadge status={s.status} />
            </div>
            <p className="text-xs text-gray-500">{s.date} · {s.location?.replace(/_/g, ' ') || '—'}</p>
            {s.notes && <p className="text-xs text-gray-600 mt-1">{s.notes}</p>}
            <div className="mt-3 flex gap-2">
              <button className="text-xs text-red-600 hover:underline">View Participants</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', date: '', location: 'rockingham', notes: '' });
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="schedule-grading-title">
        <h2 id="schedule-grading-title" className="text-lg font-semibold mb-4">Schedule Grading Session</h2>
        <div className="space-y-3">
          <input placeholder="Session name" value={form.name} onChange={e => u('name', e.target.value)} className="input text-sm w-full" />
          <input type="date" value={form.date} onChange={e => u('date', e.target.value)} className="input text-sm w-full" />
          <select value={form.location} onChange={e => u('location', e.target.value)} className="input text-sm w-full"><option value="rockingham">Rockingham</option><option value="bibra_lake">Bibra Lake</option></select>
          <textarea placeholder="Notes" value={form.notes} onChange={e => u('notes', e.target.value)} className="input text-sm w-full" rows={2}></textarea>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-outline text-sm">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.date} className="btn-primary text-sm">Create Session</button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const m = { scheduled: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${m[status] || 'bg-gray-100 text-gray-600'} capitalize`}>{status?.replace(/_/g, ' ')}</span>;
}
