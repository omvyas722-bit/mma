/* eslint-disable react-refresh/only-export-components */
// Shared form fields for Add/Edit Lead modals
import { useOptions, optionLabel } from '../../lib/useOptions';

const initialLeadForm = {
  first_name: '', last_name: '', email: '', phone: '',
  source: 'website', location: 'rockingham', interests: '', notes: '',
  utm_source: '', utm_medium: '', utm_campaign: '',
};

function validateLeadForm(formData, extraFields = []) {
  const errors = {};
  if (!formData.first_name.trim()) errors.first_name = 'First name is required';
  if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
  if (!formData.phone.trim()) errors.phone = 'Phone is required';
  if (extraFields.includes('source') && !formData.source) errors.source = 'Source is required';
  if (extraFields.includes('status') && !formData.status) errors.status = 'Status is required';
  return errors;
}

function LeadNameFields({ formData, errors, handleChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
        <input type="text" name="first_name" value={formData.first_name} onChange={handleChange}
          className={`input ${errors.first_name ? 'border-red-500' : ''}`} />
        {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
        <input type="text" name="last_name" value={formData.last_name} onChange={handleChange}
          className={`input ${errors.last_name ? 'border-red-500' : ''}`} />
        {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
      </div>
    </div>
  );
}

function LeadContactFields({ formData, errors, handleChange, showEmail = true }) {
  return (
    <>
      {showEmail && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className="input" />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
        <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
          placeholder="0400123456" className={`input ${errors.phone ? 'border-red-500' : ''}`} />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
      </div>
    </>
  );
}

function LeadSourceFields({ formData, handleChange }) {
  const { data: options } = useOptions();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
        <select name="source" value={formData.source} onChange={handleChange} className="input">
          {(options?.lead_sources || []).map(v => (
            <option key={v} value={v}>{optionLabel(v)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Location</label>
        <select name="location" value={formData.location} onChange={handleChange} className="input">
          {(options?.locations || []).map(v => (
            <option key={v} value={v}>{optionLabel(v)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function LeadNotesFields({ formData, handleChange }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
        <textarea name="interests" value={formData.interests} onChange={handleChange}
          rows="2" className="input" placeholder="What are they interested in? (BJJ, Muay Thai, MMA, etc.)" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea name="notes" value={formData.notes} onChange={handleChange}
          rows="3" className="input" placeholder="Any additional notes..." />
      </div>
    </>
  );
}

function LeadUtmFields({ formData, handleChange }) {
  return (
    <details className="text-xs text-gray-500">
      <summary className="cursor-pointer hover:text-gray-700">UTM Tracking (optional)</summary>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div><label className="block text-xs font-medium text-gray-600 mb-0.5">Source</label><input type="text" name="utm_source" value={formData.utm_source} onChange={handleChange} className="input text-xs" placeholder="e.g. google" /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-0.5">Medium</label><input type="text" name="utm_medium" value={formData.utm_medium} onChange={handleChange} className="input text-xs" placeholder="e.g. cpc" /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-0.5">Campaign</label><input type="text" name="utm_campaign" value={formData.utm_campaign} onChange={handleChange} className="input text-xs" placeholder="e.g. summer_promo" /></div>
      </div>
    </details>
  );
}

export { initialLeadForm, validateLeadForm, LeadNameFields, LeadContactFields, LeadSourceFields, LeadNotesFields, LeadUtmFields };
