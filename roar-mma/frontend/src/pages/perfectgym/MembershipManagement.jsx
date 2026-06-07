import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';

const PLAN_TYPES = [
  { value: 'rolling', label: 'Rolling' },
  { value: 'fixed-term', label: 'Fixed-Term' },
  { value: 'corporate', label: 'Corporate' },
];

const DEFAULT_PLANS = [
  { id: 1, name: 'Unlimited MMA', type: 'rolling', price: 89, freeze: true, autoRenew: true, active: true },
  { id: 2, name: '2x Week', type: 'rolling', price: 59, freeze: false, autoRenew: true, active: true },
  { id: 3, name: 'Corporate Platinum', type: 'corporate', price: 129, freeze: true, autoRenew: true, active: true },
];

export default function MembershipManagement() {
  const [plans, setPlans] = useState(() => {
    const saved = localStorage.getItem('pg_plans');
    return saved ? JSON.parse(saved) : DEFAULT_PLANS;
  });
  const [form, setForm] = useState({ name: '', type: 'rolling', price: '', freeze: false, autoRenew: true });
  const [showForm, setShowForm] = useState(false);

  const persistPlans = useMutation({
    mutationFn: (p) => api.put('/api/settings', { membershipPlans: p }).catch(() => {}),
  });

  const savePlans = (updated) => {
    setPlans(updated);
    localStorage.setItem('pg_plans', JSON.stringify(updated));
    persistPlans.mutate(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    savePlans([...plans, { ...form, id: Date.now(), price: Number(form.price), active: true }]);
    setForm({ name: '', type: 'rolling', price: '', freeze: false, autoRenew: true });
    setShowForm(false);
  };

  const toggleActive = (id) => {
    savePlans(plans.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membership Management</h1>
          <p className="text-sm text-gray-500">Create and manage membership plans</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ New Plan'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Membership Plan</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
              <input
                className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Unlimited MMA" required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {PLAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($/month)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })} placeholder="89" required
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.freeze} onChange={e => setForm({ ...form, freeze: e.target.checked })} />
                <span className="text-sm text-gray-700">Allow Freeze</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.autoRenew} onChange={e => setForm({ ...form, autoRenew: e.target.checked })} />
                <span className="text-sm text-gray-700">Auto-Renew</span>
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn btn-success">Save Plan</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className={`card ${!plan.active ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <span className={`badge ${plan.active ? 'badge-green' : 'badge-gray'}`}>
                {plan.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-4">${plan.price}<span className="text-sm font-normal text-gray-500">/mo</span></div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span>Type</span><span className="font-medium capitalize">{plan.type}</span></div>
              <div className="flex justify-between"><span>Freeze Allowance</span><span className="font-medium">{plan.freeze ? 'Yes' : 'No'}</span></div>
              <div className="flex justify-between"><span>Auto-Renew</span><span className="font-medium">{plan.autoRenew ? 'Yes' : 'No'}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button onClick={() => toggleActive(plan.id)} className={`btn ${plan.active ? 'btn-ghost' : 'btn-success'} w-full`}>
                {plan.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
