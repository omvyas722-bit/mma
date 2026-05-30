// Edit Lead Modal Component
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../Shared/Modal';
import api from '../../lib/api';
import { initialLeadForm, validateLeadForm, LeadNameFields, LeadContactFields, LeadNotesFields } from './LeadFormFields';

export default function EditLeadModal({ isOpen, onClose, lead }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(initialLeadForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (lead) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source || '',
        status: lead.status || '',
        location: lead.location_preference || '',
        interests: lead.interests || '',
        notes: lead.notes || '',
      });
    }
  }, [lead]);

  const updateLead = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/api/leads/${lead.id}`, {
        ...data,
        location_preference: data.location,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['lead', lead.id]);
      queryClient.invalidateQueries(['dashboard']);
      onClose();
    },
    onError: (err) => {
      setErrors({ submit: err.response?.data?.error || 'Failed to update lead. Please try again.' });
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateLeadForm(formData, ['source', 'status']);
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      updateLead.mutate(formData);
    }
  };

  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Lead" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
          <LeadNameFields formData={formData} errors={errors} handleChange={handleChange} />

          <div className="mt-4">
            <LeadContactFields formData={formData} errors={errors} handleChange={handleChange} showEmail />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Lead Details</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source *</label>
                <select name="source" value={formData.source} onChange={handleChange}
                  className={`input ${errors.source ? 'border-red-500' : ''}`}>
                  <option value="">Select Source</option>
                  <option value="website">Website</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="referral">Referral</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="other">Other</option>
                </select>
                {errors.source && <p className="text-red-500 text-sm mt-1">{errors.source}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select name="status" value={formData.status} onChange={handleChange}
                  className={`input ${errors.status ? 'border-red-500' : ''}`}>
                  <option value="">Select Status</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="trial_booked">Trial Booked</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
                {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Preference</label>
              <select name="location" value={formData.location} onChange={handleChange} className="input">
                <option value="">Select Location</option>
                <option value="rockingham">Rockingham</option>
                <option value="bibra_lake">Bibra Lake</option>
              </select>
            </div>

            <LeadNotesFields formData={formData} handleChange={handleChange} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={updateLead.isPending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={updateLead.isPending}>
            {updateLead.isPending ? 'Updating...' : 'Update Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
