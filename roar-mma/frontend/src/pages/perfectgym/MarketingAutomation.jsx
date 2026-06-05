import { useState } from 'react';

const TRIGGERS = [
  { value: 'member_joined', label: 'Member Joined' },
  { value: 'inactive_7', label: 'Inactive 7 Days' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'expiry_7', label: 'Expiry in 7 Days' },
];

const ACTIONS = [
  { value: 'email', label: 'Send Email' },
  { value: 'sms', label: 'Send SMS' },
  { value: 'push', label: 'Send Push' },
];

const MESSAGE_PREVIEWS = {
  member_joined: 'Welcome to [Gym Name], [Name]! We are thrilled to have you. Your [Membership Type] membership is now active.',
  inactive_7: 'Hi [Name], we have missed you! It has been 7 days since your last visit. Come back and crush your goals.',
  birthday: 'Happy Birthday, [Name]! Celebrate with a free class on us. Show this at reception.',
  expiry_7: 'Hi [Name], your membership expires in 7 days. Renew now to keep your [Membership Type] plan active.',
};

export default function MarketingAutomation() {
  const [trigger, setTrigger] = useState('member_joined');
  const [delay, setDelay] = useState(1);
  const [action, setAction] = useState('email');
  const [workflows, setWorkflows] = useState([
    { id: 1, trigger: 'member_joined', delay: 1, action: 'email', active: true },
    { id: 2, trigger: 'inactive_7', delay: 1, action: 'sms', active: true },
  ]);

  const addWorkflow = () => {
    setWorkflows([...workflows, { id: Date.now(), trigger, delay, action, active: true }]);
  };

  const toggleWorkflow = (id) => {
    setWorkflows(workflows.map(w => w.id === id ? { ...w, active: !w.active } : w));
  };

  const triggerLabel = (val) => TRIGGERS.find(t => t.value === val)?.label || val;
  const actionLabel = (val) => ACTIONS.find(a => a.value === val)?.label || val;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Automation</h1>
          <p className="text-sm text-gray-500">Build trigger-based email, SMS, and push notification workflows</p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Builder</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">1. Trigger</label>
            <select className="input" value={trigger} onChange={e => setTrigger(e.target.value)}>
              {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">2. Delay (days)</label>
            <input className="input" type="number" min="0" max="30" value={delay}
              onChange={e => setDelay(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">3. Action</label>
            <select className="input" value={action} onChange={e => setAction(e.target.value)}>
              {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Message Preview</p>
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
            {MESSAGE_PREVIEWS[trigger]}
          </div>
          <p className="text-xs text-gray-400 mt-1">Personalisation tokens: [Name], [Gym Name], [Membership Type]</p>
        </div>

        <button onClick={addWorkflow} className="btn btn-primary">
          + Add Workflow
        </button>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Workflows</h2>
        {workflows.length === 0 ? (
          <p className="text-sm text-gray-500">No workflows configured yet.</p>
        ) : (
          <div className="space-y-3">
            {workflows.map(w => (
              <div key={w.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className={`badge ${w.active ? 'badge-green' : 'badge-gray'}`}>
                    {w.active ? 'Active' : 'Paused'}
                  </span>
                  <span className="text-gray-900 font-medium">{triggerLabel(w.trigger)}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-600">Wait {w.delay}d</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-900 font-medium">{actionLabel(w.action)}</span>
                </div>
                <button onClick={() => toggleWorkflow(w.id)} className="text-sm text-gray-500 hover:text-gray-700">
                  {w.active ? 'Pause' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
