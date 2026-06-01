import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

export default function Communications() {
  const [activeTab, setActiveTab] = useState('history');
  const [showCompose, setShowCompose] = useState(false);

  const { data: history = [], isLoading: histLoading, isError: histError, refetch: refetchHist } = useQuery({
    queryKey: ['scheduled-messages'],
    queryFn: async () => { const r = await api.get('/api/scheduled-messages'); return r.data?.scheduled_messages || []; },
    retry: 2,
    staleTime: 10000,
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
        <button onClick={() => setShowCompose(true)} className="btn-primary text-sm">+ Compose Message</button>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <nav className="flex border-b border-gray-200 overflow-x-auto" role="tablist">
          {['history', 'templates', 'scheduled', 'approval'].map(tab => (
            <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab === 'approval' ? 'Pending Approval' : tab}
            </button>
          ))}
        </nav>
      </div>

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} />}

      {activeTab === 'history' && (
        <CardList items={history} loading={histLoading} error={histError} onRetry={refetchHist}
          emptyMsg="No messages sent yet"
          renderItem={(msg) => (
            <div key={msg.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{msg.subject || msg.body?.slice(0, 60) || `Message #${msg.id}`}</span>
                    <TypeBadge type={msg.message_type} />
                    <StatusBadge status={msg.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {msg.scheduled_for ? new Date(msg.scheduled_for + 'Z').toLocaleString() : ''}
                    {msg.recipient_count ? ` · ${msg.recipient_count} recipients` : ''}
                  </p>
                </div>
              </div>
            </div>
          )} />
      )}

      {activeTab === 'templates' && <TemplatesPanel />}
      {activeTab === 'scheduled' && <ScheduledPanel />}
      {activeTab === 'approval' && <ApprovalPanel />}
    </div>
  );
}

function CardList({ items, loading, error, onRetry, emptyMsg, renderItem }) {
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert"><p className="text-red-700 text-sm mb-3">Failed to load</p><button onClick={onRetry} className="text-sm text-red-600 underline">Try again</button></div>;
  if (loading) return <div className="bg-white rounded-lg shadow p-4 space-y-3 animate-pulse" aria-label="Loading">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded"></div>)}</div>;
  if (items.length === 0) return <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">{emptyMsg}</p></div>;
  return <div className="bg-white rounded-lg shadow divide-y divide-gray-200">{items.map(renderItem)}</div>;
}

