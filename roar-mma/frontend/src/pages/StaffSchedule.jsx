import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StaffSchedule() {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ staff_id: '', day_of_week: 1, start_time: '09:00', end_time: '17:00', location: '' });

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['staff-schedule-page'],
    queryFn: () => api.get('/api/staff-schedule').then(r => r.data?.schedule || { shifts: [], timeOff: [] }),
    refetchInterval: 30000,
  });

  const { data: staffList } = useQuery({ queryKey: ['staff', {}], queryFn: () => api.get('/api/staff').then(r => r.data) });

  const addShift = useMutation({
    mutationFn: () => api.post('/api/staff-schedule/shifts', form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-schedule-page'] }); success('Shift added'); setShowForm(false); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

  const delShift = useMutation({
    mutationFn: (id) => api.delete(`/api/staff-schedule/shifts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-schedule-page'] }); success('Shift removed'); },
    onError: () => error('Failed to delete'),
  });

  const shifts = scheduleData?.shifts || [];
  const timeOff = scheduleData?.timeOff || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Schedule</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">{showForm ? 'Cancel' : '+ Add Shift'}</button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <select value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))} className="input text-xs"><option value="">Staff...</option>{(staffList || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: parseInt(e.target.value) }))} className="input text-xs">{DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}</select>
          <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="input text-xs" />
          <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="input text-xs" />
          <button onClick={addShift.mutate} disabled={!form.staff_id || addShift.isPending} className="bg-red-600 text-white text-xs py-2 rounded-lg hover:bg-red-700 disabled:opacity-40">Save</button>
        </div>
      )}

      {isLoading ? <div className="bg-white rounded-lg shadow p-6 animate-pulse"><div className="h-8 bg-gray-100 rounded w-48 mb-4"></div><div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-100 rounded"></div>)}</div></div> : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-2.5">Staff</th>{DAY_NAMES.map(d => <th key={d} className="px-3 py-2.5">{d}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {[...new Set(shifts.map(s => s.staff_id))].map(sid => {
                const staff = staffList?.find(s => s.id === sid);
                return <tr key={sid} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{staff?.name || `Staff #${sid}`}</td>
                  {DAY_NAMES.map((_, di) => {
                    const dayShifts = shifts.filter(s => s.staff_id === sid && s.day_of_week === di);
                    return <td key={di} className="px-3 py-2.5 text-xs">{dayShifts.map(s => <div key={s.id} className="flex items-center gap-1"><span className="text-gray-700">{s.start_time}-{s.end_time}</span><button onClick={() => delShift.mutate(s.id)} className="text-red-400 hover:text-red-600">✕</button></div>)}</td>;
                  })}
                </tr>;
              })}
              {shifts.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No shifts scheduled</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {timeOff.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Time Off</h3>
          <div className="space-y-1 text-xs text-yellow-700">{timeOff.map(t => <p key={t.id}>{t.staff_name || `Staff #${t.staff_id}`}: {t.date_from} → {t.date_to} ({t.type})</p>)}</div>
        </div>
      )}
    </div>
  );
}
