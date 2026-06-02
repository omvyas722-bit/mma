import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

export default function WorkflowBuilder() {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', trigger_type: '', action_type: '', trigger_config: {}, action_config: {}, condition_type: 'all', conditions: [] });

  const { data: rules, isLoading } = useQuery({ queryKey: ['workflows'], queryFn: () => api.get('/api/workflows').then(r => r.data) });
  const { data: triggers } = useQuery({ queryKey: ['workflow-triggers'], queryFn: () => api.get('/api/workflows/trigger-types').then(r => r.data), staleTime: Infinity });
  const { data: actions } = useQuery({ queryKey: ['workflow-actions'], queryFn: () => api.get('/api/workflows/action-types').then(r => r.data), staleTime: Infinity });

  const save = useMutation({
    mutationFn: (d) => editing ? api.put(`/api/workflows/${editing}`, d) : api.post('/api/workflows', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workflows'] }); setShowForm(false); setEditing(null); setForm({ name: '', description: '', trigger_type: '', action_type: '', trigger_config: {}, action_config: {}, condition_type: 'all', conditions: [] }); success(editing ? 'Rule updated' : 'Rule created'); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

  const toggle = useMutation({
    mutationFn: (id) => api.post(`/api/workflows/${id}/toggle`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workflows'] }); },
  });

  const deleteRule = useMutation({
    mutationFn: (id) => api.delete(`/api/workflows/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workflows'] }); success('Rule deleted'); },
  });

  const editRule = (r) => {
    setForm({
      name: r.name, description: r.description || '',
      trigger_type: r.trigger_type, action_type: r.action_type,
      trigger_config: (typeof r.trigger_config === 'string' ? JSON.parse(r.trigger_config) : r.trigger_config) || {},
      action_config: (typeof r.action_config === 'string' ? JSON.parse(r.action_config) : r.action_config) || {},
      condition_type: r.condition_type || 'all',
      conditions: (typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions) || [],
    });
    setEditing(r.id);
    setShowForm(true);
  };

  const triggerLabel = triggers?.find(t => t.value === form.trigger_type)?.label || form.trigger_type;
  const actionLabel = actions?.find(a => a.value === form.action_type)?.label || form.action_type;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workflow Builder</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', description: '', trigger_type: '', action_type: '', trigger_config: {}, action_config: {}, condition_type: 'all', conditions: [] }); }} className="btn-primary text-sm">+ New Rule</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Rule' : 'New Automation Rule'}</h2>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Rule Name</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input text-sm w-full" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="input text-sm w-full" /></div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Trigger</label>
                <select value={form.trigger_type} onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))} className="input text-sm w-full">
                  <option value="">Select trigger...</option>
                  {triggers?.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
                <select value={form.action_type} onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))} className="input text-sm w-full">
                  <option value="">Select action...</option>
                  {actions?.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              {form.action_type === 'create_task' && (
                <div className="space-y-2 border rounded p-3 bg-gray-50">
                  <p className="text-xs font-medium text-gray-600">Task Config</p>
                  <input type="text" placeholder="Task title" value={form.action_config?.title || ''} onChange={e => setForm(f => ({ ...f, action_config: { ...f.action_config, title: e.target.value } }))} className="input text-sm w-full" />
                  <textarea placeholder="Task description" value={form.action_config?.description || ''} onChange={e => setForm(f => ({ ...f, action_config: { ...f.action_config, description: e.target.value } }))} rows={2} className="input text-sm w-full" />
                  <select value={form.action_config?.priority || 'medium'} onChange={e => setForm(f => ({ ...f, action_config: { ...f.action_config, priority: e.target.value } }))} className="input text-sm w-full">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
              )}
              {form.action_type === 'send_sms' && (
                <div className="space-y-2 border rounded p-3 bg-gray-50">
                  <p className="text-xs font-medium text-gray-600">SMS Config</p>
                  <input type="text" placeholder="Message" value={form.action_config?.message || ''} onChange={e => setForm(f => ({ ...f, action_config: { ...f.action_config, message: e.target.value } }))} className="input text-sm w-full" />
                </div>
              )}
              {form.action_type === 'update_lead_stage' && (
                <div className="space-y-2 border rounded p-3 bg-gray-50">
                  <p className="text-xs font-medium text-gray-600">Lead Stage Config</p>
                  <select value={form.action_config?.stage || 'contacted'} onChange={e => setForm(f => ({ ...f, action_config: { ...f.action_config, stage: e.target.value } }))} className="input text-sm w-full">
                    <option value="contacted">Contacted</option><option value="trial_booked">Trial Booked</option><option value="trial_completed">Trial Completed</option><option value="converted">Converted</option><option value="lost">Lost</option>
                  </select>
                </div>
              )}
              {form.action_type === 'webhook' && (
                <div className="space-y-2 border rounded p-3 bg-gray-50">
                  <p className="text-xs font-medium text-gray-600">Webhook Config</p>
                  <input type="url" placeholder="https://..." value={form.action_config?.url || ''} onChange={e => setForm(f => ({ ...f, action_config: { ...f.action_config, url: e.target.value } }))} className="input text-sm w-full" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button>
              <button onClick={() => save.mutate(form)} disabled={save.isPending || !form.name || !form.trigger_type || !form.action_type} className="btn-primary text-sm">{save.isPending ? 'Saving...' : 'Save Rule'}</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? <p className="text-sm text-gray-400">Loading...</p> : !rules?.length ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-2">No automation rules yet</p>
          <p className="text-xs text-gray-400">Create rules to automate tasks, SMS, lead updates, and more.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(r => (
            <div key={r.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${r.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <h3 className="font-medium text-sm">{r.name}</h3>
                  </div>
                  {r.description && <p className="text-xs text-gray-500 mt-1">{r.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{triggerLabel}</span>
                    <span>→</span>
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{actionLabel}</span>
                    <span className="text-gray-300">|</span>
                    <span>by {r.created_by_name || 'System'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggle.mutate(r.id)} className={`text-xs px-2 py-1 rounded ${r.enabled ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{r.enabled ? 'Disable' : 'Enable'}</button>
                  <button onClick={() => editRule(r)} className="text-xs text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => { if (window.confirm('Delete this rule?')) deleteRule.mutate(r.id); }} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}