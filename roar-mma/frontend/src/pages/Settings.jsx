// Settings Page - Gym Configuration
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { PageLoader } from '../components/Shared/Spinner';
import { useNotifications } from '../contexts/NotificationContext';

function ToggleSwitch({ checked, onChange, id }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
    </label>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/api/settings');
      return response.data;
    },
  });

  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(settings);
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/api/settings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      setHasChanges(false);
      success('Settings saved successfully!');
    },
    onError: (err) => {
      console.error('Error saving settings:', err);
      error('Failed to save settings. Please try again.');
    }
  });

  const handleChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate(formData);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        {hasChanges && (
        <button
          type="button"
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="btn btn-primary"
        >
            {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <nav className="flex border-b border-gray-200">
          <TabButton
            active={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
            label="General"
          />
          <TabButton
            active={activeTab === 'locations'}
            onClick={() => setActiveTab('locations')}
            label="Locations"
          />
          <TabButton
            active={activeTab === 'membership'}
            onClick={() => setActiveTab('membership')}
            label="Membership"
          />
          <TabButton
            active={activeTab === 'notifications'}
            onClick={() => setActiveTab('notifications')}
            label="Notifications"
          />
          <TabButton
            active={activeTab === 'integrations'}
            onClick={() => setActiveTab('integrations')}
            label="Integrations"
          />
          <TabButton
            active={activeTab === 'grading'}
            onClick={() => setActiveTab('grading')}
            label="Grading"
          />
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'general' && (
          <GeneralSettings
            data={formData.general || {}}
            onChange={(field, value) => handleChange('general', field, value)}
          />
        )}
        {activeTab === 'locations' && (
          <LocationsSettings
            data={formData.locations || []}
            onChange={(value) => setFormData(prev => ({ ...prev, locations: value }))}
          />
        )}
        {activeTab === 'membership' && (
          <MembershipSettings
            data={formData.membership || {}}
            onChange={(field, value) => handleChange('membership', field, value)}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationsSettings
            data={formData.notifications || {}}
            onChange={(field, value) => handleChange('notifications', field, value)}
          />
        )}
        {activeTab === 'integrations' && (
          <IntegrationsSettings
            data={formData.integrations || {}}
            onChange={(field, value) => handleChange('integrations', field, value)}
          />
        )}
        {activeTab === 'grading' && (
          <GradingSettings
            data={formData.grading || {}}
            onChange={(field, value) => handleChange('grading', field, value)}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium ${
        active
          ? 'border-b-2 border-red-500 text-red-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

function GeneralSettings({ data, onChange }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gym Name
          </label>
          <input
            type="text"
            value={data.gym_name || ''}
            onChange={(e) => onChange('gym_name', e.target.value)}
            className="input"
            placeholder="ROAR MMA"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Email
          </label>
          <input
            type="email"
            value={data.contact_email || ''}
            onChange={(e) => onChange('contact_email', e.target.value)}
            className="input"
            placeholder="info@roarmma.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Phone
          </label>
          <input
            type="tel"
            value={data.contact_phone || ''}
            onChange={(e) => onChange('contact_phone', e.target.value)}
            className="input"
            placeholder="0400 000 000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website
          </label>
          <input
            type="url"
            value={data.website || ''}
            onChange={(e) => onChange('website', e.target.value)}
            className="input"
            placeholder="https://roarmma.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            value={data.timezone || 'Australia/Perth'}
            onChange={(e) => onChange('timezone', e.target.value)}
            className="input"
          >
            <option value="Australia/Perth">Australia/Perth</option>
            <option value="Australia/Sydney">Australia/Sydney</option>
            <option value="Australia/Melbourne">Australia/Melbourne</option>
            <option value="Australia/Brisbane">Australia/Brisbane</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select
            value={data.currency || 'AUD'}
            onChange={(e) => onChange('currency', e.target.value)}
            className="input"
          >
            <option value="AUD">AUD - Australian Dollar</option>
            <option value="USD">USD - US Dollar</option>
            <option value="GBP">GBP - British Pound</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Hours
        </label>
        <textarea
          value={data.business_hours || ''}
          onChange={(e) => onChange('business_hours', e.target.value)}
          rows="4"
          className="input"
          placeholder="Monday - Friday: 6:00 AM - 9:00 PM&#10;Saturday: 8:00 AM - 6:00 PM&#10;Sunday: 9:00 AM - 5:00 PM"
        />
      </div>
    </div>
  );
}

function LocationsSettings({ data, onChange }) {
  const addLocation = () => {
    onChange([...data, { name: '', address: '', phone: '', email: '' }]);
  };

  const updateLocation = (index, field, value) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeLocation = (index) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Locations</h2>
        <button type="button" onClick={addLocation} className="btn btn-primary">
          Add Location
        </button>
      </div>

      {data.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No locations configured</p>
      ) : (
        <div className="space-y-4">
          {data.map((location, index) => (
            <div key={location.name + index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Location {index + 1}
                </h3>
                <button
                  type="button"
                  onClick={() => removeLocation(index)}
                  className="text-red-600 hover:text-red-900"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name
                  </label>
                  <input
                    type="text"
                    value={location.name || ''}
                    onChange={(e) => updateLocation(index, 'name', e.target.value)}
                    className="input"
                    placeholder="Burleigh Heads"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={location.phone || ''}
                    onChange={(e) => updateLocation(index, 'phone', e.target.value)}
                    className="input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={location.address || ''}
                    onChange={(e) => updateLocation(index, 'address', e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={location.email || ''}
                    onChange={(e) => updateLocation(index, 'email', e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MembershipSettings({ data, onChange }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Membership Settings</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Trial Period</h3>
            <p className="text-sm text-gray-500">Default trial period for new members</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={data.trial_period_days || 7}
              onChange={(e) => onChange('trial_period_days', e.target.value ? parseInt(e.target.value, 10) : 7)}
              className="input w-20"
              min="1"
            />
            <span className="text-sm text-gray-600">days</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Auto-Renewal</h3>
            <p className="text-sm text-gray-500">Automatically renew memberships</p>
          </div>
          <ToggleSwitch
            checked={data.auto_renewal || false}
            onChange={(v) => onChange('auto_renewal', v)}
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Require Waiver</h3>
            <p className="text-sm text-gray-500">Members must sign waiver before joining</p>
          </div>
          <ToggleSwitch
            checked={data.require_waiver || false}
            onChange={(v) => onChange('require_waiver', v)}
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Grace Period</h3>
            <p className="text-sm text-gray-500">Days after payment failure before suspension</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={data.grace_period_days || 3}
              onChange={(e) => onChange('grace_period_days', e.target.value ? parseInt(e.target.value, 10) : 3)}
              className="input w-20"
              min="0"
            />
            <span className="text-sm text-gray-600">days</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsSettings({ data, onChange }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Email Notifications</h3>
            <p className="text-sm text-gray-500">Send email notifications to members</p>
          </div>
          <ToggleSwitch
            checked={data.email_enabled || false}
            onChange={(v) => onChange('email_enabled', v)}
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">SMS Notifications</h3>
            <p className="text-sm text-gray-500">Send SMS notifications to members</p>
          </div>
          <ToggleSwitch
            checked={data.sms_enabled || false}
            onChange={(v) => onChange('sms_enabled', v)}
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Class Reminders</h3>
            <p className="text-sm text-gray-500">Remind members about upcoming classes</p>
          </div>
          <ToggleSwitch
            checked={data.class_reminders || false}
            onChange={(v) => onChange('class_reminders', v)}
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Payment Reminders</h3>
            <p className="text-sm text-gray-500">Remind members about upcoming payments</p>
          </div>
          <ToggleSwitch
            checked={data.payment_reminders || false}
            onChange={(v) => onChange('payment_reminders', v)}
          />
        </div>
      </div>
    </div>
  );
}

function GradingSettings({ data, onChange }) {
  const [discipline, setDiscipline] = useState('bjj');
  const disciplines = [
    { id: 'bjj', label: 'BJJ' },
    { id: 'muay_thai', label: 'Muay Thai' },
    { id: 'mma', label: 'MMA' },
    { id: 'boxing', label: 'Boxing' },
    { id: 'kids', label: 'Kids' },
  ];
  const d = data[discipline] || {};

  const updateD = (field, value) => {
    onChange(discipline, { ...d, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Grading Configuration</h2>
      </div>

      <div className="flex gap-2 mb-4">
        {disciplines.map(dsc => (
          <button key={dsc.id} type="button" onClick={() => setDiscipline(dsc.id)}
            className={`text-xs px-3 py-1.5 rounded-full ${discipline === dsc.id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{dsc.label}</button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Enable Grading</h3>
            <p className="text-sm text-gray-500">Allow grading for {discipline.replace(/_/g, ' ')}</p>
          </div>
          <ToggleSwitch checked={d.enabled ?? true} onChange={(v) => updateD('enabled', v)} />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Default Test Day</h3>
            <p className="text-sm text-gray-500">Day of week for scheduled grading sessions</p>
          </div>
          <select value={d.default_test_day || 'Saturday'} onChange={(e) => updateD('default_test_day', e.target.value)} className="input text-sm w-40">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => <option key={day} value={day}>{day}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Min Classes Between Gradings</h3>
            <p className="text-sm text-gray-500">Minimum classes required before next grading</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={d.min_classes ?? 20} onChange={(e) => updateD('min_classes', parseInt(e.target.value, 10) || 20)} className="input w-20" min="0" />
            <span className="text-sm text-gray-600">classes</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Exam Duration</h3>
            <p className="text-sm text-gray-500">Default duration for grading sessions</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={d.exam_duration_minutes ?? 120} onChange={(e) => updateD('exam_duration_minutes', parseInt(e.target.value, 10) || 120)} className="input w-20" min="15" step="15" />
            <span className="text-sm text-gray-600">minutes</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Allow Stripes</h3>
            <p className="text-sm text-gray-500">Award interim stripes between belt ranks</p>
          </div>
          <ToggleSwitch checked={d.allow_stripes ?? true} onChange={(v) => updateD('allow_stripes', v)} />
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Review Period (Days)</h3>
            <p className="text-sm text-gray-500">Days between stripe eligibility reviews</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={d.review_period_days ?? 30} onChange={(e) => updateD('review_period_days', parseInt(e.target.value, 10) || 30)} className="input w-20" min="1" />
            <span className="text-sm text-gray-600">days</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs text-gray-400">Belt rank progression is managed via the database. These settings control grading session defaults per discipline.</p>
      </div>
    </div>
  );
}

function IntegrationsSettings({ data, onChange }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-4">Stripe Payment Gateway</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Publishable Key
            </label>
            <input
              type="text"
              value={data.stripe_publishable_key || ''}
              onChange={(e) => onChange('stripe_publishable_key', e.target.value)}
              className="input"
              placeholder="pk_test_..."
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">Secret keys are stored server-side only.</p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-4">Email Service (SendGrid)</h3>
          <p className="text-sm text-gray-500">SendGrid API key is configured server-side for security.</p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-4">SMS Service (Twilio)</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={data.twilio_phone_number || ''}
              onChange={(e) => onChange('twilio_phone_number', e.target.value)}
              className="input"
              placeholder="+61400000000"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">Account credentials are stored server-side only.</p>
        </div>
      </div>
    </div>
  );
}
