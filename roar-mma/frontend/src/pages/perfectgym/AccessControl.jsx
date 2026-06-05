import { useState } from 'react';

const MEMBERSHIP_TIERS = ['Basic', 'Standard', 'Premium', 'Corporate', 'Day Pass'];
const LOCATIONS = ['Perth CBD', 'Fremantle', 'Joondalup', 'Rockingham', 'Midland'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AccessControl() {
  const [rules, setRules] = useState([
    { id: 1, tier: 'Premium', from: '00:00', to: '23:59', locations: ['Perth CBD', 'Fremantle', 'Joondalup'], active: true },
    { id: 2, tier: 'Standard', from: '06:00', to: '22:00', locations: ['Perth CBD'], active: true },
    { id: 3, tier: 'Day Pass', from: '08:00', to: '20:00', locations: ['Perth CBD', 'Fremantle'], active: true },
  ]);

  const [form, setForm] = useState({
    tier: MEMBERSHIP_TIERS[0],
    from: '06:00',
    to: '22:00',
    locations: [],
  });
  const [showForm, setShowForm] = useState(false);

  const toggleLocation = (loc) => {
    setForm(prev => ({
      ...prev,
      locations: prev.locations.includes(loc)
        ? prev.locations.filter(l => l !== loc)
        : [...prev.locations, loc],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.locations.length === 0) return;
    setRules([...rules, { ...form, id: Date.now(), active: true }]);
    setForm({ tier: MEMBERSHIP_TIERS[0], from: '06:00', to: '22:00', locations: [] });
    setShowForm(false);
  };

  const toggleRule = (id) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Control</h1>
          <p className="text-sm text-gray-500">Manage RFID / QR code access rules per membership tier</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ New Rule'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Access Rule</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Membership Tier</label>
              <select className="input" value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })}>
                {MEMBERSHIP_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input className="input" type="time" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input className="input" type="time" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Locations</label>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map(loc => (
                <button key={loc} type="button" onClick={() => toggleLocation(loc)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.locations.includes(loc)
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-success">Save Rule</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {rules.map(rule => (
          <div key={rule.id} className={`card ${!rule.active ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{rule.tier}</h3>
                <span className={`badge ${rule.active ? 'badge-green' : 'badge-gray'}`}>
                  {rule.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button onClick={() => toggleRule(rule.id)} className="btn btn-ghost text-sm">
                {rule.active ? 'Disable' : 'Enable'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Access Hours:</span>
                <span className="ml-2 font-medium text-gray-900">{rule.from} – {rule.to}</span>
              </div>
              <div>
                <span className="text-gray-500">Locations:</span>
                <div className="inline-flex flex-wrap gap-1 ml-2">
                  {rule.locations.map(loc => (
                    <span key={loc} className="badge badge-blue">{loc}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
