// Calendar Page - Visual Schedule Management
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { PageLoader } from '../components/Shared/Spinner';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day
  const [selectedDate, setSelectedDate] = useState(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const { data: events = [], isLoading } = useQuery({
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
  });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const getEventsForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(event => event.date === dayStr);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        <div className="flex gap-3">
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="input"
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex items-center justify-between">
          <button onClick={previousMonth} className="btn btn-secondary">
            ◀ Previous
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button onClick={today} className="text-sm text-blue-600 hover:underline">
              Today
            </button>
          </div>
          <button onClick={nextMonth} className="btn btn-secondary">
            Next ▶
          </button>
        </div>
      </div>

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
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={index}
                onClick={() => setSelectedDate(day)}
                className={`min-h-32 border-r border-b border-gray-200 p-2 cursor-pointer hover:bg-gray-50 ${
                  !isCurrentMonth ? 'bg-gray-50' : ''
                } ${isSelected ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-sm font-medium ${
                      !isCurrentMonth
                        ? 'text-gray-400'
                        : isToday
                        ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center'
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
                  {dayEvents.slice(0, 3).map((event) => (
                    <CalendarEvent key={event.id} event={event} compact />
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{dayEvents.length - 3} more
                    </p>
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