function ComposeModal({ onClose }) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [form, setForm] = useState({ type: 'email', recipients: 'all_active', subject: '', body: '', schedule: '' });
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const send = useMutation({
    mutationFn: () => api.post('/api/scheduled-messages', {
      message_type: form.type, recipient_group: form.recipients,
      subject: form.subject, body: form.body,
      scheduled_for: form.schedule || new Date().toISOString(),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['scheduled-messages'] }); success('Message queued'); onClose(); },
    onError: (err) => error(err?.response?.data?.error || 'Failed to send'),
  });

  const isValid = form.body.trim() && (form.type !== 'email' && form.type !== 'both' || form.subject.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="compose-title">
        <h2 id="compose-title" className="text-lg font-semibold mb-4">Compose Message</h2>
        <div className="space-y-3">
          <fieldset>
            <legend className="text-xs font-medium text-gray-700 mb-1">Channel</legend>
            <div className="flex gap-3">
              {['email', 'sms', 'both'].map(t => (
                <label key={t} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" checked={form.type === t} onChange={() => u('type', t)} className="accent-red-600" />
                  {t.toUpperCase()}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Recipients</label>
            <select value={form.recipients} onChange={e => u('recipients', e.target.value)} className="input text-sm w-full">
              <option value="all_active">All Active Members</option>
              <option value="all_trial">All Trial Members</option>
              <option value="all_paused">All Paused Members</option>
              <option value="location_rockingham">Rockingham Location</option>
              <option value="location_bibra_lake">Bibra Lake Location</option>
              <option value="membership_unlimited">Unlimited Plan</option>
              <option value="membership_2x">2x Week Plan</option>
              <option value="membership_3x">3x Week Plan</option>
            </select>
          </div>
          {(form.type === 'email' || form.type === 'both') && (
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Subject</label><input type="text" value={form.subject} onChange={e => u('subject', e.target.value)} className="input text-sm w-full" placeholder="Message subject" /></div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Message <span className="text-gray-400">(use {'{'}first_name{'}'}, {'{'}class_name{'}'}, {'{'}date{'}'})</span></label>
            <textarea rows={5} value={form.body} onChange={e => u('body', e.target.value)} className="input text-sm w-full" placeholder="Type your message..." />
            {form.type === 'sms' && <p className="text-xs text-gray-400 mt-1">{form.body.length}/160 characters</p>}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!form.schedule} onChange={e => u('schedule', e.target.checked ? new Date(Date.now() + 3600000).toISOString().slice(0, 16) : '')} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
              Schedule for later
            </label>
            {form.schedule && <input type="datetime-local" value={form.schedule} onChange={e => u('schedule', e.target.value)} className="input text-sm mt-1 w-full" />}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-outline text-sm">Cancel</button>
          <button onClick={send.mutate} disabled={!isValid || send.isPending} className="btn-primary text-sm">{send.isPending ? 'Sending...' : form.schedule ? 'Schedule' : 'Send Now'}</button>
        </div>
      </div>
    </div>
  );
}

function TemplatesPanel() {
  const { data: templates = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => { const r = await api.get('/api/message-templates'); return r.data?.templates || []; },
    retry: 2,
  });

  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  const deleteTemplate = useMutation({
    mutationFn: (id) => api.delete(`/api/message-templates/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['message-templates'] }); success('Template deleted'); },
    onError: () => error('Failed to delete'),
  });

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Message Templates</h2>
      </div>
      {isError ? <div className="text-center py-8"><p className="text-red-500 text-sm">Failed to load. <button onClick={refetch} className="underline">Retry</button></p></div> :
      isLoading ? <div className="p-4 space-y-3 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded"></div>)}</div> :
      templates.length === 0 ? <div className="text-center py-12"><p className="text-gray-500">No templates</p></div> :
      <div className="divide-y divide-gray-200">
        {templates.map(t => (
          <div key={t.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{t.name}</span>
                  <TypeBadge type={t.type} />
                  {t.trigger_event && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t.trigger_event}</span>}
                </div>
                {t.subject && <p className="text-xs text-gray-500 truncate">{t.subject}</p>}
                <p className="text-xs text-gray-400 line-clamp-2 mt-1">{t.body}</p>
              </div>
              <div className="flex gap-2 ml-2">
                <button onClick={() => deleteTemplate.mutate(t.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}

function ScheduledPanel() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const { data: scheduled = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['scheduled-messages', 'pending'],
    queryFn: async () => { const r = await api.get('/api/scheduled-messages?status=pending'); return r.data?.scheduled_messages || []; },
    retry: 2,
  });

  const cancel = useMutation({
    mutationFn: (id) => api.post(`/api/scheduled-messages/${id}/cancel`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['scheduled-messages'] }); success('Cancelled'); },
    onError: () => error('Failed to cancel'),
  });

  if (isError) return <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert"><button onClick={refetch} className="text-sm text-red-600 underline">Retry</button></div>;
  if (isLoading) return <div className="bg-white rounded-lg shadow p-4 space-y-3 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded"></div>)}</div>;
  if (scheduled.length === 0) return <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No scheduled messages</p></div>;

  return (
    <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
      {scheduled.map(msg => (
        <div key={msg.id} className="p-4 hover:bg-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{msg.subject || msg.body?.slice(0, 60) || `Message #${msg.id}`}</p>
              <p className="text-xs text-gray-500">Scheduled for {msg.scheduled_for ? new Date(msg.scheduled_for + 'Z').toLocaleString() : '—'}</p>
            </div>
            <button onClick={() => cancel.mutate(msg.id)} className="text-xs text-red-600 hover:underline">Cancel</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ApprovalPanel() {
  const { data: approvals = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-pending-approval'],
    queryFn: async () => { const r = await api.get('/api/ai/pending-approval'); return r.data?.pending || []; },
    retry: 2,
    refetchInterval: 15000,
  });

  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  const approve = useMutation({
    mutationFn: (id) => api.post(`/api/ai/approve/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-pending-approval'] }); success('Approved'); },
    onError: () => error('Failed to approve'),
  });

  const reject = useMutation({
    mutationFn: (id) => api.post(`/api/ai/reject/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-pending-approval'] }); success('Rejected'); },
    onError: () => error('Failed to reject'),
  });

  if (isError) return <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert"><button onClick={refetch} className="text-sm text-red-600 underline">Retry</button></div>;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b bg-orange-50">
        <p className="text-sm font-medium text-orange-700">AI-generated messages to leads require human review before sending</p>
      </div>
      {isLoading ? (
        <div className="p-4 space-y-3 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded"></div>)}</div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-12"><p className="text-gray-500">No messages pending approval</p></div>
      ) : (
        <div className="divide-y divide-gray-200">
          {approvals.map(a => (
            <div key={a.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{a.subject || `${a.agent || 'AI'} follow-up`}</span>
                    <TypeBadge type={a.channel} />
                  </div>
                  <p className="text-xs text-gray-500 mb-2">To: {a.recipient_name || 'Lead'}</p>
                  <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap">{a.body}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => approve.mutate(a.id)} disabled={approve.isPending} className="text-xs bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 disabled:opacity-40">Approve</button>
                  <button onClick={() => reject.mutate(a.id)} disabled={reject.isPending} className="text-xs bg-red-600 text-white px-4 py-1.5 rounded hover:bg-red-700 disabled:opacity-40">Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }) {
  const m = { email: 'bg-blue-100 text-blue-700', sms: 'bg-green-100 text-green-700', both: 'bg-purple-100 text-purple-700' };
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${m[type] || 'bg-gray-100 text-gray-600'}`}>{(type || '').toUpperCase()}</span>;
}

function StatusBadge({ status }) {
  const m = { sent: 'bg-green-100 text-green-700', scheduled: 'bg-yellow-100 text-yellow-700', pending: 'bg-yellow-100 text-yellow-700', failed: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${m[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}
