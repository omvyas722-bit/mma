// Settings Page - Gym Configuration
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { PageLoader } from '../components/Shared/Spinner';

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/api/settings');
      return response.data;
    },
  });

  const [formData, setFormData] = useState(settings || {});

  const updateSettings = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/api/settings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      setHasChanges(false);
      alert('Settings saved successfully!');
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
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
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium ${
        active
          ? 'border-b-2 border-blue-500 text-blue-600'
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
        <button onClick={addLocation} className="btn btn-primary">
          Add Location
        </button>
      </div>

      {data.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No locations configured</p>
      ) : (
        <div className="space-y-4">
          {data.map((location, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Location {index + 1}
                </h3>
                <button
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
              onChange={(e) => onChange('trial_period_days', parseInt(e.target.value))}
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
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={data.auto_renewal || false}
              onChange={(e) => onChange('auto_renewal', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Require Waiver</h3>
            <p className="text-sm text-gray-500">Members must sign waiver before joining</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={data.require_waiver || false}
              onChange={(e) => onChange('require_waiver', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
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
              onChange={(e) => onChange('grace_period_days', parseInt(e.target.value))}
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
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={data.email_enabled || false}
              onChange={(e) => onChange('email_enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">SMS Notifications</h3>
            <p className="text-sm text-gray-500">Send SMS notifications to members</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={data.sms_enabled || false}
              onChange={(e) => onChange('sms_enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Class Reminders</h3>
            <p className="text-sm text-gray-500">Remind members about upcoming classes</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={data.class_reminders || false}
              onChange={(e) => onChange('class_reminders', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Payment Reminders</h3>
            <p className="text-sm text-gray-500">Remind members about upcoming payments</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={data.payment_reminders || false}
              onChange={(e) => onChange('payment_reminders', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
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
          <div className="space-y-3">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secret Key
              </label>
              <input
                type="password"
                value={data.stripe_secret_key || ''}
                onChange={(e) => onChange('stripe_secret_key', e.target.value)}
                className="input"
                placeholder="sk_test_..."
              />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-4">Email Service (SendGrid)</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={data.sendgrid_api_key || ''}
              onChange={(e) => onChange('sendgrid_api_key', e.target.value)}
              className="input"
              placeholder="SG...."
            />
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-4">SMS Service (Twilio)</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account SID
              </label>
              <input
                type="text"
                value={data.twilio_account_sid || ''}
                onChange={(e) => onChange('twilio_account_sid', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auth Token
              </label>
              <input
                type="password"
                value={data.twilio_auth_token || ''}
                onChange={(e) => onChange('twilio_auth_token', e.target.value)}
                className="input"
              />
            </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
