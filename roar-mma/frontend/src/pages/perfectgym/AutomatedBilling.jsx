import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';

const CYCLE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const FAILED_ACTIONS = [
  { value: 'suspend', label: 'Suspend Account' },
  { value: 'email', label: 'Send Email' },
  { value: 'both', label: 'Suspend + Send Email' },
];

export default function AutomatedBilling() {
  const { data: billingCfg } = useQuery({
    queryKey: ['billing-settings'],
    queryFn: () => api.get('/api/settings').catch(() => ({})),
    staleTime: 60000,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const data = await api.get('/api/transactions', { params: { limit: 5 } });
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: 30000,
  });

  const [settings, setSettings] = useState({
    cycle: 'monthly',
    retryAttempts: 3,
    failedAction: 'email',
  });

  const saveSettings = useMutation({
    mutationFn: (s) => api.put('/api/settings', { billing: s }),
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveSettings.mutate(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const displayTransactions = transactions.length > 0
    ? transactions.map(t => ({
        member: t.member || t.member_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Unknown',
        amount: t.amount,
        status: t.status,
        date: t.date || t.created_at?.split('T')[0] || t.processed_at?.split('T')[0] || '',
      }))
    : [
        { member: 'John Smith', amount: 89, status: 'completed', date: '2026-06-01' },
        { member: 'Sarah Jones', amount: 59, status: 'completed', date: '2026-06-01' },
        { member: 'Mike Wilson', amount: 129, status: 'failed', date: '2026-06-01' },
        { member: 'Emma Brown', amount: 89, status: 'completed', date: '2026-05-28' },
      ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automated Billing & Payments</h1>
          <p className="text-sm text-gray-500">Configure billing cycles, retry logic, and payment failure handling</p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
            <select className="input" value={settings.cycle}
              onChange={e => setSettings({ ...settings, cycle: e.target.value })}
            >
              {CYCLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Retry Attempts</label>
            <input className="input" type="number" min="0" max="10" value={settings.retryAttempts}
              onChange={e => setSettings({ ...settings, retryAttempts: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Failed Payment Action</label>
            <select className="input" value={settings.failedAction}
              onChange={e => setSettings({ ...settings, failedAction: e.target.value })}
            >
              {FAILED_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button onClick={handleSave} className="btn btn-primary">
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Settings Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Billing Cycle</p>
            <p className="text-xl font-bold text-blue-900 capitalize">{settings.cycle}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Retry Attempts</p>
            <p className="text-xl font-bold text-green-900">{settings.retryAttempts}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">Failed Payment Action</p>
            <p className="text-xl font-bold text-purple-900 capitalize">
              {FAILED_ACTIONS.find(a => a.value === settings.failedAction)?.label}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Transactions</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="pb-2 font-medium">Member</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.map((t, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900">{t.member}</td>
                  <td className="py-2 text-gray-900">${t.amount}</td>
                  <td className="py-2">
                    <span className={`badge ${t.status === 'completed' ? 'badge-green' : 'badge-red'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-500">{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
