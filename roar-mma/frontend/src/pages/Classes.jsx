import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format, startOfWeek, addDays } from 'date-fns';
import { useNotifications } from '../contexts/NotificationContext';
import AddClassModal from '../components/Classes/AddClassModal';
import EditClassModal from '../components/Classes/EditClassModal';
import CheckInModal from '../components/Classes/CheckInModal';
import { ConfirmDialog } from '../components/Modal';
import { ContextMenu } from '../components/Dropdown';
import { useLocation } from '../contexts/LocationContext';
import NlpScheduler from '../components/Classes/NlpScheduler';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TYPE_COLORS = { bjj: 'bg-blue-100 text-blue-800', muay_thai: 'bg-red-100 text-red-800', mma: 'bg-purple-100 text-purple-800', boxing: 'bg-orange-100 text-orange-800', fitness: 'bg-green-100 text-green-800', kids: 'bg-yellow-100 text-yellow-800' };

function useEscapeKey(handler) {
  useEffect(() => { const listener = (e) => { if (e.key === 'Escape') handler(e); }; document.addEventListener('keydown', listener); return () => document.removeEventListener('keydown', listener); }, [handler]);
}

function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const container = ref.current;
    const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    first.focus();
    const handler = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    container.addEventListener('keydown', handler);
    return () => container.removeEventListener('keydown', handler);
  }, [active, ref]);
}

