// Calendar Page - Visual Schedule Management
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { PageLoader } from '../components/Shared/Spinner';
import { useNotifications } from '../contexts/NotificationContext';

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

  if (isLoading) return <PageLoader />;

  if (isError) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
      <p className="text-red-700 text-sm mb-3">Failed to load calendar events</p>
      <button type="button" onClick={refetch} className="text-sm text-red-600 underline hover:no-underline">Try again</button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        <div className="flex gap-3">
          <button type="button" onClick={() => setShowAddEvent(true)} className="btn-primary text-sm">+ Add Event</button>
          <select value={view} onChange={(e) => setView(e.target.value)} className="input">
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={previous} className="btn btn-secondary">
            ◀ Previous
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {view === 'day' ? format(currentDate, 'EEEE, MMMM d, yyyy') :
               view === 'week' ? `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}` :
               format(currentDate, 'MMMM yyyy')}
            </h2>
            <button type="button" onClick={today} className="text-sm text-red-600 hover:underline">
              Today
            </button>
          </div>
          <button type="button" onClick={next} className="btn btn-secondary">
            Next ▶
          </button>
        </div>
      </div>

      {view === 'day' ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <DaySchedule events={getEventsForDay(currentDate)} />
        </div>
      ) : (<>
        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="px-4 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
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
                  className={`min-h-32 border-r border-b border-gray-200 p-2 cursor-pointer hover:bg-gray-50 ${
                    !isCurrentMonth ? 'bg-gray-50' : ''
                  } ${isSelected ? 'bg-red-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium ${
                        !isCurrentMonth
                          ? 'text-gray-400'
                          : isToday
                          ? 'bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center'
                          : 'text-gray-900'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {dayEvents.length} {dayEvents.length === 1 ? 'class' : 'classes'}
                      </span>
                    )}
                  </div>

                  {/* Events */}
                  <div className="space-y-1">
                    {getEventsForDay(day).slice(0, showAllDays.has(format(day, 'yyyy-MM-dd')) ? undefined : 5).map((event) => (
                      <CalendarEvent key={event.id} event={event} compact />
                    ))}
                    {getEventsForDay(day).length > 5 && (
                      <button onClick={(e) => { e.stopPropagation(); toggleShowAll(format(day, 'yyyy-MM-dd')); }} className="text-xs text-red-600 hover:underline w-full text-center">
                        {showAllDays.has(format(day, 'yyyy-MM-dd')) ? 'Show less' : `+${getEventsForDay(day).length - 5} more`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        {selectedDate && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <DaySchedule events={getEventsForDay(selectedDate)} />
          </div>
        )}

        {/* Add Event Modal */}
        {showAddEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setShowAddEvent(false); setEventForm({ title: '', type: 'class', date: format(new Date(), 'yyyy-MM-dd'), start_time: '09:00', end_time: '10:00', description: '', repeat: 'none', repeatEndAfter: 1 }); }}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-event-title">
              <h2 id="add-event-title" className="text-lg font-semibold mb-4">Add Event</h2>
              <div className="space-y-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Title</label><input type="text" value={eventForm.title} onChange={e => setEventForm(p => ({...p, title: e.target.value}))} className="input text-sm w-full" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select value={eventForm.type} onChange={e => setEventForm(p => ({...p, type: e.target.value}))} className="input text-sm w-full">
                      <option value="class">Class</option><option value="event">Event</option><option value="private">Private</option><option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Date</label><input type="date" value={eventForm.date} onChange={e => setEventForm(p => ({...p, date: e.target.value}))} className="input text-sm w-full" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Start</label><input type="time" value={eventForm.start_time} onChange={e => setEventForm(p => ({...p, start_time: e.target.value}))} className="input text-sm w-full" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">End</label><input type="time" value={eventForm.end_time} onChange={e => setEventForm(p => ({...p, end_time: e.target.value}))} className="input text-sm w-full" /></div>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Description</label><textarea rows={3} value={eventForm.description} onChange={e => setEventForm(p => ({...p, description: e.target.value}))} className="input text-sm w-full" /></div>
                <div className="border-t pt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Repeat</label>
                  <div className="flex gap-3">
                    {['none', 'daily', 'weekly', 'monthly'].map(r => (
                      <label key={r} className="flex items-center gap-1 text-xs cursor-pointer">
                        <input type="radio" name="repeat" value={r} checked={eventForm.repeat === r}
                          onChange={e => setEventForm(p => ({...p, repeat: e.target.value}))}
                          className="text-red-600 focus:ring-red-500" />
                        {r === 'none' ? 'No Repeat' : r.charAt(0).toUpperCase() + r.slice(1)}
                      </label>
                    ))}
                  </div>
                  {eventForm.repeat !== 'none' && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">End After (occurrences)</label>
                      <input type="number" value={eventForm.repeatEndAfter} min="1" max="365"
                        onChange={e => setEventForm(p => ({...p, repeatEndAfter: e.target.value}))}
                        className="input text-sm w-32" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => { setShowAddEvent(false); setEventForm({ title: '', type: 'class', date: format(new Date(), 'yyyy-MM-dd'), start_time: '09:00', end_time: '10:00', description: '', repeat: 'none', repeatEndAfter: 1 }); }} className="btn-outline text-sm">Cancel</button>
                <button onClick={createEvent.mutate} disabled={!eventForm.title || createEvent.isPending} className="btn-primary text-sm">{createEvent.isPending ? 'Creating...' : 'Create Event'}</button>
              </div>
            </div>
          </div>
        )}
      </>)}
    </div>
  );
}

function CalendarEvent({ event, compact = false }) {
  const typeColors = {
    class: 'bg-blue-100 text-blue-800 border-blue-300',
    event: 'bg-green-100 text-green-800 border-green-300',
    private: 'bg-purple-100 text-purple-800 border-purple-300',
    maintenance: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  if (compact) {
    return (
      <div
        className={`text-xs px-2 py-1 rounded border ${
          typeColors[event.type] || typeColors.class
        } truncate`}
      >
        {event.start_time} - {event.title}
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-lg border-l-4 ${
        typeColors[event.type] || typeColors.class
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{event.title}</h4>
          <p className="text-sm text-gray-600">
            {event.start_time} - {event.end_time}
          </p>
          {event.instructor && (
            <p className="text-sm text-gray-500">Instructor: {event.instructor}</p>
          )}
          {event.location && (
            <p className="text-sm text-gray-500">Location: {event.location}</p>
          )}
        </div>
        {event.capacity && (
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {event.booked}/{event.capacity}
            </p>
            <p className="text-xs text-gray-500">spots</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DaySchedule({ events }) {
  if (events.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">No classes or events scheduled</p>
    );
  }

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => {
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div className="space-y-3">
      {sortedEvents.map((event) => (
        <CalendarEvent key={event.id} event={event} />
      ))}
    </div>
  );
}
