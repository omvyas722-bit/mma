// Add Class Modal Component
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../Shared/Modal';
import api from '../../lib/api';
import { ClassFormFields, initialClassForm, validateClassForm } from './ClassFormFields';

export default function AddClassModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(initialClassForm);
  const [errors, setErrors] = useState({});

  const createClass = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/api/classes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      onClose();
      setFormData(initialClassForm);
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
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      createClass.mutate({
        ...formData,
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

        <ClassFormFields formData={formData} errors={errors} handleChange={handleChange} />

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
