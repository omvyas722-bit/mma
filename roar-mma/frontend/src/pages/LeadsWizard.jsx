import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

const STEPS = ['Personal Info', 'Contact', 'Source', 'Interests', 'Review'];

const initialForm = {
  first_name: '', last_name: '', email: '', phone: '',
  source: 'website', location: 'rockingham', interests: '', notes: '',
  utm_source: '', utm_medium: '', utm_campaign: '',
};

export default function LeadsWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const upd = (name, value) => {
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'Required';
    if (!form.last_name.trim()) e.last_name = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    return e;
  };

  const createLead = useMutation({
    mutationFn: (d) => api.post('/api/leads', d).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      success('Lead created!');
      navigate('/leads');
    },
    onError: () => error('Failed to create lead'),
  });

  const next = () => {
    if (step === 0) {
      const e = {};
      if (!form.first_name.trim()) e.first_name = 'Required';
      if (!form.last_name.trim()) e.last_name = 'Required';
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    if (step === 1) {
      const e = {};
      if (!form.phone.trim()) e.phone = 'Required';
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    setStep(s => s + 1);
  };

  const prev = () => setStep(s => s - 1);

  const submit = () => {
    const e = validate();
    setErrors(e);
    if (!Object.keys(e).length) createLead.mutate(form);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Lead Wizard</h1>
        <p className="text-sm text-gray-500 mt-1">Step {step + 1} of {STEPS.length}</p>
        <div className="flex gap-1 mt-3">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 h-2 rounded-full ${i < step ? 'bg-green-500' : i === step ? 'bg-red-500' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="flex gap-4 mt-1.5 text-[10px] text-gray-400">
          {STEPS.map((s, i) => <span key={s} className={`flex-1 ${i === step ? 'text-red-600 font-medium' : ''}`}>{s}</span>)}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input type="text" value={form.first_name} onChange={e => upd('first_name', e.target.value)} className={`input ${errors.first_name ? 'border-red-500' : ''}`} placeholder="John" />
                {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input type="text" value={form.last_name} onChange={e => upd('last_name', e.target.value)} className={`input ${errors.last_name ? 'border-red-500' : ''}`} placeholder="Smith" />
                {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Contact Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => upd('email', e.target.value)} className={`input ${errors.email ? 'border-red-500' : ''}`} placeholder="john@example.com" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input type="tel" value={form.phone} onChange={e => upd('phone', e.target.value)} className={`input ${errors.phone ? 'border-red-500' : ''}`} placeholder="0400123456" />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Source & Location</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">How did they find us?</label>
                <select value={form.source} onChange={e => upd('source', e.target.value)} className="input">
                  <option value="website">Website</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="referral">Referral</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="google">Google</option>
                  <option value="phone">Phone Call</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Location</label>
                <select value={form.location} onChange={e => upd('location', e.target.value)} className="input">
                  <option value="rockingham">Rockingham</option>
                  <option value="bibra_lake">Bibra Lake</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Interests & Notes</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
              <textarea value={form.interests} onChange={e => upd('interests', e.target.value)} rows={2} className="input" placeholder="BJJ, Muay Thai, MMA, Boxing..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} rows={3} className="input" placeholder="Any additional info..." />
            </div>
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">UTM Tracking (optional)</summary>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div><label className="block text-xs font-medium text-gray-600 mb-0.5">Source</label><input type="text" value={form.utm_source} onChange={e => upd('utm_source', e.target.value)} className="input text-xs" placeholder="google" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-0.5">Medium</label><input type="text" value={form.utm_medium} onChange={e => upd('utm_medium', e.target.value)} className="input text-xs" placeholder="cpc" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-0.5">Campaign</label><input type="text" value={form.utm_campaign} onChange={e => upd('utm_campaign', e.target.value)} className="input text-xs" placeholder="summer_promo" /></div>
              </div>
            </details>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review & Submit</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">Name:</span> <span className="font-medium">{form.first_name} {form.last_name}</span></div>
                <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{form.phone}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="font-medium">{form.email || '—'}</span></div>
                <div><span className="text-gray-500">Source:</span> <span className="font-medium capitalize">{form.source.replace(/_/g, ' ')}</span></div>
                <div><span className="text-gray-500">Location:</span> <span className="font-medium capitalize">{form.location.replace(/_/g, ' ')}</span></div>
                {form.interests && <div className="col-span-2"><span className="text-gray-500">Interests:</span> <span className="font-medium">{form.interests}</span></div>}
                {form.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> <span className="font-medium">{form.notes}</span></div>}
                {(form.utm_source || form.utm_medium || form.utm_campaign) && (
                  <div className="col-span-2"><span className="text-gray-500">UTM:</span> <span className="font-medium">{form.utm_source || ''} / {form.utm_medium || ''} / {form.utm_campaign || ''}</span></div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-4 border-t">
          <div>
            {step > 0 && (
              <button onClick={prev} className="btn-outline text-sm">Back</button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/leads')} className="btn-outline text-sm">Cancel</button>
            {step < STEPS.length - 1 ? (
              <button onClick={next} className="btn-primary text-sm">Next</button>
            ) : (
              <button onClick={submit} disabled={createLead.isPending} className="btn-primary text-sm">
                {createLead.isPending ? 'Creating...' : 'Create Lead'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}