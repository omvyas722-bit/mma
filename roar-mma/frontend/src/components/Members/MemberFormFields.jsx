// Shared form sections for Add/Edit Member modals

function PersonalInfoFields({ formData, errors, handleChange }) {
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange}
          className={`input ${errors.email ? 'border-red-500' : ''}`} />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
        <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
          placeholder="0400123456" className={`input ${errors.phone ? 'border-red-500' : ''}`} />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
        <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="input" />
      </div>
    </div>
  );
}

function EmergencyContactFields({ formData, handleChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
        <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name}
          onChange={handleChange} className="input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
        <input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone}
          onChange={handleChange} className="input" />
      </div>
    </div>
  );
}

function MedicalGoalsFields({ formData, handleChange, showInjuries = false }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions</label>
        <textarea name="medical_conditions" value={formData.medical_conditions} onChange={handleChange}
          rows="2" className="input" placeholder="Any medical conditions we should know about..." />
      </div>
      {showInjuries && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Injuries</label>
          <textarea name="injuries" value={formData.injuries} onChange={handleChange}
            rows="2" className="input" placeholder="Any current or past injuries..." />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
        <textarea name="goals" value={formData.goals} onChange={handleChange}
          rows="2" className="input" placeholder="What are your fitness/training goals..." />
      </div>
    </div>
  );
}

export { PersonalInfoFields, EmergencyContactFields, MedicalGoalsFields };
