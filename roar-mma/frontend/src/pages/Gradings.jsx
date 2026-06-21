import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

export default function Gradings() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [showSchedule, setShowSchedule] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('');
  const [viewParticipants, setViewParticipants] = useState(null);
  const [recordResults, setRecordResults] = useState(null);
  const [certificateData, setCertificateData] = useState(null);
  const [tab, setTab] = useState('sessions');

  const { data: sessions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['grading-sessions', sessionFilter],
    queryFn: async () => { const p = sessionFilter ? `?status=${sessionFilter}` : ''; const r = await api.get(`/api/grading/sessions${p}`); const d = r.data; return Array.isArray(d) ? d : d?.sessions || []; },
    staleTime: 10000,
  });

  const { data: registry = [] } = useQuery({
    queryKey: ['belt-registry'],
    queryFn: async () => { const r = await api.get('/api/grading/belts/registry'); const d = r.data; return d?.registry || []; },
    staleTime: 10000,
  });

  const { data: belts } = useQuery({
    queryKey: ['belt-levels'],
    queryFn: async () => { const r = await api.get('/api/grading/belts'); const d = r.data; return Array.isArray(d) ? d : d?.belts || []; },
    staleTime: 300000,
  });

  const { data: leaderboard = [], isLoading: lbLoading } = useQuery({
    queryKey: ['fighter-leaderboard'],
    queryFn: async () => { const r = await api.get('/api/grading/fighters/leaderboard'); const d = r.data; return Array.isArray(d) ? d : []; },
    staleTime: 30000,
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
        {tab === 'sessions' && <button onClick={() => setShowSchedule(true)} className="btn-primary text-sm">+ Schedule Grading</button>}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-4">
        <nav className="flex border-b border-gray-200">
          <button type="button" onClick={() => setTab('sessions')} className={`px-6 py-3 text-sm font-medium ${tab === 'sessions' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>Sessions</button>
          <button type="button" onClick={() => setTab('registry')} className={`px-6 py-3 text-sm font-medium ${tab === 'registry' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>Belt Registry</button>
          <button type="button" onClick={() => setTab('leaderboard')} className={`px-6 py-3 text-sm font-medium ${tab === 'leaderboard' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>Fighter Leaderboard</button>
        </nav>
      </div>

      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onSave={createSession.mutate} />}
      {recordResults && <RecordResultsModal session={recordResults} onClose={() => { setRecordResults(null); queryClient.invalidateQueries({ queryKey: ['grading-sessions'] }); }} onGenerateCert={(data) => setCertificateData(data)} />}
      {viewParticipants && <ParticipantsModal session={viewParticipants} onClose={() => setViewParticipants(null)} />}
      {certificateData && <CertificateModal data={certificateData} onClose={() => setCertificateData(null)} />}

      {tab === 'registry' ? (
        <BeltRegistry registry={registry} />
      ) : tab === 'leaderboard' ? (
        <FighterLeaderboard data={leaderboard} loading={lbLoading} />
      ) : (
        <>
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
            {isError ? <div className="col-span-3 bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert"><p className="text-red-700 text-sm mb-3">Failed to load grading sessions</p><button type="button" onClick={refetch} className="text-sm text-red-600 underline hover:no-underline">Try again</button></div> :
            isLoading ? <div className="col-span-3 text-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div></div> :
            sessions.length === 0 ? <div className="col-span-3 text-center py-12"><p className="text-gray-500">No grading sessions</p></div> :
            sessions.map(s => (
              <div key={s.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">{s.name || `Grading #${s.id}`}</h3>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-xs text-gray-500">{s.session_date || s.date} · {s.location?.replace(/_/g, ' ') || '—'}</p>
                {s.notes && <p className="text-xs text-gray-600 mt-1">{s.notes}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setViewParticipants(s)} className="text-xs text-red-600 hover:underline">View Participants</button>
                  {s.status === 'completed' && <button onClick={() => setRecordResults(s)} className="text-xs text-green-600 hover:underline">Record Results</button>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BeltRegistry({ registry }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Discipline</th>
            <th className="px-4 py-3">Current Belt</th>
            <th className="px-4 py-3">Last Graded</th>
            <th className="px-4 py-3">Classes Since</th>
            <th className="px-4 py-3">Eligible?</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {registry.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No belt records found</td></tr>
          ) : registry.map(r => {
            const toGo = r.min_required ? Math.max(0, r.min_required - r.classes_since) : 0;
            const closeToEligible = !r.eligible && r.min_required && toGo <= 5;
            const rowClass = r.eligible ? 'bg-green-50' : closeToEligible ? 'bg-yellow-50' : '';
            return (
              <tr key={`${r.member_id}-${r.discipline}`} className={rowClass}>
                <td className="px-4 py-3 font-medium text-gray-900">{r.first_name} {r.last_name}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{r.discipline?.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-gray-900">{r.current_belt}</td>
                <td className="px-4 py-3 text-gray-500">{r.last_graded || '—'}</td>
                <td className="px-4 py-3 text-gray-700">{r.classes_since}</td>
                <td className="px-4 py-3">
                  {r.eligible ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-gray-400">{toGo} to go</span>}
                </td>
                <td className="px-4 py-3 flex gap-1">
                  <button className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50" disabled={r.eligible}>Mark Eligible</button>
                  <button className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Schedule Grading</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RecordResultsModal({ session, onClose, onGenerateCert }) {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [results, setResults] = useState({});
  const [showCertButton, setShowCertButton] = useState(false);

  const { data: participants = [], isLoading } = useQuery({
    queryKey: ['grading-participants', session?.id],
    queryFn: async () => { const r = await api.get(`/api/grading/sessions/${session.id}/participants`); return r.participants || []; },
    enabled: !!session,
    staleTime: 10000,
  });

  const { data: belts = [] } = useQuery({
    queryKey: ['belt-levels'],
    queryFn: async () => { const r = await api.get('/api/grading/belts'); return Array.isArray(r) ? r : r.belts || []; },
    enabled: !!session,
    staleTime: 300000,
  });

  const saveResult = useMutation({
    mutationFn: async ({ participantId, data }) => api.post(`/api/grading/participants/${participantId}/result`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['grading-participants'] }); success('Result saved'); },
    onError: () => error('Failed'),
  });

  const handleSave = async () => {
    const entries = Object.entries(results);
    for (const [pid, val] of entries) {
      if (val.result === 'hold') continue;
      await saveResult.mutateAsync({ participantId: parseInt(pid, 10), data: { result: val.result, awarded_stripes: val.stripes || 0 } });
    }
    setShowCertButton(true);
    success('All results saved');
  };

  const passedParticipants = participants.filter(p => results[p.id]?.result === 'passed');

  if (!session) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{session.name || `Grading #${session.id}`} — Record Results</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        {isLoading ? (
          <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div></div>
        ) : participants.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No participants registered</p>
        ) : (
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {participants.map(p => {
              const r = results[p.id] || { result: 'hold' };
              const discBelts = belts.filter(b => b.discipline === (p.discipline || 'bjj'));
              return (
                <div key={p.id} className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{p.member_name || `${p.first_name} ${p.last_name}`}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p.belt_name || p.current_belt}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <select value={r.result} onChange={e => setResults(prev => ({ ...prev, [p.id]: { ...prev[p.id], result: e.target.value } }))} className="input text-xs flex-1">
                      <option value="hold">— Hold —</option>
                      <option value="passed">Pass</option>
                      <option value="failed">Fail</option>
                    </select>
                    {r.result === 'passed' && (
                      <select value={r.newBeltId || p.testing_for_belt_id || ''} onChange={e => setResults(prev => ({ ...prev, [p.id]: { ...prev[p.id], newBeltId: parseInt(e.target.value, 10) } }))} className="input text-xs flex-1">
                        <option value="">Select new grade</option>
                        {discBelts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    )}
                  </div>
                  {r.result === 'passed' && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-gray-500">Stripes:</label>
                      <input type="number" min="0" max="4" value={r.stripes || 0} onChange={e => setResults(prev => ({ ...prev, [p.id]: { ...prev[p.id], stripes: parseInt(e.target.value, 10) || 0 } }))} className="input text-xs w-16" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-outline text-sm">Close</button>
          {!showCertButton && <button onClick={handleSave} disabled={saveResult.isPending} className="btn-primary text-sm">{saveResult.isPending ? 'Saving...' : 'Save Results'}</button>}
          {showCertButton && passedParticipants.length > 0 && (
            <button onClick={() => {
              const certData = passedParticipants.map(p => {
                const beltId = results[p.id]?.newBeltId || p.testing_for_belt_id;
                const belt = belts.find(b => b.id === beltId);
                return {
                  name: p.member_name || `${p.first_name} ${p.last_name}`,
                  discipline: p.discipline || 'bjj',
                  newBelt: belt?.name || '—',
                  date: session.session_date,
                };
              });
              onGenerateCert(certData);
            }} className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-purple-700">Generate Certificate{passedParticipants.length > 1 ? 's' : ''}</button>
          )}
        </div>
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

function ParticipantsModal({ session, onClose }) {
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ['grading-participants', session?.id],
    queryFn: async () => { const r = await api.get(`/api/grading/sessions/${session.id}/participants`); return r.participants || []; },
    enabled: !!session,
    staleTime: 10000,
  });
  if (!session) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{session.name || `Grading #${session.id}`} — Participants</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        {participants.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No participants registered yet</p>
        ) : (
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {participants.map(p => (
              <div key={p.id} className="py-2 flex justify-between items-center">
                <span className="text-sm text-gray-900">{p.member_name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p.belt_name} · {p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CertificateModal({ data, onClose }) {
  const certRef = useRef(null);
  const now = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Grading Certificate{data.length > 1 ? 's' : ''}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div ref={certRef} className="space-y-4 max-h-[70vh] overflow-y-auto">
          {data.map((cert, i) => (
            <div key={i} id={`cert-${i}`} className="certificate-print border-2 border-gray-300 rounded-lg p-8 text-center" style={{ pageBreakInside: 'avoid' }}>
              <div className="text-sm text-gray-500 uppercase tracking-widest mb-2">ROAR MMA</div>
              <div className="text-3xl font-bold text-red-600 mb-1">Certificate of Achievement</div>
              <div className="w-24 h-0.5 bg-red-600 mx-auto my-4"></div>
              <p className="text-gray-600 mb-1">This certifies that</p>
              <p className="text-2xl font-bold text-gray-900 mb-2">{cert.name}</p>
              <p className="text-gray-600 mb-1">has successfully demonstrated proficiency in</p>
              <p className="text-xl font-semibold text-gray-800 mb-1 capitalize">{cert.discipline.replace(/_/g, ' ')}</p>
              <p className="text-gray-600 mb-1">and is awarded the rank of</p>
              <p className="text-2xl font-bold text-purple-700 mb-4">{cert.newBelt}</p>
              <div className="w-24 h-0.5 bg-gray-300 mx-auto my-4"></div>
              <div className="flex justify-between text-sm text-gray-500 mt-6">
                <div><p className="font-semibold text-gray-700">Date</p><p>{cert.date || now}</p></div>
                <div><p className="font-semibold text-gray-700">Coach Signature</p><p className="mt-6 border-t border-gray-400 pt-1 inline-block">_________________________</p></div>
              </div>
              <div className="text-xs text-gray-400 mt-6">ROAR MMA — Rockingham · Bibra Lake</div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-outline text-sm">Close</button>
          <button onClick={() => window.print()} className="btn-primary text-sm">Print Certificates</button>
        </div>
      </div>
    </div>
  );
}

function FighterLeaderboard({ data, loading }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Fighter</th>
            <th className="px-4 py-3">Weight Class</th>
            <th className="px-4 py-3">Record (W-L-D)</th>
            <th className="px-4 py-3">Win Rate</th>
            <th className="px-4 py-3">Last Fight</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div></td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No fighters found</td></tr>
          ) : data.map((f, i) => {
            const wr = parseFloat(f.win_rate) || 0;
            const wrColor = wr >= 70 ? 'text-green-600' : wr >= 50 ? 'text-blue-600' : wr > 0 ? 'text-orange-600' : 'text-gray-500';
            return (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-bold text-gray-400">#{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{f.first_name} {f.last_name}</td>
                <td className="px-4 py-3 text-gray-600">{f.weight_class}</td>
                <td className="px-4 py-3">
                  <span className="text-green-700 font-medium">{f.wins}</span>
                  <span className="text-gray-400 mx-0.5">-</span>
                  <span className="text-red-700 font-medium">{f.losses}</span>
                  <span className="text-gray-400 mx-0.5">-</span>
                  <span className="text-gray-500">{f.draws}</span>
                </td>
                <td className={`px-4 py-3 font-bold ${wrColor}`}>{wr}%</td>
                <td className="px-4 py-3 text-gray-500">{f.last_fight_date || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const m = { scheduled: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${m[status] || 'bg-gray-100 text-gray-600'} capitalize`}>{status?.replace(/_/g, ' ')}</span>;
}
