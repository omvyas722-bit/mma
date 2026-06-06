import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { parseNaturalLanguage } from '../../lib/nlpScheduler';

export default function NlpScheduler() {
  const [input, setInput] = useState('');
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  const schedule = useMutation({
    mutationFn: async (parsed) => {
      if (parsed.recurring) {
        return api.post('/api/classes', {
          name: parsed.name || parsed.classType,
          location: parsed.location,
          day_of_week: parsed.dayOfWeek,
          start_time: parsed.time,
          class_type: parsed.classType,
        });
      }
      return api.post('/api/calendar/events', {
        title: parsed.name || parsed.classType,
        type: parsed.classType,
        date: parsed.date,
        start_time: parsed.time,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      setInput('');
      success('Class scheduled successfully!');
    },
    onError: (err) => {
      error(err?.response?.data?.error || 'Failed to schedule class');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const parsed = parseNaturalLanguage(input);

    if (!parsed.classType || !parsed.time) {
      error('Could not understand the request. Try: "BJJ every Monday at 6pm at Rockingham"');
      return;
    }

    if (!parsed.recurring && !parsed.date) {
      error('Please specify a date or use "every" for recurring classes');
      return;
    }

    if (parsed.recurring && parsed.dayOfWeek === null) {
      error('Please specify a day of the week for recurring classes');
      return;
    }

    if (!parsed.location) {
      error('Please specify a location');
      return;
    }

    schedule.mutate(parsed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder='Describe class to schedule (e.g. "BJJ every Monday at 6pm at Rockingham")'
        className="input text-sm flex-1"
        disabled={schedule.isPending}
      />
      <button type="submit" className="btn-primary text-sm whitespace-nowrap" disabled={schedule.isPending || !input.trim()}>
        {schedule.isPending ? 'Scheduling...' : 'Schedule'}
      </button>
    </form>
  );
}
