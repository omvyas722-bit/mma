import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import SignWaiverModal from '../components/Waivers/SignWaiverModal';
import { generateWaiverPdf } from '../lib/waiverPdf';

export default function Waivers() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [tab, setTab] = useState('templates');
  const [showSignModal, setShowSignModal] = useState(false);
  const [signingTemplate, setSigningTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', body_text: '' });
  const [editingId, setEditingId] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberId, setMemberId] = useState(null);
  const [parentEmailMember, setParentEmailMember] = useState(null);
  const [parentEmail, setParentEmail] = useState('');
  const [showSignForMinor, setShowSignForMinor] = useState(false);

  const { data: analyticsData } = useQuery({
    queryKey: ['waiver-analytics'],
    queryFn: async () => { const r = await api.get('/api/waivers/analytics'); return r; },
    enabled: tab === 'analytics',
    staleTime: 30000,
  });

  const { data: templatesData, isLoading: tplsLoading } = useQuery({
    queryKey: ['waiver-templates'],
    queryFn: async () => { const r = await api.get('/api/waivers/templates'); return r; },
    staleTime: 300000,
  });
  const templates = templatesData?.templates || [];

  const { data: memberData } = useQuery({
    queryKey: ['member-dob', memberId],
    queryFn: async () => { const r = await api.get(`/api/members/${memberId}`); return r; },
    enabled: !!memberId,
    staleTime: 60000,
  });

  const { data: memberWaiversData, isLoading: waiversLoading } = useQuery({
    queryKey: ['member-waivers', memberId],
    queryFn: async () => { const r = await api.get(`/api/waivers/member/${memberId}`); return r; },
    enabled: !!memberId,
    staleTime: 10000,
  });
  const memberWaiversList = memberWaiversData?.waivers || [];

  const isUnder18 = memberData?.date_of_birth && new Date(memberData.date_of_birth) > new Date(Date.now() - 18 * 365 * 86400000);

  const sendParentLink = useMutation({
    mutationFn: (data) => api.post('/api/waivers/send-parent-link', data),
    onSuccess: () => { success('Parent waiver link sent'); setParentEmailMember(null); setParentEmail(''); queryClient.invalidateQueries({ queryKey: ['waiver-analytics'] }); },
    onError: (err) => error(err?.response?.data?.error || err?.error || 'Failed to send parent link'),
  });

  const createTpl = useMutation({
    mutationFn: (d) => api.post('/api/waivers/templates', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['waiver-templates'] }); setShowForm(false); setForm({ name: '', body_text: '' }); success('Template created'); },
    onError: () => error('Failed to create template'),
  });

  const updateTpl = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/api/waivers/templates/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['waiver-templates'] }); setShowForm(false); setEditingId(null); setForm({ name: '', body_text: '' }); success('Template updated'); },
    onError: () => error('Failed to update template'),
  });

  const deleteTpl = useMutation({
    mutationFn: (id) => api.delete(`/api/waivers/templates/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['waiver-templates'] }); success('Template deleted'); },
    onError: () => error('Failed to delete template'),
  });

  function handleEdit(tpl) {
    setEditingId(tpl.id);
    setForm({ name: tpl.name, body_text: tpl.body_text });
    setShowForm(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.body_text) return;
    if (editingId) {
      updateTpl.mutate({ id: editingId, ...form });
    } else {
      createTpl.mutate(form);
    }
  }

  function handleSign(tpl) {
    setSigningTemplate(tpl);
    setShowSignModal(true);
  }

  async function handleDownloadPdf(waiver, e) {
    e.stopPropagation();
    try {
      const data = await api.get(`/api/waivers/${waiver.id}/pdf`);
      const pdfBlob = generateWaiverPdf(data, data);
      if (!pdfBlob) { error('Failed to generate PDF'); return; }
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = (data.signed_at || '').split('T')[0] || 'unknown';
      a.download = `waiver-${data.first_name}-${data.last_name}-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      error('Failed to download PDF');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Waivers & Documents</h1>
        {tab === 'templates' && (
          <button type="button" onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', body_text: '' }); }} className="btn-primary text-sm">+ New Template</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200" role="tablist">
        {['templates', 'member-waivers', 'analytics'].map(t => (
          <button key={t} type="button" role="tab" aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >{t === 'templates' ? 'Waiver Templates' : t === 'member-waivers' ? 'Member Waivers' : 'Analytics'}</button>
        ))}
      </div>

      {tab === 'templates' && (
        <>
          {/* Template form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingId ? 'Edit Template' : 'New Template'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="input w-full" required aria-label="Template name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waiver Body Text</label>
                  <textarea value={form.body_text} onChange={(e) => setForm(p => ({ ...p, body_text: e.target.value }))} className="input w-full h-48 font-mono text-sm" required aria-label="Waiver body text" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-sm">{editingId ? 'Update' : 'Create'}</button>
                  <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-outline text-sm">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Template list */}
          {tplsLoading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-sm text-gray-500" aria-label="Loading">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-sm text-gray-500">No waiver templates yet. Create one to get started.</div>
          ) : (
            <div className="space-y-3">
              {templates.map(tpl => (
                <div key={tpl.id} className="bg-white rounded-lg shadow p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{tpl.name}</h3>
                      <span className="text-xs text-gray-400">v{tpl.version}</span>
                      {!tpl.active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inactive</span>}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap">{tpl.body_text}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button type="button" onClick={() => handleSign(tpl)} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Sign</button>
                    <button type="button" onClick={() => handleEdit(tpl)} className="px-3 py-1 text-xs border rounded hover:bg-gray-50">Edit</button>
                    <button type="button" onClick={() => { if (confirm('Delete this template?')) deleteTpl.mutate(tpl.id); }} className="px-3 py-1 text-xs border rounded text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'member-waivers' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Find Member</label>
            <div className="flex gap-2">
              <input type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="input w-48" placeholder="Search by name or enter ID" aria-label="Search member" />
              <button type="button" onClick={() => setMemberId(parseInt(memberSearch, 10))} className="btn-primary text-sm" disabled={!memberSearch}>Search</button>
            </div>
            {memberId && isUnder18 && (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => { setParentEmailMember(memberData); setParentEmail(memberData?.email || ''); }}
                  className="px-3 py-1.5 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 font-medium">
                  Email Waiver to Parent
                </button>
                <button type="button" onClick={() => setShowSignForMinor(true)}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 font-medium">
                  Sign Now (Parent Present)
                </button>
              </div>
            )}
          </div>
          {memberId && (
            waiversLoading ? (
              <p className="text-sm text-gray-500">Loading waivers...</p>
            ) : memberWaiversList.length === 0 ? (
              <p className="text-sm text-gray-500">No signed waivers for this member.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Signed At</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {memberWaiversList.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => alert(w.body_text || 'Waiver content not available')}>
                      <td className="px-4 py-2 text-sm text-gray-900">{w.template_name}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{new Date(w.signed_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm">
                        <button type="button" onClick={(e) => { e.stopPropagation(); alert(w.body_text || 'Waiver content not available'); }} className="text-red-600 hover:underline mr-2">View</button>
                        <button type="button" onClick={(e) => handleDownloadPdf(w, e)} className="btn-outline text-xs">Download PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-4">
          {!analyticsData ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-sm text-gray-500">Loading analytics...</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow p-5 text-center">
                  <p className="text-3xl font-bold text-gray-900">{analyticsData.total_signed}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Signed</p>
                </div>
                <div className="bg-white rounded-lg shadow p-5 text-center">
                  <p className="text-3xl font-bold text-gray-900">{analyticsData.signed_this_month}</p>
                  <p className="text-xs text-gray-500 mt-1">Signed This Month</p>
                </div>
                <div className="bg-white rounded-lg shadow p-5 text-center">
                  <p className="text-3xl font-bold text-gray-900">{analyticsData.pending_parent}</p>
                  <p className="text-xs text-gray-500 mt-1">Pending Parent</p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Signed Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analyticsData.templates?.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{t.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{t.signed_count}</td>
                        <td className="px-4 py-2 text-sm">{t.active ? <span className="text-green-600 text-xs font-medium">Active</span> : <span className="text-gray-400 text-xs">Inactive</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {parentEmailMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setParentEmailMember(null); setParentEmail(''); }}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Email Waiver to Parent</h3>
            <p className="text-sm text-gray-500 mb-4">Send a waiver signing link to the parent/guardian of {parentEmailMember.first_name} {parentEmailMember.last_name}.</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
            <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} className="input w-full mb-4" placeholder="parent@example.com" />
            <div className="flex gap-2">
              <button type="button" onClick={() => sendParentLink.mutate({ member_id: memberId, template_id: templates?.[0]?.id, parent_email: parentEmail })}
                disabled={!parentEmail || sendParentLink.isPending || !templates?.[0]?.id}
                className="btn-primary text-sm">{sendParentLink.isPending ? 'Sending...' : 'Send Link'}</button>
              <button type="button" onClick={() => { setParentEmailMember(null); setParentEmail(''); }} className="btn-outline text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showSignModal && signingTemplate && (
        <SignWaiverModal
          template={signingTemplate}
          onClose={() => { setShowSignModal(false); setSigningTemplate(null); }}
          onSigned={() => { setShowSignModal(false); setSigningTemplate(null); success('Waiver signed'); queryClient.invalidateQueries({ queryKey: ['member-waivers'] }); }}
        />
      )}

      {showSignForMinor && memberData && templates?.[0] && (
        <SignWaiverModal
          template={templates[0]}
          preselectedMemberId={memberId}
          memberName={`${memberData.first_name} ${memberData.last_name}`}
          isMinor={true}
          onClose={() => setShowSignForMinor(false)}
          onSigned={() => { setShowSignForMinor(false); success('Waiver signed for minor'); queryClient.invalidateQueries({ queryKey: ['member-waivers', memberId] }); queryClient.invalidateQueries({ queryKey: ['waiver-analytics'] }); }}
        />
      )}
    </div>
  );
}
