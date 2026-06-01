/* eslint-disable react-refresh/only-export-components */
// Shared form fields for Add/Edit Class modals

const initialClassForm = {
  name: '', description: '', instructor: '', location: '',
  day_of_week: '', start_time: '', end_time: '', max_capacity: '', class_type: '',
  fighter_only: false, min_belt: '',
};

function validateClassForm(formData) {
  const errors = {};
  if (!formData.name.trim()) errors.name = 'Class name is required';
  if (!formData.instructor.trim()) errors.instructor = 'Instructor is required';
  if (!formData.location) errors.location = 'Location is required';
  if (!formData.day_of_week) errors.day_of_week = 'Day of week is required';
  if (!formData.start_time) errors.start_time = 'Start time is required';
  if (!formData.end_time) errors.end_time = 'End time is required';
  if (!formData.class_type) errors.class_type = 'Class type is required';
  if (formData.max_capacity && parseInt(formData.max_capacity, 10) < 1) {
    errors.max_capacity = 'Capacity must be at least 1';
  }
  if (formData.start_time && formData.end_time) {
    const [sH, sM] = formData.start_time.split(':').map(Number);
    const [eH, eM] = formData.end_time.split(':').map(Number);
    if (sH * 60 + sM >= eH * 60 + eM) {
      errors.end_time = 'End time must be after start time';
    }
  }
  return errors;
}

function ClassFormFields({ formData, errors, handleChange }) {
  return (
    <>
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange}
              className={`input ${errors.name ? 'border-red-500' : ''}`} placeholder="e.g., BJJ Fundamentals" />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange}
              rows="3" className="input" placeholder="Brief description of the class..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Type *</label>
              <select name="class_type" value={formData.class_type} onChange={handleChange}
                className={`input ${errors.class_type ? 'border-red-500' : ''}`}>
                <option value="">Select Type</option>
                <option value="bjj">Brazilian Jiu-Jitsu</option>
                <option value="muay_thai">Muay Thai</option>
                <option value="mma">MMA</option>
                <option value="boxing">Boxing</option>
                <option value="wrestling">Wrestling</option>
                <option value="fitness">Fitness</option>
                <option value="kids">Kids Class</option>
              </select>
              {errors.class_type && <p className="text-red-500 text-sm mt-1">{errors.class_type}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor *</label>
              <input type="text" name="instructor" value={formData.instructor} onChange={handleChange}
                className={`input ${errors.instructor ? 'border-red-500' : ''}`} placeholder="Instructor name" />
              {errors.instructor && <p className="text-red-500 text-sm mt-1">{errors.instructor}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Schedule</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week *</label>
            <select name="day_of_week" value={formData.day_of_week} onChange={handleChange}
              className={`input ${errors.day_of_week ? 'border-red-500' : ''}`}>
              <option value="">Select Day</option>
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
            {errors.day_of_week && <p className="text-red-500 text-sm mt-1">{errors.day_of_week}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <select name="location" value={formData.location} onChange={handleChange}
              className={`input ${errors.location ? 'border-red-500' : ''}`}>
              <option value="">Select Location</option>
              <option value="rockingham">Rockingham</option>
              <option value="bibra_lake">Bibra Lake</option>
            </select>
            {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
            <input type="time" name="start_time" value={formData.start_time} onChange={handleChange}
              className={`input ${errors.start_time ? 'border-red-500' : ''}`} />
            {errors.start_time && <p className="text-red-500 text-sm mt-1">{errors.start_time}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
            <input type="time" name="end_time" value={formData.end_time} onChange={handleChange}
              className={`input ${errors.end_time ? 'border-red-500' : ''}`} />
            {errors.end_time && <p className="text-red-500 text-sm mt-1">{errors.end_time}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
            <input type="number" name="max_capacity" value={formData.max_capacity} onChange={handleChange}
              className={`input ${errors.max_capacity ? 'border-red-500' : ''}`}
              placeholder="Leave empty for unlimited" min="1" />
            {errors.max_capacity && <p className="text-red-500 text-sm mt-1">{errors.max_capacity}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min. Belt Requirement</label>
            <select name="min_belt" value={formData.min_belt} onChange={handleChange} className="input">
              <option value="">None</option>
              <option value="white">White</option><option value="blue">Blue</option><option value="purple">Purple</option>
              <option value="brown">Brown</option><option value="black">Black</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="fighter_only" checked={formData.fighter_only} onChange={(e) => handleChange({ target: { name: 'fighter_only', value: e.target.checked } })}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
            <span className="text-sm text-gray-700">Fighters only (invite-only, hidden from regular members)</span>
          </label>
        </div>
      </div>
    </>
  );
}

export { ClassFormFields, initialClassForm, validateClassForm };
