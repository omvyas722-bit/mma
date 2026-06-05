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
          {['history', 'templates', 'scheduled', 'automated', 'approval'].map(tab => (
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
      {activeTab === 'automated' && <AutomatedMessagesPanel />}
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
  const [recipientMode, setRecipientMode] = useState('group');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: searchResults } = useQuery({
    queryKey: ['member-search', memberSearch],
    queryFn: async () => { const r = await api.get(`/api/members?query=${encodeURIComponent(memberSearch)}&limit=10`); return r.data?.members || []; },
    enabled: memberSearch.length >= 2,
  });

  function toggleMember(m) {
    setSelectedMembers(prev => prev.some(x => x.id === m.id) ? prev.filter(x => x.id !== m.id) : [...prev, m]);
    setMemberSearch('');
  }

  const send = useMutation({
    mutationFn: () => api.post('/api/scheduled-messages', {
      message_type: form.type,
      ...(recipientMode === 'group' ? { recipient_group: form.recipients } : { member_ids: selectedMembers.map(m => m.id) }),
      subject: form.subject, body: form.body,
      scheduled_for: form.schedule || new Date().toISOString(),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['scheduled-messages'] }); success('Message queued'); onClose(); },
    onError: (err) => error(err?.response?.data?.error || 'Failed to send'),
  });

  const isGroupValid = recipientMode === 'group';
  const isIndivValid = recipientMode === 'individual' && selectedMembers.length > 0;
  const isValid = form.body.trim() && (form.type !== 'email' && form.type !== 'both' || form.subject.trim()) && (isGroupValid || isIndivValid);

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
            <label className="block text-xs font-medium text-gray-700 mb-1">Recipient Mode</label>
            <div className="flex gap-3 mb-2">
              {['group', 'individual'].map(m => (
                <label key={m} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" checked={recipientMode === m} onChange={() => setRecipientMode(m)} className="accent-red-600" />
                  {m === 'group' ? 'Group (filter)' : 'Individual (select)'}
                </label>
              ))}
            </div>
            {recipientMode === 'group' ? (
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
            ) : (
              <div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedMembers.map(m => (
                    <span key={m.id} className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                      {m.first_name} {m.last_name}
                      <button type="button" onClick={() => setSelectedMembers(prev => prev.filter(x => x.id !== m.id))} className="hover:text-red-900" aria-label={`Remove ${m.first_name}`}>&times;</button>
                    </span>
                  ))}
                </div>
                <input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="input text-sm w-full" placeholder="Search members by name..." aria-label="Search members" />
                {memberSearch.length >= 2 && searchResults && (
                  <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow">
                    {searchResults.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-500">No members found</p>
                    ) : searchResults.map(m => (
                      <button key={m.id} type="button" onClick={() => toggleMember(m)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between">
                        <span>{m.first_name} {m.last_name}</span>
                        {selectedMembers.some(x => x.id === m.id) && <span className="text-red-600">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
          <button type="button" onClick={() => setShowPreview(true)} disabled={!form.body.trim()} className="btn-outline text-sm">Preview</button>
          <button onClick={send.mutate} disabled={!isValid || send.isPending} className="btn-primary text-sm">{send.isPending ? 'Sending...' : form.schedule ? 'Schedule' : 'Send Now'}</button>
        </div>
        {showPreview && (
          <PreviewModal form={form} recipientMode={recipientMode} selectedMembers={selectedMembers} onClose={() => setShowPreview(false)} />
        )}
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
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '', type: 'email' });

  const deleteTemplate = useMutation({
    mutationFn: (id) => api.delete(`/api/message-templates/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['message-templates'] }); success('Template deleted'); },
    onError: () => error('Failed to delete'),
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/api/message-templates/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['message-templates'] }); setEditing(null); success('Template updated'); },
    onError: () => error('Failed to update'),
  });

  function startEdit(t) {
    setEditing(t.id);
    setForm({ name: t.name, subject: t.subject || '', body: t.body || '', type: t.type || 'email' });
  }

  function saveEdit() {
    updateTemplate.mutate({ id: editing, ...form });
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Message Templates</h2>
      </div>
      {editing && (
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-sm font-semibold mb-3">Edit Template</h3>
          <div className="space-y-2">
            <input type="text" value={form.name} onChange={(e) => setForm(p => ({...p, name: e.target.value}))} className="input text-sm w-full" placeholder="Template name" />
            <div className="flex gap-2">
              <select value={form.type} onChange={(e) => setForm(p => ({...p, type: e.target.value}))} className="input text-sm flex-1">
                <option value="email">Email</option><option value="sms">SMS</option><option value="both">Both</option>
              </select>
              <input type="text" value={form.subject} onChange={(e) => setForm(p => ({...p, subject: e.target.value}))} className="input text-sm flex-1" placeholder="Subject" />
            </div>
            <textarea rows={4} value={form.body} onChange={(e) => setForm(p => ({...p, body: e.target.value}))} className="input text-sm w-full" placeholder="Template body" />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={updateTemplate.isPending} className="btn-primary text-sm">{updateTemplate.isPending ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setEditing(null)} className="btn-outline text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
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
                <button onClick={() => startEdit(t)} className="text-xs text-blue-600 hover:underline">Edit</button>
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

const TRIGGER_LABELS = { birthday: '🎂 Birthday', membership_anniversary: '🎉 Membership Anniversary', inactive_30_days: '👋 30 Days Inactive', trial_expiring: '⏳ Trial Expiring' };

function PreviewModal({ form, recipientMode, selectedMembers, onClose }) {
  const renderBody = form.body
    .replace(/\{first_name\}/g, 'John')
    .replace(/\{last_name\}/g, 'Smith')
    .replace(/\{class_name\}/g, 'BJJ Fundamentals')
    .replace(/\{date\}/g, new Date().toLocaleDateString('en-AU'))
    .replace(/\{time\}/g, new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }));
  const recipients = recipientMode === 'group' ? form.recipients.replace(/_/g, ' ') : selectedMembers.map(m => `${m.first_name} ${m.last_name}`).join(', ');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="text-lg font-semibold mb-4">Preview Message</h3>
        <div className="space-y-3 text-sm">
          <div className="flex gap-2"><span className="text-gray-500 font-medium">To:</span><span className="text-gray-700 capitalize">{recipients}</span></div>
          <div className="flex gap-2"><span className="text-gray-500 font-medium">Channel:</span><span className="text-gray-700 uppercase">{form.type}</span></div>
          {(form.type === 'email' || form.type === 'both') && <div className="flex gap-2"><span className="text-gray-500 font-medium">Subject:</span><span className="text-gray-700">{form.subject || '(no subject)'}</span></div>}
          <div className="border-t pt-3">
            <div className={`p-4 rounded-lg border ${form.type === 'sms' ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
              {form.type === 'email' ? (
                <div className="space-y-2">
                  <div className="border-b pb-2"><p className="font-medium text-base">{form.subject}</p></div>
                  <p className="text-gray-700 whitespace-pre-wrap">{renderBody}</p>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">RM</div>
                  <div><p className="text-xs text-gray-400">ROAR MMA</p><p className="text-gray-800 whitespace-pre-wrap">{renderBody}</p></div>
                </div>
              )}
            </div>
            {form.type === 'sms' && <p className="text-xs text-gray-400 mt-1 text-right">{renderBody.length}/160 characters • ~{Math.ceil(renderBody.length / 160)} SMS</p>}
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="btn-primary text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

function AutomatedMessagesPanel() {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ trigger_event: 'birthday', title: '', body: '', channel: 'email', enabled: 1 });

  const { data: msgs = [], isLoading } = useQuery({ queryKey: ['automated-messages'], queryFn: () => api.get('/api/automated-messages').then(r => r.data?.messages || []) });

  const createTrigger = useMutation({
    mutationFn: (d) => api.post('/api/automated-messages', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['automated-messages'] }); setShowCreate(false); setForm({ trigger_event: 'birthday', title: '', body: '', channel: 'email', enabled: 1 }); success('Trigger created'); },
    onError: () => error('Failed to create'),
  });

  const updateTrigger = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/api/automated-messages/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['automated-messages'] }); setEditing(null); success('Trigger updated'); },
    onError: () => error('Failed to update'),
  });

  const deleteTrigger = useMutation({
    mutationFn: (id) => api.delete(`/api/automated-messages/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['automated-messages'] }); success('Deleted'); },
    onError: () => error('Failed to delete'),
  });

  function TriggerForm({ initial, onSave, onCancel }) {
    const [f, setF] = useState(initial);
    const u = (k, v) => setF(p => ({ ...p, [k]: v }));
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={f.trigger_event} onChange={e => u('trigger_event', e.target.value)} className="input text-sm">
              {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={f.channel} onChange={e => u('channel', e.target.value)} className="input text-sm">
              <option value="email">Email</option><option value="sms">SMS</option><option value="both">Both</option>
            </select>
          </div>
          <input type="text" value={f.title} onChange={e => u('title', e.target.value)} className="input text-sm w-full" placeholder="Trigger title" />
          <textarea rows={3} value={f.body} onChange={e => u('body', e.target.value)} className="input text-sm w-full" placeholder="Message body" />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={f.enabled === 1} onChange={e => u('enabled', e.target.checked ? 1 : 0)} className="accent-red-600" />
            Enabled
          </label>
          <div className="flex gap-2">
            <button onClick={() => onSave(f)} className="btn-primary text-sm">Save</button>
            <button onClick={onCancel} className="btn-outline text-sm">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Automated Triggers</h3>
        <button onClick={() => setShowCreate(true)} className="btn-outline text-xs">+ Add Trigger</button>
      </div>
      {showCreate && (
        <TriggerForm initial={{ trigger_event: 'birthday', title: '', body: '', channel: 'email', enabled: 1 }}
          onSave={(f) => createTrigger.mutate(f)} onCancel={() => setShowCreate(false)} />
      )}
      <div className="space-y-3">
        {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-lg animate-pulse" />)}</div> : msgs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No automated messages configured.</div>
        ) : msgs.map(m => editing === m.id ? (
          <TriggerForm key={m.id} initial={{ trigger_event: m.trigger_event, title: m.title, body: m.body, channel: m.channel, enabled: m.enabled }}
            onSave={(f) => updateTrigger.mutate({ id: m.id, ...f })} onCancel={() => setEditing(null)} />
        ) : (
          <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{TRIGGER_LABELS[m.trigger_event] || m.trigger_event}</span>
                <TypeBadge type={m.channel} />
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${m.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{m.enabled ? 'Active' : 'Disabled'}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{m.title}</p>
              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{m.body}</p>
              {m.last_sent_at && (
                <p className="text-xs text-gray-400 mt-1">Last sent: {new Date(m.last_sent_at).toLocaleDateString('en-AU')}</p>
              )}
            </div>
            <div className="flex gap-2 ml-2 shrink-0">
              <button onClick={() => setEditing(m.id)} className="text-xs text-blue-600 hover:underline">Edit</button>
              <button onClick={() => { if (confirm('Delete this trigger?')) deleteTrigger.mutate(m.id); }} className="text-xs text-red-600 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
