// Edit Class Modal Component
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../Shared/Modal';
import api from '../../lib/api';
import { ClassFormFields, initialClassForm, validateClassForm } from './ClassFormFields';

export default function EditClassModal({ isOpen, onClose, classData }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(initialClassForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (classData) {
      setFormData({
        name: classData.name || '',
        description: classData.description || '',
        instructor: classData.instructor || '',
        location: classData.location || '',
        day_of_week: classData.day_of_week?.toString() || '',
        start_time: classData.start_time || '',
        end_time: classData.end_time || '',
        max_capacity: classData.max_capacity?.toString() || '',
        class_type: classData.class_type || '',
      });
    }
  }, [classData]);

  const updateClass = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/api/classes/${classData.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classes']);
      queryClient.invalidateQueries(['schedule']);
      queryClient.invalidateQueries(['class', classData.id]);
      onClose();
    },
    onError: (err) => {
      setErrors({ submit: err.response?.data?.error || 'Failed to update class. Please try again.' });
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
      updateClass.mutate({
        ...formData,
        day_of_week: parseInt(formData.day_of_week),
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
      });
    }
  };

  if (!classData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Class" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <ClassFormFields formData={formData} errors={errors} handleChange={handleChange} />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={updateClass.isPending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={updateClass.isPending}>
            {updateClass.isPending ? 'Updating...' : 'Update Class'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
