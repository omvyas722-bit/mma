// Add Member Form Component
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Modal from '../Shared/Modal';
import { PersonalInfoFields, EmergencyContactFields, MedicalGoalsFields } from './MemberFormFields';

const initialForm = {
  first_name: '', last_name: '', email: '', phone: '', date_of_birth: '',
  location: 'rockingham', status: 'trial', plan: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  medical_conditions: '', injuries: '', goals: '', experience_level: 'beginner',
};

export default function AddMemberModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const createMember = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/api/members', {
        ...data,
        joined_date: new Date().toISOString().split('T')[0],
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['members']);
      queryClient.invalidateQueries(['dashboard']);
      onClose();
      setFormData(initialForm);
      setErrors({});
    },
    onError: (error) => {
      if (error.response?.data?.error) {
        setErrors({ submit: error.response.data.error });
      }
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  function validate() {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.location) newErrors.location = 'Location is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (validate()) createMember.mutate(formData);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Member" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h4>
          <PersonalInfoFields formData={formData} errors={errors} handleChange={handleChange} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
              <select name="experience_level" value={formData.experience_level} onChange={handleChange} className="input">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Membership Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <select name="location" value={formData.location} onChange={handleChange} className="input">
                <option value="rockingham">Rockingham</option>
                <option value="bibra_lake">Bibra Lake</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="input">
                <option value="trial">Trial</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select name="plan" value={formData.plan} onChange={handleChange} className="input">
                <option value="">Select Plan</option>
                <option value="unlimited">Unlimited</option>
                <option value="2x_week">2x per Week</option>
                <option value="3x_week">3x per Week</option>
                <option value="fighter">Fighter</option>
                <option value="pt_only">PT Only</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact</h4>
          <EmergencyContactFields formData={formData} handleChange={handleChange} />
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Medical & Goals</h4>
          <MedicalGoalsFields formData={formData} handleChange={handleChange} showInjuries />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={createMember.isPending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={createMember.isPending}>
            {createMember.isPending ? 'Creating...' : 'Create Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
