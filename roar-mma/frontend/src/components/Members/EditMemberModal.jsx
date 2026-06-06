// Edit Member Modal Component
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../Modal';
import api from '../../lib/api';
import { PersonalInfoFields, EmergencyContactFields, MedicalGoalsFields } from './MemberFormFields';
import { useOptions, optionLabel } from '../../lib/useOptions';

const initialForm = {
  first_name: '', last_name: '', email: '', phone: '', date_of_birth: '',
  gender: '', address: '', suburb: '', postcode: '',
  membership_type: '', membership_status: '', belt_rank: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  medical_conditions: '', goals: '', parent_id: '',
};

export default function EditMemberModal({ isOpen, onClose, member }) {
  const queryClient = useQueryClient();
  const { data: options } = useOptions();
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (member) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        email: member.email || '',
        phone: member.phone || '',
        date_of_birth: member.date_of_birth || '',
        gender: member.gender || '',
        address: member.address || '',
        suburb: member.suburb || '',
        postcode: member.postcode || '',
        membership_type: member.membership_type || '',
        membership_status: member.membership_status || '',
        belt_rank: member.belt_rank || '',
        emergency_contact_name: member.emergency_contact_name || '',
        emergency_contact_phone: member.emergency_contact_phone || '',
        medical_conditions: member.medical_conditions || '',
        goals: member.goals || '',
        parent_id: member.parent_id || '',
      });
    }
  }, [member]);

  const updateMember = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/api/members/${member.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['members']);
      queryClient.invalidateQueries(['member', member.id]);
      queryClient.invalidateQueries(['dashboard']);
      onClose();
    },
    onError: () => {
      setErrors({ submit: 'Failed to update member. Please try again.' });
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.membership_type) newErrors.membership_type = 'Membership type is required';
    if (!formData.membership_status) newErrors.membership_status = 'Membership status is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) updateMember.mutate(formData);
  };

  if (!member) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Member" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <PersonalInfoFields formData={formData} errors={errors} handleChange={handleChange} />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="input">
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Address</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suburb</label>
                <input type="text" name="suburb" value={formData.suburb} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                <input type="text" name="postcode" value={formData.postcode} onChange={handleChange} className="input" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Membership Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Linked Parent (ID)</label>
              <input type="number" name="parent_id" value={formData.parent_id || ''} onChange={handleChange} className="input" placeholder="Member ID to link as family" />
              <p className="text-xs text-gray-400 mt-0.5">Enter parent member ID for family discount linking</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Membership Type *</label>
              <select name="membership_type" value={formData.membership_type} onChange={handleChange}
                className={`input ${errors.membership_type ? 'border-red-500' : ''}`}>
                <option value="">Select Type</option>
                {(options?.plans || []).map(v => (
                  <option key={v} value={v}>{optionLabel(v)}</option>
                ))}
              </select>
              {errors.membership_type && <p className="text-red-500 text-sm mt-1">{errors.membership_type}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Membership Status *</label>
              <select name="membership_status" value={formData.membership_status} onChange={handleChange}
                className={`input ${errors.membership_status ? 'border-red-500' : ''}`}>
                <option value="">Select Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {errors.membership_status && <p className="text-red-500 text-sm mt-1">{errors.membership_status}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Belt Rank</label>
              <select name="belt_rank" value={formData.belt_rank} onChange={handleChange} className="input">
                <option value="">Select Rank</option>
                {(options?.belt_levels || []).map(v => (
                  <option key={v} value={v}>{optionLabel(v)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
          <EmergencyContactFields formData={formData} handleChange={handleChange} />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Medical & Goals</h3>
          <MedicalGoalsFields formData={formData} handleChange={handleChange} />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={updateMember.isPending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={updateMember.isPending}>
            {updateMember.isPending ? 'Updating...' : 'Update Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
