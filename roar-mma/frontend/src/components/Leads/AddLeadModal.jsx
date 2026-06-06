// Add Lead Form Component
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Modal } from '../Modal';
import { initialLeadForm, validateLeadForm, LeadNameFields, LeadContactFields, LeadSourceFields, LeadNotesFields, LeadUtmFields } from './LeadFormFields';

export default function AddLeadModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(initialLeadForm);
  const [errors, setErrors] = useState({});

  const createLead = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/api/leads', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['dashboard']);
      onClose();
      setFormData(initialLeadForm);
      setErrors({});
    },
    onError: (err) => {
      if (err.response?.data?.error) {
        setErrors({ submit: err.response.data.error });
      } else {
        setErrors({ submit: 'Failed to create lead. Please try again.' });
      }
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateLeadForm(formData);
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      createLead.mutate(formData);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Lead" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <LeadNameFields formData={formData} errors={errors} handleChange={handleChange} />

        <LeadContactFields formData={formData} errors={errors} handleChange={handleChange} showEmail />

        <LeadSourceFields formData={formData} handleChange={handleChange} />

        <LeadNotesFields formData={formData} handleChange={handleChange} />
        <LeadUtmFields formData={formData} handleChange={handleChange} />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={createLead.isPending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={createLead.isPending}>
            {createLead.isPending ? 'Creating...' : 'Create Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
