// Edit Class Modal Component
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../Shared/Modal';
import api from '../../lib/api';

export default function EditClassModal({ isOpen, onClose, classData }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructor: '',
    location: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    max_capacity: '',
    class_type: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (classData) {
      // Initialize form with class data
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    onError: (error) => {
      console.error('Error updating class:', error);
      setErrors({ submit: 'Failed to update class. Please try again.' });
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

    if (!formData.name.trim()) newErrors.name = 'Class name is required';
    if (!formData.instructor.trim()) newErrors.instructor = 'Instructor is required';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.day_of_week) newErrors.day_of_week = 'Day of week is required';
    if (!formData.start_time) newErrors.start_time = 'Start time is required';
    if (!formData.end_time) newErrors.end_time = 'End time is required';
    if (!formData.class_type) newErrors.class_type = 'Class type is required';

    if (formData.max_capacity && parseInt(formData.max_capacity) < 1) {
      newErrors.max_capacity = 'Capacity must be at least 1';
    }

    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      newErrors.end_time = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
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

        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="e.g., BJJ Fundamentals"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="input"
                placeholder="Brief description of the class..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Type *
                </label>
                <select
                  name="class_type"
                  value={formData.class_type}
                  onChange={handleChange}
                  className={`input ${errors.class_type ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Type</option>
                  <option value="bjj">Brazilian Jiu-Jitsu</option>
                  <option value="muay_thai">Muay Thai</option>
                  <option value="mma">MMA</option>
                  <option value="boxing">Boxing</option>
                  <option value="wrestling">Wrestling</option>
                  <option value="fitness">Fitness</option>
                  <option value="kids">Kids Class</option>
                </select>
                {errors.class_type && (
                  <p className="text-red-500 text-sm mt-1">{errors.class_type}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructor *
                </label>
                <input
                  type="text"
                  name="instructor"
                  value={formData.instructor}
                  onChange={handleChange}
                  className={`input ${errors.instructor ? 'border-red-500' : ''}`}
                  placeholder="Instructor name"
                />
                {errors.instructor && (
                  <p className="text-red-500 text-sm mt-1">{errors.instructor}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Schedule</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day of Week *
              </label>
              <select
                name="day_of_week"
                value={formData.day_of_week}
                onChange={handleChange}
                className={`input ${errors.day_of_week ? 'border-red-500' : ''}`}
              >
                <option value="">Select Day</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
              {errors.day_of_week && (
                <p className="text-red-500 text-sm mt-1">{errors.day_of_week}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <select
                name="location"
                value={formData.location}
                onChange={handleChange}
                className={`input ${errors.location ? 'border-red-500' : ''}`}
              >
                <option value="">Select Location</option>
                <option value="burleigh_heads">Burleigh Heads</option>
                <option value="varsity_lakes">Varsity Lakes</option>
              </select>
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className={`input ${errors.start_time ? 'border-red-500' : ''}`}
              />
              {errors.start_time && (
                <p className="text-red-500 text-sm mt-1">{errors.start_time}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time *
              </label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                className={`input ${errors.end_time ? 'border-red-500' : ''}`}
              />
              {errors.end_time && (
                <p className="text-red-500 text-sm mt-1">{errors.end_time}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Capacity
              </label>
              <input
                type="number"
                name="max_capacity"
                value={formData.max_capacity}
                onChange={handleChange}
                className={`input ${errors.max_capacity ? 'border-red-500' : ''}`}
                placeholder="Leave empty for unlimited"
                min="1"
              />
              {errors.max_capacity && (
                <p className="text-red-500 text-sm mt-1">{errors.max_capacity}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={updateClass.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={updateClass.isPending}
          >
            {updateClass.isPending ? 'Updating...' : 'Update Class'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
