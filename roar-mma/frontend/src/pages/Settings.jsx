// Settings Page - Gym Configuration
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { PageLoader } from '../components/Shared/Spinner';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

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
          <TabButton
            active={activeTab === 'api-keys'}
            onClick={() => setActiveTab('api-keys')}
            label="API Keys"
          />
          <TabButton
            active={activeTab === 'webhooks'}
            onClick={() => setActiveTab('webhooks')}
            label="Webhooks"
          />
          <TabButton
            active={activeTab === 'roles'}
            onClick={() => setActiveTab('roles')}
            label="Roles"
          />
          <TabButton
            active={activeTab === 'tracking'}
            onClick={() => setActiveTab('tracking')}
            label="Tracking"
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
        {activeTab === 'api-keys' && <ApiKeysSettings />}
        {activeTab === 'webhooks' && <WebhooksSettings />}
        {activeTab === 'roles' && <RolePermissionsSettings data={formData.roles || {}} onChange={(field, value) => handleChange('roles', field, value)} />}
        {activeTab === 'tracking' && <PixelTrackingSettings />}
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
  const { success, error } = useNotifications();
  const queryClient = useQueryClient();
  const disciplines = [
    { id: 'bjj', label: 'BJJ' },
    { id: 'muay_thai', label: 'Muay Thai' },
    { id: 'mma', label: 'MMA' },
    { id: 'boxing', label: 'Boxing' },
    { id: 'kids_bjj', label: 'Kids BJJ' },
  ];
  const d = data[discipline] || {};

  const updateD = (field, value) => {
    onChange(discipline, { ...d, [field]: value });
  };

  const { data: beltLevels = [], refetch: refetchBelts } = useQuery({
    queryKey: ['settings-belt-levels', discipline],
    queryFn: async () => { const r = await api.get(`/api/grading/belts?discipline=${discipline}`); return Array.isArray(r) ? r : r.belts || r; },
    staleTime: 30000,
  });

  const [editBelt, setEditBelt] = useState(null);
  const [showAddBelt, setShowAddBelt] = useState(false);
  const [beltForm, setBeltForm] = useState({ name: '', rank_order: 1, min_classes_attended: 0, min_time_months: 0, stripe_count: 4, color_code: '' });

  const saveBelt = useMutation({
    mutationFn: (beltData) => {
      if (beltData.id) return api.put(`/api/grading/belts/${beltData.id}`, beltData);
      return api.post('/api/grading/belts', { ...beltData, discipline });
    },
    onSuccess: () => { refetchBelts(); setEditBelt(null); setShowAddBelt(false); success('Belt level saved'); },
    onError: () => error('Failed to save belt level'),
  });

  const deleteBelt = useMutation({
    mutationFn: (id) => api.delete(`/api/grading/belts/${id}`),
    onSuccess: () => { refetchBelts(); success('Belt level deleted'); },
    onError: () => error('Failed to delete belt level'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Grading Configuration</h2>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {disciplines.map(dsc => (
          <button key={dsc.id} type="button" onClick={() => setDiscipline(dsc.id)}
            className={`text-xs px-3 py-1.5 rounded-full ${discipline === dsc.id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{dsc.label}</button>
        ))}
      </div>

      {/* Belt Levels Table */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">{discipline.replace(/_/g, ' ')} Belt Levels</h3>
          <button type="button" onClick={() => { setShowAddBelt(true); setBeltForm({ name: '', rank_order: (beltLevels.length + 1) * 100, min_classes_attended: 0, min_time_months: 0, stripe_count: 4, color_code: '' }); }} className="btn-primary text-xs">+ Add Belt</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-3 py-2">Belt</th>
                <th className="px-3 py-2">Rank Order</th>
                <th className="px-3 py-2">Stripes</th>
                <th className="px-3 py-2">Min Classes</th>
                <th className="px-3 py-2">Min Months</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {beltLevels.map(b => (
                <tr key={b.id}>
                  {editBelt === b.id ? (
                    <>
                      <td className="px-3 py-2"><input value={beltForm.name} onChange={e => setBeltForm(f => ({ ...f, name: e.target.value }))} className="input text-xs w-24" /></td>
                      <td className="px-3 py-2"><input type="number" value={beltForm.rank_order} onChange={e => setBeltForm(f => ({ ...f, rank_order: parseInt(e.target.value, 10) || 0 }))} className="input text-xs w-16" /></td>
                      <td className="px-3 py-2"><input type="number" min="0" max="4" value={beltForm.stripe_count} onChange={e => setBeltForm(f => ({ ...f, stripe_count: parseInt(e.target.value, 10) || 0 }))} className="input text-xs w-16" /></td>
                      <td className="px-3 py-2"><input type="number" min="0" value={beltForm.min_classes_attended} onChange={e => setBeltForm(f => ({ ...f, min_classes_attended: parseInt(e.target.value, 10) || 0 }))} className="input text-xs w-20" /></td>
                      <td className="px-3 py-2"><input type="number" min="0" value={beltForm.min_time_months} onChange={e => setBeltForm(f => ({ ...f, min_time_months: parseInt(e.target.value, 10) || 0 }))} className="input text-xs w-16" /></td>
                      <td className="px-3 py-2 flex gap-1">
                        <button onClick={() => saveBelt.mutate({ ...beltForm, id: b.id })} className="text-xs text-green-600 hover:underline">Save</button>
                        <button onClick={() => setEditBelt(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-medium text-gray-900">{b.name}</td>
                      <td className="px-3 py-2 text-gray-500">{b.rank_order}</td>
                      <td className="px-3 py-2 text-gray-500">{b.stripe_count}</td>
                      <td className="px-3 py-2 text-gray-700">{b.min_classes_attended}</td>
                      <td className="px-3 py-2 text-gray-700">{b.min_time_months}</td>
                      <td className="px-3 py-2 flex gap-2">
                        <button onClick={() => { setEditBelt(b.id); setBeltForm({ name: b.name, rank_order: b.rank_order, stripe_count: b.stripe_count, min_classes_attended: b.min_classes_attended, min_time_months: b.min_time_months, color_code: b.color_code || '' }); }} className="text-xs text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => { if (confirm('Delete this belt level?')) deleteBelt.mutate(b.id); }} className="text-xs text-red-600 hover:underline">Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {showAddBelt && (
                <tr>
                  <td className="px-3 py-2"><input value={beltForm.name} onChange={e => setBeltForm(f => ({ ...f, name: e.target.value }))} className="input text-xs w-24" placeholder="Belt name" /></td>
                  <td className="px-3 py-2"><input type="number" value={beltForm.rank_order} onChange={e => setBeltForm(f => ({ ...f, rank_order: parseInt(e.target.value, 10) || 0 }))} className="input text-xs w-16" /></td>
                  <td className="px-3 py-2"><input type="number" min="0" max="4" value={beltForm.stripe_count} onChange={e => setBeltForm(f => ({ ...f, stripe_count: parseInt(e.target.value, 10) || 0 }))} className="input text-xs w-16" /></td>
                  <td className="px-3 py-2"><input type="number" min="0" value={beltForm.min_classes_attended} onChange={e => setBeltForm(f => ({ ...f, min_classes_attended: parseInt(e.target.value, 10) || 0 }))} className="input text-xs w-20" /></td>
                  <td className="px-3 py-2"><input type="number" min="0" value={beltForm.min_time_months} onChange={e => setBeltForm(f => ({ ...f, min_time_months: parseInt(e.target.value, 10) || 0 }))} className="input text-xs w-16" /></td>
                  <td className="px-3 py-2 flex gap-1">
                    <button onClick={() => saveBelt.mutate(beltForm)} className="text-xs text-green-600 hover:underline">Add</button>
                    <button onClick={() => setShowAddBelt(false)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}

function IntegrationsSettings({ data, onChange }) {
  const [metaForm, setMetaForm] = useState({ app_id: data?.meta_app_id || '', app_secret: '', access_token: data?.meta_access_token || '', page_id: data?.meta_page_id || '', connected: data?.meta_connected || false });
  const metaU = (k, v) => setMetaForm(f => ({ ...f, [k]: v }));

  const saveMeta = () => {
    onChange('meta_app_id', metaForm.app_id);
    onChange('meta_access_token', metaForm.access_token);
    onChange('meta_page_id', metaForm.page_id);
    onChange('meta_connected', metaForm.connected);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>

      <div className="space-y-4">
        {/* Social Media / Meta */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Social Media — Meta API</h3>
          <p className="text-sm text-gray-500">Connect Instagram Business and Facebook Page for auto-publishing.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Enable Meta API Connection</p>
                <p className="text-xs text-gray-400">Toggle to activate manual token-based connection</p>
              </div>
              <ToggleSwitch checked={metaForm.connected} onChange={(v) => { metaU('connected', v); setTimeout(saveMeta, 0); }} />
            </div>
            {metaForm.connected && (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Meta App ID</label>
                  <input type="text" value={metaForm.app_id} onChange={e => metaU('app_id', e.target.value)} className="input text-sm w-full" placeholder="From Meta Developer Console" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Meta App Secret</label>
                  <input type="password" value={metaForm.app_secret} onChange={e => metaU('app_secret', e.target.value)} className="input text-sm w-full" placeholder="Leave blank to keep existing" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Access Token</label>
                  <input type="text" value={metaForm.access_token} onChange={e => metaU('access_token', e.target.value)} className="input text-sm w-full font-mono text-xs" placeholder="Paste Meta long-lived access token" />
                  <p className="text-xs text-gray-400 mt-1">Get from <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Graph API Explorer</a></p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Facebook Page ID</label>
                  <input type="text" value={metaForm.page_id} onChange={e => metaU('page_id', e.target.value)} className="input text-sm w-full" placeholder="Numeric page ID" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveMeta} className="btn-primary text-xs">Save Meta Settings</button>
                  <button onClick={() => { metaU('connected', false); metaU('access_token', ''); metaU('app_id', ''); metaU('app_secret', ''); metaU('page_id', ''); saveMeta(); }} className="btn-outline text-xs text-red-600">Disconnect & Clear</button>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <p className="text-xs text-gray-400">After saving, go to <span className="font-medium">Social Media → Platforms</span> to verify connection.</p>
          </div>
        </div>

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

        {/* Security */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Security Settings</h3>
          <SecuritySection />
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

function ApiKeysSettings() {
  const { success, error } = useNotifications();
  const queryClient = useQueryClient();
  const [showGenerate, setShowGenerate] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState('');

  const { data: keyInfo, isLoading } = useQuery({
    queryKey: ['api-key-info'],
    queryFn: async () => { const r = await api.get('/api/auth/api-key'); return r.data.key; },
  });

  const genKey = useMutation({
    mutationFn: (name) => api.post('/api/auth/generate-api-key', { name }),
    onSuccess: (res) => { setNewKey(res.data.api_key); setShowGenerate(false); setKeyName(''); success('API key generated - save it now!'); queryClient.invalidateQueries(['api-key-info']); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

  const revokeKey = useMutation({
    mutationFn: () => api.delete('/api/auth/revoke-api-key'),
    onSuccess: () => { success('API key revoked'); queryClient.invalidateQueries(['api-key-info']); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

  const handleRevoke = () => {
    if (confirm('Revoke this API key? Any integrations using it will stop working.')) revokeKey.mutate();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">API Keys</h2>
      <p className="text-sm text-gray-500">Manage API keys for external integrations.</p>

      {newKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-yellow-800">New API Key Generated</p>
          <p className="text-xs font-mono break-all text-yellow-700 mt-1 bg-yellow-100 p-2 rounded">{newKey}</p>
          <p className="text-xs text-red-600 mt-1">⚠ Save this key - it will not be shown again.</p>
          <button onClick={() => setNewKey('')} className="text-xs text-yellow-700 underline mt-1">Dismiss</button>
        </div>
      )}

      {keyInfo ? (
        <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">{keyInfo.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">····{keyInfo.last4} · Created {keyInfo.created_at ? new Date(keyInfo.created_at).toLocaleDateString() : '—'}</p>
          </div>
          <button onClick={handleRevoke} disabled={revokeKey.isPending} className="btn-outline text-xs text-red-600">{revokeKey.isPending ? 'Revoking...' : 'Revoke'}</button>
        </div>
      ) : isLoading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : (
        <p className="text-sm text-gray-400">No API keys configured.</p>
      )}

      {showGenerate ? (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key Description</label>
            <input type="text" value={keyName} onChange={e => setKeyName(e.target.value)} className="input" placeholder="e.g. Lightspeed Integration" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => genKey.mutate(keyName || 'API Key')} disabled={genKey.isPending} className="btn-primary text-sm">{genKey.isPending ? 'Generating...' : 'Generate Key'}</button>
            <button onClick={() => setShowGenerate(false)} className="btn-outline text-sm">Cancel</button>
          </div>
        </div>
      ) : !keyInfo ? (
        <button onClick={() => setShowGenerate(true)} className="btn-primary text-sm">Generate New Key</button>
      ) : null}
    </div>
  );
}

function WebhooksSettings() {
  const { error, success } = useNotifications();
  const [copiedIdx, setCopiedIdx] = useState(null);

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhook-status'],
    queryFn: async () => { const r = await api.get('/api/webhooks/status'); return r.data; },
  });

  const testSync = useMutation({
    mutationFn: () => api.post('/api/webhooks/lightspeed/sync', { daysBack: 7 }),
    onSuccess: () => success('Sync triggered'),
    onError: (err) => error(err?.response?.data?.error || 'Sync failed'),
  });

  const copyUrl = (url, idx) => {
    navigator.clipboard.writeText(url);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const items = webhooks ? [
    { name: 'Lightspeed', url: webhooks.lightspeed?.url, enabled: webhooks.lightspeed?.enabled, lastDelivery: webhooks.lightspeed?.last_delivery, testable: true },
    { name: 'Stripe', url: webhooks.stripe?.url, enabled: webhooks.stripe?.enabled, lastDelivery: webhooks.stripe?.last_delivery, testable: false },
  ] : [];

  if (isLoading) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Webhooks</h2>
      <p className="text-sm text-gray-500">Endpoints for external services to push data into ROAR MMA.</p>

      {items.map((item, i) => (
        <div key={item.name} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-medium text-gray-900">{item.name}</h3>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${item.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.enabled ? 'Enabled' : 'Not configured'}</span>
            </div>
          </div>
          {item.url && (
            <div className="flex items-center gap-2 mb-2">
              <code className="text-xs bg-gray-50 border rounded px-2 py-1 font-mono flex-1 truncate">{item.url}</code>
              <button onClick={() => copyUrl(item.url, i)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">{copiedIdx === i ? 'Copied!' : 'Copy URL'}</button>
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {item.lastDelivery && <span>Last delivery: {new Date(item.lastDelivery).toLocaleString()}</span>}
            {item.testable && (
              <button onClick={() => testSync.mutate()} disabled={testSync.isPending} className="text-blue-600 hover:underline">{testSync.isPending ? 'Syncing...' : 'Test Webhook'}</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const ROLES = ['owner', 'gm', 'front_desk', 'coach', 'sales', 'social'];
const ROLE_LABELS = { owner: 'Owner', gm: 'General Manager', front_desk: 'Front Desk / Admin', coach: 'Coach', sales: 'Sales', social: 'Social Media Manager' };
const PERMISSION_GROUPS = {
  members: ['members:read', 'members:create', 'members:update', 'members:delete'],
  classes: ['classes:read', 'classes:create', 'classes:update', 'classes:delete'],
  leads: ['leads:read', 'leads:create', 'leads:update', 'leads:delete'],
  billing: ['transactions:read', 'transactions:create'],
  staff: ['staff:read', 'staff:create', 'staff:update'],
  reports: ['reports:read', 'reports:write'],
  settings: ['settings:read', 'settings:write'],
  ai: ['ai:read', 'ai:manage'],
};
const PERMISSION_LABELS = {
  'members:read': 'View members', 'members:create': 'Create members', 'members:update': 'Edit members', 'members:delete': 'Delete members',
  'classes:read': 'View timetable', 'classes:create': 'Create classes', 'classes:update': 'Edit classes', 'classes:delete': 'Delete classes',
  'leads:read': 'View leads', 'leads:create': 'Create leads', 'leads:update': 'Edit leads', 'leads:delete': 'Delete leads',
  'transactions:read': 'View transactions', 'transactions:create': 'Create transactions',
  'staff:read': 'View staff', 'staff:create': 'Create staff', 'staff:update': 'Edit staff',
  'reports:read': 'View reports', 'reports:write': 'Edit / Export reports',
  'settings:read': 'View settings', 'settings:write': 'Edit settings',
  'ai:read': 'View AI system', 'ai:manage': 'Manage AI agents',
};

const DEFAULT_ROLE_PERMISSIONS = {
  owner: ['*'],
  gm: ['members:read', 'members:create', 'members:update', 'members:delete', 'classes:read', 'classes:create', 'classes:update', 'classes:delete', 'leads:read', 'leads:create', 'leads:update', 'leads:delete', 'reports:read', 'reports:write', 'staff:read', 'staff:create', 'staff:update', 'transactions:read', 'transactions:create', 'settings:read', 'settings:write', 'ai:read', 'ai:manage'],
  front_desk: ['members:read', 'members:create', 'classes:read', 'leads:read', 'leads:create', 'reports:read', 'transactions:read', 'transactions:create'],
  coach: ['classes:read', 'members:read', 'leads:read'],
  sales: ['leads:read', 'leads:create', 'leads:update', 'leads:delete', 'members:read', 'reports:read'],
  social: ['reports:read'],
};

function RolePermissionsSettings({ data, onChange }) {
  const [rolePerms, setRolePerms] = useState(() => {
    if (data && Object.keys(data).length > 0) return data;
    const init = {};
    ROLES.forEach(r => { init[r] = [...(DEFAULT_ROLE_PERMISSIONS[r] || [])]; });
    return init;
  });

  const hasPermission = (role, perm) => rolePerms[role]?.includes('*') || rolePerms[role]?.includes(perm);

  const togglePermission = (role, perm) => {
    const perms = rolePerms[role] || [];
    if (perm === '*') {
      setRolePerms(p => ({ ...p, [role]: p[role]?.includes('*') ? [] : ['*'] }));
    } else if (perms.includes('*')) {
      const allPerms = Object.values(PERMISSION_GROUPS).flat();
      const newPerms = allPerms.filter(p => p !== perm);
      setRolePerms(p => ({ ...p, [role]: newPerms }));
    } else if (perms.includes(perm)) {
      setRolePerms(p => ({ ...p, [role]: perms.filter(x => x !== perm) }));
    } else {
      setRolePerms(p => ({ ...p, [role]: [...perms, perm] }));
    }
    onChange('permissions', { ...rolePerms, [role]: perms.includes(perm) ? perms.filter(x => x !== perm) : perms.includes('*') ? Object.values(PERMISSION_GROUPS).flat().filter(x => x !== perm) : [...perms, perm] });
  };

  const [expandedRole, setExpandedRole] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Roles & Permissions</h2>
        <p className="text-xs text-gray-400">Changes saved with Settings</p>
      </div>
      <div className="space-y-4">
        {ROLES.map(role => {
          const isExpanded = expandedRole === role;
          const perms = rolePerms[role] || [];
          const isWildcard = perms.includes('*');
          return (
            <div key={role} className="border border-gray-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => setExpandedRole(isExpanded ? null : role)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">{ROLE_LABELS[role]}</span>
                  {isWildcard && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">All permissions</span>}
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-200 px-4 py-3 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Full Access (wildcard)</p>
                      <p className="text-xs text-gray-500">Grants all current and future permissions</p>
                    </div>
                    <ToggleSwitch checked={isWildcard} onChange={(v) => { setRolePerms(p => ({ ...p, [role]: v ? ['*'] : Object.values(PERMISSION_GROUPS).flat() })); onChange('permissions', { ...rolePerms, [role]: v ? ['*'] : Object.values(PERMISSION_GROUPS).flat() }); }} />
                  </div>
                  {!isWildcard && Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                    <div key={group}>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2 capitalize">{group}</p>
                      <div className="space-y-2">
                        {perms.map(perm => (
                          <div key={perm} className="flex items-center justify-between pl-4">
                            <label htmlFor={`${role}-${perm}`} className="text-sm text-gray-700 cursor-pointer">{PERMISSION_LABELS[perm]}</label>
                            <ToggleSwitch id={`${role}-${perm}`} checked={hasPermission(role, perm)} onChange={() => togglePermission(role, perm)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PixelTrackingSettings() {
  const { success, error } = useNotifications();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [pixelName, setPixelName] = useState('');
  const [newPixelId, setNewPixelId] = useState('');
  const [selectedPixel, setSelectedPixel] = useState(null);

  const { data: pixels = [], isLoading } = useQuery({
    queryKey: ['pixels'],
    queryFn: async () => { const r = await api.get('/api/pixel/list'); return r.data; },
    staleTime: 10000,
  });

  const createPixel = useMutation({
    mutationFn: (name) => api.post('/api/pixel/create', { name }),
    onSuccess: (res) => { setNewPixelId(res.data.pixel_id); setShowCreate(false); setPixelName(''); success('Pixel created'); queryClient.invalidateQueries({ queryKey: ['pixels'] }); },
    onError: () => error('Failed to create pixel'),
  });

  const { data: snippetData } = useQuery({
    queryKey: ['pixel-snippet', selectedPixel],
    queryFn: async () => { const r = await api.get(`/api/pixel/snippet/${selectedPixel}`); return r.data; },
    enabled: !!selectedPixel,
  });

  const { data: analytics, isLoading: alLoading } = useQuery({
    queryKey: ['pixel-analytics', selectedPixel],
    queryFn: async () => { const r = await api.get('/api/pixel/analytics', { params: { days: 30 } }); return r.data; },
    enabled: !!selectedPixel,
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Tracking Pixels</h2>
        <button type="button" onClick={() => setShowCreate(true)} className="btn-primary text-sm">+ New Pixel</button>
      </div>
      <p className="text-sm text-gray-500">Create and manage tracking pixels to monitor website traffic and campaign conversions.</p>

      {newPixelId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-800">New Pixel Created</p>
          <p className="text-xs font-mono break-all text-yellow-700 mt-1 bg-yellow-100 p-2 rounded">{newPixelId}</p>
          <p className="text-xs text-red-600 mt-1">⚠ Save this ID - it will not be shown again.</p>
          <button onClick={() => setNewPixelId('')} className="text-xs text-yellow-700 underline mt-1">Dismiss</button>
        </div>
      )}

      {showCreate && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pixel Name</label>
            <input type="text" value={pixelName} onChange={e => setPixelName(e.target.value)} className="input" placeholder="e.g. Landing Page Pixel" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => createPixel.mutate(pixelName || 'Untitled Pixel')} disabled={createPixel.isPending} className="btn-primary text-sm">{createPixel.isPending ? 'Creating...' : 'Create'}</button>
            <button onClick={() => setShowCreate(false)} className="btn-outline text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Pixels list */}
      {isLoading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : pixels.length === 0 ? (
        <p className="text-sm text-gray-400">No tracking pixels yet. Create one to start tracking.</p>
      ) : (
        <div className="space-y-3">
          {pixels.map(p => (
            <div key={p.pixel_id} className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedPixel === p.pixel_id ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setSelectedPixel(selectedPixel === p.pixel_id ? null : p.pixel_id)}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-900 text-sm font-mono text-xs">ID: {p.pixel_id.slice(0, 8)}…{p.pixel_id.slice(-4)}</p>
                <span className="text-xs text-gray-500">{p.event_count} events</span>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>Active days: {p.active_days}</span>
                {p.last_event && <span>Last: {new Date(p.last_event).toLocaleDateString()}</span>}
              </div>
              {selectedPixel === p.pixel_id && snippetData && (
                <div className="mt-3 border-t pt-3 space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-1">Embed Snippet</h4>
                    <div className="relative">
                      <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto max-h-32 font-mono">{snippetData.snippet}</pre>
                      <button onClick={() => copyToClipboard(snippetData.snippet)} className="absolute top-1 right-1 bg-gray-700 text-white text-xs px-2 py-0.5 rounded hover:bg-gray-600">Copy</button>
                    </div>
                  </div>
                  {analytics && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Analytics (30 days)</h4>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="bg-blue-50 rounded p-2 text-center"><p className="text-lg font-bold text-blue-700">{analytics.totals?.today || 0}</p><p className="text-[10px] text-blue-600">Today</p></div>
                        <div className="bg-green-50 rounded p-2 text-center"><p className="text-lg font-bold text-green-700">{analytics.totals?.week || 0}</p><p className="text-[10px] text-green-600">This Week</p></div>
                        <div className="bg-purple-50 rounded p-2 text-center"><p className="text-lg font-bold text-purple-700">{analytics.totals?.month || 0}</p><p className="text-[10px] text-purple-600">This Month</p></div>
                      </div>
                      {analytics.events?.length > 0 && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead><tr className="bg-gray-50 text-left"><th className="px-2 py-1 text-gray-500">Event Type</th><th className="px-2 py-1 text-gray-500 text-right">Count</th><th className="px-2 py-1 text-gray-500 text-right">Value</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                              {analytics.events.map(e => (
                                <tr key={e.event_type}><td className="px-2 py-1 text-gray-900">{e.event_type}</td><td className="px-2 py-1 text-right text-gray-700">{e.count}</td><td className="px-2 py-1 text-right text-gray-700">{parseFloat(e.total_value || 0).toFixed(2)}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecuritySection() {
  const { success, error } = useNotifications();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [twofaEnabled, setTwofaEnabled] = useState(user?.two_factor_enabled === 1);

  const setup2fa = useMutation({
    mutationFn: () => api.post('/api/auth/setup-2fa'),
    onSuccess: (res) => { setSecret(res.data.secret); setQrUrl(res.data.url); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

  const verify2fa = useMutation({
    mutationFn: () => api.post('/api/auth/verify-2fa', { code }),
    onSuccess: () => { success('2FA enabled'); setCode(''); setQrUrl(''); setTwofaEnabled(true); },
    onError: (err) => error(err?.response?.data?.error || 'Invalid code'),
  });

  const disable2fa = useMutation({
    mutationFn: () => api.post('/api/auth/disable-2fa'),
    onSuccess: () => { success('2FA disabled'); setTwofaEnabled(false); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

  const changePass = useMutation({
    mutationFn: () => api.post('/api/auth/change-password', { currentPassword: currentPass, newPassword: newPass }),
    onSuccess: () => { success('Password changed'); setCurrentPass(''); setNewPass(''); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-4 mt-2">
      <div className="border-t pt-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Two-Factor Authentication</h4>
        {twofaEnabled && !qrUrl ? (
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ Enabled</span>
            <button onClick={() => { if (confirm('Disable two-factor authentication?')) disable2fa.mutate(); }} disabled={disable2fa.isPending} className="btn-outline text-xs text-red-600">Disable 2FA</button>
          </div>
        ) : qrUrl ? (
          <div className="space-y-2 mb-2">
            <p className="text-xs text-gray-500">Scan this URL in your authenticator app (e.g., Google Authenticator):</p>
            <div className="bg-gray-50 border rounded p-2 text-xs font-mono break-all text-gray-600">{qrUrl}</div>
            <p className="text-xs text-gray-500">Or use secret: <code className="font-mono bg-gray-100 px-1">{secret.slice(0, 16)}</code></p>
            <div className="flex items-center gap-2">
              <input type="text" value={code} onChange={e => setCode(e.target.value)} className="input text-xs w-32" placeholder="000000" maxLength={6} />
              <button onClick={verify2fa.mutate} disabled={code.length !== 6 || verify2fa.isPending} className="btn-primary text-xs">Verify & Enable</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-2">Add an extra layer of security to your account.</p>
            <button onClick={setup2fa.mutate} disabled={setup2fa.isPending} className="btn-primary text-xs">Set Up 2FA</button>
          </div>
        )}
      </div>

      <div className="border-t pt-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Change Password</h4>
        <div className="grid grid-cols-2 gap-2 max-w-md">
          <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="input text-xs" placeholder="Current password" />
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="input text-xs" placeholder="New password (min 8 chars)" />
        </div>
        <button onClick={changePass.mutate} disabled={!currentPass || !newPass || newPass.length < 8 || changePass.isPending} className="btn-primary text-xs mt-2">Change Password</button>
      </div>
    </div>
  );
}
