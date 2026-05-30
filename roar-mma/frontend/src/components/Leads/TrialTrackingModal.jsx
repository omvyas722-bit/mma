// Trial Tracking Modal - Log trial session details
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../Shared/Modal';
import api from '../../lib/api';
import { useNotifications } from '../../contexts/NotificationContext';

export default function TrialTrackingModal({ isOpen, onClose, lead }) {
  const queryClient = useQueryClient();
  const { success } = useNotifications();
  const [formData, setFormData] = useState({
    trial_date: '',
    trial_class_type: '',
    trial_coach_id: '',
    trial_experience_rating: '',
    trial_interest_level: '',
    trial_notes: '',
    stage: 'trial_completed'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (lead) {
      const today = new Date().toISOString().split('T')[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        trial_date: lead.trial_date || today,
        trial_class_type: lead.trial_class_type || '',
        trial_coach_id: lead.trial_coach_id || '',
        trial_experience_rating: lead.trial_experience_rating || '',
        trial_interest_level: lead.trial_interest_level || '',
        trial_notes: lead.trial_notes || '',
        stage: 'trial_completed'
      });
    }
  }, [lead]);

  const updateTrial = useMutation({
    mutationFn: async (data) => {
      // Update lead with trial info
      await api.put(`/api/leads/${lead.id}`, data);

      // Schedule automated follow-ups
      if (data.trial_date) {
        try {
          await api.post('/api/leads/schedule-trial-followups', {
            lead_id: lead.id,
            trial_date: data.trial_date
          });
        } catch {
          // Follow-up scheduling failure is non-critical
          console.warn('Failed to schedule follow-ups, but trial data was saved');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['dashboard']);
      onClose();
      success('Trial tracked! Automated follow-ups scheduled.');
    },
    onError: (err) => {
      console.error('Error tracking trial:', err);
      setErrors({ submit: 'Failed to track trial. Please try again.' });
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.trial_date) newErrors.trial_date = 'Trial date required';
    if (!formData.trial_class_type) newErrors.trial_class_type = 'Class type required';
    if (!formData.trial_experience_rating) newErrors.trial_experience_rating = 'Rating required';
    if (!formData.trial_interest_level) newErrors.trial_interest_level = 'Interest level required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      updateTrial.mutate(formData);
    }
  };

  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Track Trial Session" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>{lead.first_name} {lead.last_name}</strong>
          </p>
          <p className="text-sm text-blue-700">{lead.phone}</p>
        </div>

        {/* Trial Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trial Date *
          </label>
          <input
            type="date"
            name="trial_date"
            value={formData.trial_date}
            onChange={handleChange}
            className={`input ${errors.trial_date ? 'border-red-500' : ''}`}
            required
          />
          {errors.trial_date && (
            <p className="text-red-500 text-sm mt-1">{errors.trial_date}</p>
          )}
        </div>

        {/* Class Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Class Type *
          </label>
          <select
            name="trial_class_type"
            value={formData.trial_class_type}
            onChange={handleChange}
            className={`input ${errors.trial_class_type ? 'border-red-500' : ''}`}
            required
          >
            <option value="">Select class type</option>
            <option value="bjj">BJJ</option>
            <option value="muay_thai">Muay Thai</option>
            <option value="mma">MMA</option>
            <option value="boxing">Boxing</option>
            <option value="other">Other</option>
          </select>
          {errors.trial_class_type && (
            <p className="text-red-500 text-sm mt-1">{errors.trial_class_type}</p>
          )}
        </div>

        {/* Experience Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How was their experience? *
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, trial_experience_rating: rating }))}
                className={`flex-1 py-3 rounded-lg border-2 transition-colors ${
                  formData.trial_experience_rating === rating
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-2xl">{rating === 1 ? '😞' : rating === 2 ? '😐' : rating === 3 ? '🙂' : rating === 4 ? '😊' : '🤩'}</div>
                <div className="text-xs mt-1">{rating}</div>
              </button>
            ))}
          </div>
          {errors.trial_experience_rating && (
            <p className="text-red-500 text-sm mt-1">{errors.trial_experience_rating}</p>
          )}
        </div>

        {/* Interest Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interest Level *
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'hot', label: 'Hot 🔥', color: 'border-red-600 bg-red-50 text-red-900' },
              { value: 'warm', label: 'Warm 👍', color: 'border-yellow-600 bg-yellow-50 text-yellow-900' },
              { value: 'cold', label: 'Cold ❄️', color: 'border-blue-600 bg-blue-50 text-blue-900' }
            ].map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, trial_interest_level: level.value }))}
                className={`py-3 rounded-lg border-2 transition-colors ${
                  formData.trial_interest_level === level.value
                    ? level.color
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
          {errors.trial_interest_level && (
            <p className="text-red-500 text-sm mt-1">{errors.trial_interest_level}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session Notes
          </label>
          <textarea
            name="trial_notes"
            value={formData.trial_notes}
            onChange={handleChange}
            rows={4}
            className="input"
            placeholder="How did they do? Any concerns? What did they enjoy?"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={updateTrial.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={updateTrial.isPending}
          >
            {updateTrial.isPending ? 'Saving...' : 'Save & Schedule Follow-ups'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
