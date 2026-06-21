import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { PageLoader } from '../components/Shared/Spinner';
import { useNotifications } from '../contexts/NotificationContext';

const DOT = {
  class: 'bg-blue-500',
  event: 'bg-green-500',
  private: 'bg-purple-500',
  maintenance: 'bg-gray-400',
};

export default function Calendar() {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAllDays, setShowAllDays] = useState(new Set());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const [eventForm, setEventForm] = useState({ title: '', type: 'class', date: format(new Date(), 'yyyy-MM-dd'), start_time: '09:00', end_time: '10:00', description: '', repeat: 'none', repeatEndAfter: 1 });

  const { data: events = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['calendar-events', format(monthStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await api.get('/api/calendar/events', {
        params: {
          start_date: format(calendarStart, 'yyyy-MM-dd'),
          end_date: format(calendarEnd, 'yyyy-MM-dd'),
        }
      });
      return response.data;
    },
    staleTime: 10000,
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      const { repeat, repeatEndAfter, ...eventData } = eventForm;
      if (repeat === 'none') return api.post('/api/calendar/events', eventData);
      const count = parseInt(repeatEndAfter, 10) || 1;
      const promises = [];
      for (let i = 0; i < count; i++) {
        const d = new Date(eventForm.date);
        if (repeat === 'daily') d.setDate(d.getDate() + i);
        else if (repeat === 'weekly') d.setDate(d.getDate() + i * 7);
        else if (repeat === 'monthly') d.setMonth(d.getMonth() + i);
        promises.push(api.post('/api/calendar/events', { ...eventData, date: format(d, 'yyyy-MM-dd') }));
      }
      return Promise.all(promises);
    },
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['calendar-events'] }); setShowAddEvent(false); setEventForm({ title: '', type: 'class', date: format(new Date(), 'yyyy-MM-dd'), start_time: '09:00', end_time: '10:00', description: '', repeat: 'none', repeatEndAfter: 1 }); success(Array.isArray(res) ? `${res.length} events created` : 'Event created'); },
    onError: (err) => error(err?.response?.data?.error || 'Failed to create event'),
  });

  const toggleShowAll = (dayStr) => {
    setShowAllDays(prev => {
      const next = new Set(prev);
      if (next.has(dayStr)) next.delete(dayStr); else next.add(dayStr);
      return next;
    });
  };

  const days = view === 'week'
    ? eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) })
    : eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previous = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };
  const next = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const today = () => setCurrentDate(new Date());

  const getEventsForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(event => event.date === dayStr);
  };

  const resetForm = () => setEventForm({ title: '', type: 'class', date: format(new Date(), 'yyyy-MM-dd'), start_time: '09:00', end_time: '10:00', description: '', repeat: 'none', repeatEndAfter: 1 });

  if (isLoading) return <PageLoader />;

  if (isError) return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-sm" role="alert">
        <p className="text-red-700 text-sm font-medium mb-3">Failed to load calendar events</p>
        <button type="button" onClick={refetch} className="text-sm text-red-600 underline hover:no-underline">Try again</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Schedule</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Class & event calendar</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowAddEvent(true)} className="btn-primary text-xs px-3 py-1.5">+ Add Event</button>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {['month', 'week', 'day'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 border-b border-gray-100">
          <button type="button" onClick={previous}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="text-center">
            <h2 className="text-lg font-extrabold tracking-tight text-gray-900">
              {view === 'day' ? format(currentDate, 'EEEE, MMMM d, yyyy') :
               view === 'week' ? `${format(startOfWeek(currentDate), 'MMM d')} \u2013 ${format(endOfWeek(currentDate), 'MMM d, yyyy')}` :
               format(currentDate, 'MMMM yyyy')}
            </h2>
            <button type="button" onClick={today} className="text-[11px] font-semibold text-red-600 hover:text-red-700 transition-colors">Today</button>
          </div>
          <button type="button" onClick={next}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Calendar grid / day view */}
        {view === 'day' ? (
          <div className="p-5">
            <DaySchedule events={getEventsForDay(currentDate)} />
          </div>
        ) : (<>
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => (
              <div key={day} className="py-3 text-center text-[11px] font-semibold tracking-[0.1em] uppercase text-gray-400">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  onClick={() => setSelectedDate(day)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDate(day); } }}
                  className={`min-h-[90px] border-r border-b border-gray-100 p-2 cursor-pointer transition-colors duration-150
                    ${!isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'}
                    ${isSelected ? 'bg-red-50/70' : 'hover:bg-gray-50'}
                    ${isToday ? 'ring-2 ring-amber-400/60 ring-inset' : ''}
                    ${dayEvents.length === 0 ? 'opacity-80' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold leading-none
                      ${!isCurrentMonth ? 'text-gray-300' :
                        isToday ? 'bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm' :
                        'text-gray-900'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full leading-none">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, showAllDays.has(format(day, 'yyyy-MM-dd')) ? undefined : 4).map((event) => (
                      <CalendarEvent key={event.id} event={event} compact />
                    ))}
                    {dayEvents.length > 4 && (
                      <button onClick={(e) => { e.stopPropagation(); toggleShowAll(format(day, 'yyyy-MM-dd')); }}
                        className="text-[10px] font-medium text-red-600 hover:text-red-700 w-full text-left transition-colors">
                        {showAllDays.has(format(day, 'yyyy-MM-dd')) ? '\u2013 less' : `+${dayEvents.length - 4} more`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

        {/* Selected Day Details */}
        {selectedDate && view !== 'day' && (
          <div className="border-t border-gray-100 p-5 bg-gray-50/30">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-1 h-5 bg-red-500 rounded-full flex-shrink-0" />
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h3>
            </div>
            <DaySchedule events={getEventsForDay(selectedDate)} />
          </div>
        )}

        {/* Add Event Modal */}
        {showAddEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => { setShowAddEvent(false); resetForm(); }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md zoom-in-95"
              onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-event-title">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="w-1 h-5 bg-red-500 rounded-full flex-shrink-0" />
                <h2 id="add-event-title" className="text-base font-bold text-gray-900 tracking-tight">Add Event</h2>
              </div>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                  <input type="text" value={eventForm.title} onChange={e => setEventForm(p => ({...p, title: e.target.value}))} className="input text-sm w-full" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                    <select value={eventForm.type} onChange={e => setEventForm(p => ({...p, type: e.target.value}))} className="input text-sm w-full">
                      <option value="class">Class</option><option value="event">Event</option><option value="private">Private</option><option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                    <input type="date" value={eventForm.date} onChange={e => setEventForm(p => ({...p, date: e.target.value}))} className="input text-sm w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start</label>
                    <input type="time" value={eventForm.start_time} onChange={e => setEventForm(p => ({...p, start_time: e.target.value}))} className="input text-sm w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">End</label>
                    <input type="time" value={eventForm.end_time} onChange={e => setEventForm(p => ({...p, end_time: e.target.value}))} className="input text-sm w-full" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                  <textarea rows={3} value={eventForm.description} onChange={e => setEventForm(p => ({...p, description: e.target.value}))} className="input text-sm w-full" />
                </div>
                <div className="border-t border-gray-100 pt-3.5">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Repeat</label>
                  <div className="flex gap-4">
                    {['none', 'daily', 'weekly', 'monthly'].map(r => (
                      <label key={r} className="flex items-center gap-1.5 text-xs cursor-pointer text-gray-700">
                        <input type="radio" name="repeat" value={r} checked={eventForm.repeat === r}
                          onChange={e => setEventForm(p => ({...p, repeat: e.target.value}))}
                          className="text-red-600 focus:ring-red-500" />
                        {r === 'none' ? 'No Repeat' : r.charAt(0).toUpperCase() + r.slice(1)}
                      </label>
                    ))}
                  </div>
                  {eventForm.repeat !== 'none' && (
                    <div className="mt-2.5">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">End After (occurrences)</label>
                      <input type="number" value={eventForm.repeatEndAfter} min="1" max="365"
                        onChange={e => setEventForm(p => ({...p, repeatEndAfter: e.target.value}))}
                        className="input text-sm w-32" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => { setShowAddEvent(false); resetForm(); }} className="btn-outline text-sm">Cancel</button>
                <button onClick={createEvent.mutate} disabled={!eventForm.title || createEvent.isPending} className="btn-primary text-sm">{createEvent.isPending ? 'Creating...' : 'Create Event'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarEvent({ event, compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 truncate">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT[event.type] || DOT.class}`} />
        <span className="text-[11px] text-gray-600 truncate leading-tight">
          <span className="font-medium text-gray-700">{event.start_time}</span> {event.title}
        </span>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT[event.type] || DOT.class}`} />
            <h4 className="font-semibold text-gray-900 text-sm truncate">{event.title}</h4>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider flex-shrink-0">{event.type}</span>
          </div>
          <p className="text-xs text-gray-500">{event.start_time} – {event.end_time}</p>
          {(event.instructor || event.location) && (
            <p className="text-[11px] text-gray-400 mt-1">
              {event.instructor && `Coach: ${event.instructor}`}
              {event.instructor && event.location && ' \u00B7 '}
              {event.location}
            </p>
          )}
        </div>
        {event.capacity && (
          <div className="flex-shrink-0 text-right">
            <p className="text-xs font-bold text-gray-900">{event.booked}/{event.capacity}</p>
            <div className="w-12 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{width: `${Math.min((event.booked/event.capacity)*100, 100)}%`, backgroundColor: event.booked/event.capacity >= 0.9 ? '#DC2626' : '#22C55E'}} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DaySchedule({ events }) {
  if (events.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-8">No classes or events scheduled</p>
    );
  }

  const sortedEvents = [...events].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="space-y-2.5">
      {sortedEvents.map((event) => (
        <CalendarEvent key={event.id} event={event} />
      ))}
    </div>
  );
}