export default function Classes() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deletingClass, setDeletingClass] = useState(null);
  const [checkInClass, setCheckInClass] = useState(null);
  const [detailInstance, setDetailInstance] = useState(null);
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [splitView, setSplitView] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekEnd = addDays(weekStart, 6);
  const { locations: allLocations } = useLocation();
  const splitLocations = useMemo(() => allLocations.filter(l => l.id !== 'all'), [allLocations]);
  const effectiveLocationFilter = splitView ? '' : locationFilter;

  const { data: instances, isLoading, isError, refetch } = useQuery({
    queryKey: ['class-instances', format(weekStart, 'yyyy-MM-dd'), effectiveLocationFilter, typeFilter],
    queryFn: async () => {
      const params = { week_start: format(weekStart, 'yyyy-MM-dd'), week_end: format(weekEnd, 'yyyy-MM-dd') };
      if (effectiveLocationFilter) params.location = effectiveLocationFilter;
      if (typeFilter) params.class_type = typeFilter;
      const r = await api.get('/api/classes/instances', { params });
      return r.data;
    },
    retry: 2,
    staleTime: 10000,
  });

  const instanceList = Array.isArray(instances) ? instances : [];

  const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey: ['class-instances'] }), [queryClient]);

  const deleteClass = useMutation({
    mutationFn: (id) => api.delete(`/api/classes/${id}`),
    onSuccess: () => { invalidate(); setDeletingClass(null); success('Class deleted'); },
    onError: () => error('Failed to delete class'),
  });

  const duplicateClass = useMutation({
    mutationFn: (id) => api.post(`/api/classes/${id}/duplicate`),
    onSuccess: () => { invalidate(); success('Class duplicated'); },
    onError: () => error('Failed to duplicate class'),
  });

  const cancelInstance = useMutation({
    mutationFn: ({ id, reason, notify }) => api.post(`/api/classes/instances/${id}/cancel`, { reason, notify_members: notify }),
    onSuccess: () => { invalidate(); setDetailInstance(null); success('Class cancelled'); },
    onError: () => error('Failed to cancel class'),
  });

  const instancesByDay = useMemo(() => {
    const grouped = {};
    DAYS.forEach((day, i) => {
      const date = addDays(weekStart, i);
      grouped[day] = { date: format(date, 'yyyy-MM-dd'), displayDate: format(date, 'MMM d'), instances: instanceList.filter(inst => inst.date === format(date, 'yyyy-MM-dd')) };
    });
    return grouped;
  }, [instanceList, weekStart]);

  const totalBookings = useMemo(() => instanceList.reduce((s, i) => s + (i.booked_count || 0), 0), [instanceList]);
  const avgFill = useMemo(() => instanceList.length > 0 ? Math.round(instanceList.reduce((s, i) => s + ((i.booked_count || 0) / (i.capacity || 20) * 100), 0) / instanceList.length) : 0, [instanceList]);

  const instancesByLocation = useMemo(() => {
    if (!splitView) return {};
    const grouped = {};
    splitLocations.forEach(loc => {
      grouped[loc.id] = {};
      DAYS.forEach((day, i) => {
        const d = format(addDays(weekStart, i), 'yyyy-MM-dd');
        grouped[loc.id][day] = {
          date: d,
          displayDate: format(addDays(weekStart, i), 'MMM d'),
          instances: instanceList.filter(inst => inst.location === loc.id && inst.date === d),
        };
      });
    });
    return grouped;
  }, [instanceList, weekStart, splitLocations, splitView]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary text-sm">+ Add Class</button>
      </div>

      <AddClassModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <EditClassModal isOpen={!!editingClass} onClose={() => setEditingClass(null)} classData={editingClass} />
      <CheckInModal isOpen={!!checkInClass} onClose={() => setCheckInClass(null)} classInstance={checkInClass} />
      <ConfirmDialog isOpen={!!deletingClass} onClose={() => setDeletingClass(null)} onConfirm={() => deleteClass.mutate(deletingClass.id)} title="Delete Class" message={`Delete ${deletingClass?.name}?`} confirmText="Delete" type="danger" />
      {detailInstance && detailInstance.id && <InstanceDrawer instance={detailInstance} onClose={() => setDetailInstance(null)}
        onCancel={(reason, notify) => cancelInstance.mutate({ id: detailInstance.id, reason, notify })}
        onCheckIn={() => { setCheckInClass(detailInstance); setDetailInstance(null); }}
        onEdit={() => { setEditingClass(detailInstance); setDetailInstance(null); }} />}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatBox label="Classes This Week" value={instanceList.length} />
        <StatBox label="Total Bookings" value={totalBookings} />
        <StatBox label="Avg Fill" value={`${avgFill}%`} />
      </div>

      {/* NLP Scheduler */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <NlpScheduler />
      </div>

      {/* Week nav + filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="px-2 py-1 border rounded text-sm hover:bg-gray-50" aria-label="Previous week">◀</button>
            <span className="text-sm font-semibold flex-1 text-center">{format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}</span>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="px-2 py-1 border rounded text-sm hover:bg-gray-50" aria-label="Next week">▶</button>
            <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="text-xs text-red-600 hover:underline whitespace-nowrap">This Week</button>
          </div>
          {!splitView && (
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="input text-sm" aria-label="Filter by location">
              <option value="">All Locations</option><option value="rockingham">Rockingham</option><option value="bibra_lake">Bibra Lake</option>
            </select>
          )}
          <button
            onClick={() => setSplitView(v => !v)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${
              splitView ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {splitView ? 'Single View' : 'All Locations'}
          </button>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input text-sm" aria-label="Filter by type">
            <option value="">All Types</option><option value="bjj">BJJ</option><option value="muay_thai">Muay Thai</option><option value="mma">MMA</option><option value="boxing">Boxing</option><option value="fitness">Fitness</option><option value="kids">Kids</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {isError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
          <p className="text-red-700 text-sm mb-3">Failed to load classes</p>
          <button onClick={refetch} className="text-sm text-red-600 underline hover:no-underline">Try again</button>
        </div>
      ) : isLoading ? (
        <div className={`grid gap-4 ${splitView ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
          {splitView
            ? splitLocations.map(loc => <div key={loc.id} className="bg-white rounded-lg shadow animate-pulse p-4"><div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-lg mb-2"></div>)}</div>)
            : DAYS.map(day => <SkeletonDay key={day} />)}
        </div>
      ) : splitView ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {splitLocations.map(loc => (
            <div key={loc.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 sticky top-0 z-10">
                <h3 className="font-semibold text-gray-900 text-sm">{loc.name}</h3>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
                {DAYS.map(day => {
                  const dd = instancesByLocation[loc.id]?.[day];
                  if (!dd) return null;
                  return (
                    <div key={day} className="border-b border-gray-100 last:border-b-0">
                      <div className="px-4 py-2 bg-gray-50/50 flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">{day}</span>
                        <span className="text-xs text-gray-500">{dd.displayDate}</span>
                      </div>
                      <div className="p-2 space-y-2">
                        {dd.instances.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-2">No classes</p>
                        ) : dd.instances.map(inst => (
                          <ClassCard key={inst.id} instance={inst}
                            onClick={() => setDetailInstance(inst)}
                            onEdit={() => setEditingClass(inst)}
                            onDelete={() => setDeletingClass(inst)}
                            onCheckIn={() => setCheckInClass(inst)}
                            onDuplicate={() => duplicateClass.mutate(inst.id)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {DAYS.map(day => {
            const dd = instancesByDay[day];
            return (
              <div key={day} className="bg-white rounded-lg shadow">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 text-sm">{day}</h3>
                  <p className="text-xs text-gray-500">{dd.displayDate}</p>
                </div>
                <div className="p-3 space-y-2">
                  {dd.instances.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No classes</p>
                  ) : dd.instances.map(inst => (
                    <ClassCard key={inst.id} instance={inst}
                      onClick={() => setDetailInstance(inst)}
                      onEdit={() => setEditingClass(inst)}
                      onDelete={() => setDeletingClass(inst)}
                      onCheckIn={() => setCheckInClass(inst)}
                      onDuplicate={() => duplicateClass.mutate(inst.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }) {
  return <div className="bg-white rounded-lg shadow p-3 text-center"><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-gray-900">{value}</p></div>;
}

function SkeletonDay() {
  return (
    <div className="bg-white rounded-lg shadow animate-pulse">
      <div className="px-4 py-3 border-b border-gray-200"><div className="h-4 bg-gray-200 rounded w-20 mb-1"></div><div className="h-3 bg-gray-200 rounded w-16"></div></div>
      <div className="p-3 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-lg"></div>)}</div>
    </div>
  );
}

function ClassCard({ instance, onClick, onEdit, onDelete, onCheckIn, onDuplicate }) {
  const fillPct = instance.capacity ? Math.min(100, (instance.booked_count / instance.capacity) * 100) : 0;
  const fillColor = instance.status === 'cancelled' ? 'bg-gray-300' : fillPct >= 90 ? 'bg-red-500' : fillPct >= 80 ? 'bg-yellow-500' : fillPct >= 50 ? 'bg-blue-500' : 'bg-green-500';
  return (
    <ContextMenu items={[
      { label: 'View Details', icon: '🔍', onClick: onClick },
      { label: 'Mark Attendance', icon: '✓', onClick: onCheckIn, disabled: instance.status === 'cancelled' },
      { label: 'Edit Class', icon: '✏️', onClick: onEdit },
      { separator: true },
      { label: 'Cancel This Class', icon: '❌', onClick: onClick, disabled: instance.status === 'cancelled' },
      { label: 'Duplicate Class', icon: '📋', onClick: () => onDuplicate(instance.id) },
      { separator: true },
      { label: 'Delete Class', icon: '🗑️', destructive: true, onClick: onDelete },
    ]}>
      <div onClick={onClick} className={`border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer relative group ${instance.status === 'cancelled' ? 'opacity-60 bg-gray-50' : 'border-gray-200'}`}
        role="button" tabIndex={0} aria-label={`${instance.class_name}, ${instance.start_time}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}>
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 text-sm truncate">{instance.class_name}</p><p className="text-xs text-gray-500">{instance.start_time}{instance.end_time ? ` - ${instance.end_time}` : ''}</p></div>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${TYPE_COLORS[instance.class_type] || 'bg-gray-100 text-gray-600'}`}>{instance.class_type?.toUpperCase() || 'CLASS'}</span>
        </div>
        {instance.coach_name && <p className="text-xs text-gray-600 mb-1.5">{instance.coach_name}</p>}
        {instance.min_belt && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 mr-1">Min {instance.min_belt}</span>}
        {instance.fighter_only === 1 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Fighters Only</span>}
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 bg-gray-200 rounded-full h-1.5" role="progressbar" aria-valuenow={instance.booked_count} aria-valuemin={0} aria-valuemax={instance.capacity}>
            <div className={`${fillColor} h-1.5 rounded-full`} style={{ width: `${fillPct}%` }}></div>
          </div>
          <span className="text-xs text-gray-600">{instance.booked_count}/{instance.capacity}</span>
        </div>
        {instance.status === 'cancelled' && <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 mt-1">Cancelled</span>}
        {instance.waitlist_count > 0 && <span className="text-xs text-orange-600 font-medium mt-1 block">⚠ {instance.waitlist_count} on waitlist</span>}
      </div>
    </ContextMenu>
  );
}

function InstanceDrawer({ instance, onClose, onCancel, onCheckIn, onEdit }) {
  const drawerRef = useRef(null);
  useEscapeKey(onClose);
  useFocusTrap(drawerRef, true);

  const { data: roster } = useQuery({
    queryKey: ['class-roster', instance.id],
    queryFn: async () => { const r = await api.get(`/api/classes/instances/${instance.id}/roster`); return r.data; },
    enabled: !!instance.id,
    staleTime: 10000,
  });

  const rosterData = Array.isArray(roster) ? roster : [];
  const bookings = rosterData.filter(b => !b.waitlist);
  const waitlisted = rosterData.filter(b => b.waitlist);

  const [notesText, setNotesText] = useState(instance.class_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const saveNotes = async () => {
    setSavingNotes(true);
    try { await api.put(`/api/classes/instances/${instance.id}`, { class_notes: notesText }); } catch (e) { console.error('Failed to save notes', e); }
    setSavingNotes(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div ref={drawerRef} className="w-full max-w-md bg-white shadow-xl h-full overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Class details: ${instance.class_name}`}>
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{instance.class_name}</h2>
            <p className="text-xs text-gray-500">{instance.date} · {instance.start_time}{instance.end_time ? ` - ${instance.end_time}` : ''}</p>
            {instance.location && <p className="text-xs text-gray-500 capitalize">{instance.location.replace(/_/g, ' ')}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl" aria-label="Close">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          <dl className="space-y-1 text-sm">
            {instance.coach_name && <div><dt className="text-gray-500 inline">Coach:</dt><dd className="inline ml-1">{instance.coach_name}</dd></div>}
            <div><dt className="text-gray-500 inline">Capacity:</dt><dd className="inline ml-1">{instance.booked_count}/{instance.capacity}</dd></div>
            {instance.min_belt && <div><dt className="text-gray-500 inline">Min Belt:</dt><dd className="inline ml-1 capitalize">{instance.min_belt}</dd></div>}
            {instance.fighter_only === 1 && <div><dt className="text-gray-500 inline">Type:</dt><dd className="inline ml-1 text-purple-700">Fighters Only</dd></div>}
          </dl>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Class Notes</h3>
            <textarea value={notesText} onChange={e => setNotesText(e.target.value)}
              className="input text-sm w-full" rows={3}
              placeholder="Add notes about this class session (visible to coaches only)..." />
            <button type="button" onClick={saveNotes} disabled={savingNotes}
              className="btn-primary text-xs mt-1">{savingNotes ? 'Saving...' : 'Save Notes'}</button>
          </section>

          <div className="flex gap-2 pt-2">
            {instance.status !== 'cancelled' && <button onClick={onCheckIn} className="btn-primary text-xs flex-1">Mark Attendance</button>}
            <button onClick={onEdit} className="btn-outline text-xs">Edit</button>
          </div>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Roster ({bookings.length})</h3>
            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-gray-100">
              {bookings.length === 0 ? <p className="text-xs text-gray-500 text-center py-4">No bookings yet</p> :
              bookings.map(b => (
                <div key={b.id} className="px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-gray-900">{b.member_name}</span>
                  <div className="flex items-center gap-1">
                    {b.status === 'attended' && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded">✓</span>}
                    {b.waitlist > 0 && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 rounded">WL #{b.waitlist_position}</span>}
                    {b.is_trial && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded">Trial</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {waitlisted.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Waitlist ({waitlisted.length})</h3>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {waitlisted.map(w => (
                  <div key={w.id} className="px-3 py-2 text-sm text-gray-700 flex justify-between">
                    <span>{w.member_name}</span>
                    <span className="text-xs text-gray-400">#{w.waitlist_position}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {instance.status !== 'cancelled' && (
            <section className="border-t pt-4">
              <h3 className="text-sm font-semibold text-red-600 mb-2">Cancel This Class</h3>
              <CancelForm instance={instance} onCancel={onCancel} />
            </section>
          )}
          {instance.status === 'cancelled' && instance.cancellation_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">Cancelled: {instance.cancellation_reason}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CancelForm({ instance, onCancel }) {
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  return (
    <div className="space-y-2">
      <input type="text" placeholder="Reason for cancellation" value={reason} onChange={e => setReason(e.target.value)} className="input text-sm w-full" aria-label="Cancellation reason" />
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
        Notify booked members via SMS/email
      </label>
      <button type="button" disabled={!reason.trim()} onClick={() => onCancel(reason, notify)}
        className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-700 disabled:opacity-40">Confirm Cancellation</button>
    </div>
  );
}
