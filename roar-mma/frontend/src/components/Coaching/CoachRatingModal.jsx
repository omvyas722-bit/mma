import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Modal from '../Modal';
import { useNotifications } from '../../contexts/NotificationContext';

const defaultForm = { defense: '', stance: '', offense: '', practice_quality: '', notes: '' };

export default function CoachRatingModal({ isOpen, onClose, member }) {
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotifications();
  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    if (isOpen) setFormData(defaultForm);
  }, [isOpen]);

  const createRating = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/api/coaching/${member.id}/ratings`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching-ratings', member.id] });
      queryClient.invalidateQueries({ queryKey: ['coaching-insights', member.id] });
      success('Rating saved! AI will analyze this in the next daily cycle.');
      onClose();
    },
    onError: (err) => {
      showError(err.response?.data?.error || 'Failed to save rating');
    }
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {};
    if (formData.defense) payload.defense = parseInt(formData.defense, 10);
    if (formData.stance) payload.stance = parseInt(formData.stance, 10);
    if (formData.offense) payload.offense = parseInt(formData.offense, 10);
    if (formData.practice_quality) payload.practice_quality = parseInt(formData.practice_quality, 10);
    if (formData.notes.trim()) payload.notes = formData.notes.trim();
    if (!payload.defense && !payload.stance && !payload.offense && !payload.practice_quality && !payload.notes) return;
    try { createRating.mutate(payload); }
    catch (e) { showError('Failed to save rating: ' + (e.message || 'Unknown error')); }
  }

  const ratingFields = [
    { key: 'defense', label: 'Defense', desc: 'Guard, blocking, takedown defense' },
    { key: 'stance', label: 'Stance', desc: 'Footwork, balance, positioning' },
    { key: 'offense', label: 'Offense', desc: 'Striking, submissions, takedowns' },
    { key: 'practice_quality', label: 'Practice Quality', desc: 'Effort, focus, coachability' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Rate ${member?.first_name} ${member?.last_name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-gray-500">Rate each area from 1 (needs work) to 10 (excellent). Leave blank if not evaluated today.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ratingFields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <div className="flex items-center gap-3">
                <input type="range" name={field.key} min="1" max="10" value={formData[field.key]}
                  onChange={handleChange} className="flex-1 accent-red-600" />
                <span className="text-sm font-semibold text-gray-700 w-6 text-center">
                  {formData[field.key] || '-'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{field.desc}</p>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Coach Notes</label>
          <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange}
            placeholder="How did they practice today? Any specific observations..."
            className="input" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={createRating.isPending}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={createRating.isPending}>
            {createRating.isPending ? 'Saving...' : 'Save Rating'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
