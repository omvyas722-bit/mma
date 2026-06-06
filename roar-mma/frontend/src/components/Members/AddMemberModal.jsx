import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Modal from '../Modal';
import SignWaiverModal from '../Waivers/SignWaiverModal';
import { PersonalInfoFields, EmergencyContactFields, MedicalGoalsFields } from './MemberFormFields';
import { useOptions, optionLabel } from '../../lib/useOptions';

const STEPS = ['Personal', 'Membership', 'Waiver', 'Emergency', 'Confirm'];
const initialForm = {
  first_name: '', last_name: '', email: '', phone: '', date_of_birth: '',
  location: 'rockingham', status: 'trial', plan: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  medical_conditions: '', injuries: '', goals: '', experience_level: 'beginner',
};

export default function AddMemberModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const { data: options } = useOptions();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showSign, setShowSign] = useState(false);
  const [waiverSigned, setWaiverSigned] = useState(false);

  const { data: templatesData } = useQuery({
    queryKey: ['waiver-templates'],
    queryFn: async () => { const r = await api.get('/api/waivers/templates'); return r.data; },
  });
  const templates = templatesData?.templates || [];

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
      resetForm();
    },
    onError: (error) => {
      if (error.response?.data?.error) {
        setErrors({ submit: error.response.data.error });
      }
    },
  });

  function resetForm() {
    setFormData(initialForm);
    setErrors({});
    setStep(0);
    setWaiverSigned(false);
    onClose();
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  function validateStep(s) {
    const newErrors = {};
    if (s === 0) {
      if (!formData.first_name.trim()) newErrors.first_name = 'Required';
      if (!formData.last_name.trim()) newErrors.last_name = 'Required';
      if (!formData.email.trim()) newErrors.email = 'Required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
      if (!formData.phone.trim()) newErrors.phone = 'Required';
    }
    if (s === 1) {
      if (!formData.location) newErrors.location = 'Required';
    }
    if (s === 3) {
      if (!formData.emergency_contact_name.trim()) newErrors.emergency_contact_name = 'Required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validateStep(step)) setStep(s => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStep(s => Math.max(s - 1, 0));
  }

  function handleSubmit() {
    if (Object.keys(errors).length > 0) return;
    createMember.mutate(formData);
  }

  function renderStepIndicator() {
    return (
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
              i < step ? 'bg-green-500 text-white' : i === step ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${i === step ? 'text-red-600 font-medium' : 'text-gray-400'} hidden sm:inline`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Member" size="lg">
      {renderStepIndicator()}

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{errors.submit}</div>
      )}

      {/* Step 0: Personal Info */}
      {step === 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h4>
          <PersonalInfoFields formData={formData} errors={errors} handleChange={handleChange} />
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
            <select name="experience_level" value={formData.experience_level} onChange={handleChange} className="input">
              {(options?.experience_levels || []).map(v => (
                <option key={v} value={v}>{optionLabel(v)}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Step 1: Membership Details */}
      {step === 1 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Membership Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <select name="location" value={formData.location} onChange={handleChange} className="input">
                {(options?.locations || []).map(v => (
                  <option key={v} value={v}>{optionLabel(v)}</option>
                ))}
              </select>
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
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
                {(options?.plans || []).map(v => (
                  <option key={v} value={v}>{optionLabel(v)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Waiver Signing */}
      {step === 2 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Waiver Signing</h4>
          {templates.length === 0 ? (
            <p className="text-sm text-gray-500">No waiver templates available. An admin can create one in Waivers.</p>
          ) : (
            <div className="space-y-3">
              {templates.map(tpl => (
                <div key={tpl.id} className={`border rounded-lg p-4 ${waiverSigned ? 'bg-green-50 border-green-300' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{tpl.name}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tpl.body_text}</p>
                    </div>
                    {waiverSigned ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Signed</span>
                    ) : (
                      <button type="button" onClick={() => setShowSign(true)} className="text-sm text-red-600 hover:underline">Sign Now</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Emergency & Medical */}
      {step === 3 && (
        <div>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact</h4>
            <EmergencyContactFields formData={formData} handleChange={handleChange} />
            {errors.emergency_contact_name && <p className="text-red-500 text-xs mt-1">Emergency contact name is required</p>}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Medical & Goals</h4>
            <MedicalGoalsFields formData={formData} handleChange={handleChange} showInjuries />
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Review & Confirm</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <p><span className="font-medium text-gray-700">Name:</span> {formData.first_name} {formData.last_name}</p>
            <p><span className="font-medium text-gray-700">Email:</span> {formData.email}</p>
            <p><span className="font-medium text-gray-700">Phone:</span> {formData.phone}</p>
            <p><span className="font-medium text-gray-700">Location:</span> {formData.location}</p>
            <p><span className="font-medium text-gray-700">Plan:</span> {formData.plan || 'Not selected'}</p>
            <p><span className="font-medium text-gray-700">Status:</span> {formData.status}</p>
            {waiverSigned && <p className="text-green-600">✓ Waiver signed</p>}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between gap-3 pt-4 border-t mt-6">
        <div>
          {step > 0 ? (
            <button type="button" onClick={handleBack} className="btn-outline text-sm">Back</button>
          ) : (
            <button type="button" onClick={resetForm} className="btn-outline text-sm">Cancel</button>
          )}
        </div>
        <div className="flex gap-2">
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={handleNext} className="btn-primary text-sm">Next</button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={createMember.isPending} className="btn-primary text-sm">
              {createMember.isPending ? 'Creating...' : 'Create Member'}
            </button>
          )}
        </div>
      </div>

      {showSign && (
        <SignWaiverModal
          template={templates[0]}
          onClose={() => setShowSign(false)}
          onSigned={() => { setWaiverSigned(true); setShowSign(false); }}
        />
      )}
    </Modal>
  );
}
