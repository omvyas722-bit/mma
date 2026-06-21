// Add Class Modal Component
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../Modal';
import api from '../../lib/api';
import { ClassFormFields, initialClassForm, validateClassForm } from './ClassFormFields';

export default function AddClassModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ ...initialClassForm, date: '' });
  const [errors, setErrors] = useState({});
  const [mode, setMode] = useState('template');

  const createClass = useMutation({
    mutationFn: async (data) => {
      if (data._mode === 'instance') {
        return await api.post('/api/calendar/events', {
          title: data.name,
          type: data.class_type,
          date: data.date,
          start_time: data.start_time,
          end_time: data.end_time,
          description: data.description,
          capacity: data.max_capacity ? parseInt(data.max_capacity, 10) : 0,
        });
      }
      return await api.post('/api/classes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      onClose();
      setFormData({ ...initialClassForm, date: '' });
      setMode('template');
      setErrors({});
    },
    onError: (err) => {
      setErrors({ submit: err.response?.data?.error || 'Failed to create class. Please try again.' });
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateClassForm(formData);
    if (mode === 'instance') {
      if (!formData.date) newErrors.date = 'Date is required for class instance';
      delete newErrors.day_of_week;
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      createClass.mutate({
        ...formData,
        _mode: mode,
        day_of_week: formData.day_of_week ? parseInt(formData.day_of_week, 10) : null,
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity, 10) : null,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Class" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="mode" value="template" checked={mode === 'template'}
              onChange={() => setMode('template')} className="text-red-600 focus:ring-red-500" />
            Create Template
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="mode" value="instance" checked={mode === 'instance'}
              onChange={() => setMode('instance')} className="text-red-600 focus:ring-red-500" />
            Create Instance
          </label>
        </div>

        <ClassFormFields formData={formData} errors={errors} handleChange={handleChange} hideDayOfWeek={mode === 'instance'} />

        {mode === 'instance' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange}
              className={`input ${errors.date ? 'border-red-500' : ''}`} />
            {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={createClass.isPending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={createClass.isPending}>
            {createClass.isPending ? 'Creating...' : 'Create Class'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
