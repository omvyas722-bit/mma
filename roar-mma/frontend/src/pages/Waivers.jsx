import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import SignWaiverModal from '../components/Waivers/SignWaiverModal';

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

  const { data: templatesData, isLoading: tplsLoading } = useQuery({
    queryKey: ['waiver-templates'],
    queryFn: async () => { const r = await api.get('/api/waivers/templates'); return r.data; },
    staleTime: 300000,
  });
  const templates = templatesData?.templates || [];

  const { data: memberWaiversData, isLoading: waiversLoading } = useQuery({
    queryKey: ['member-waivers', memberId],
    queryFn: async () => { const r = await api.get(`/api/waivers/member/${memberId}`); return r.data; },
    enabled: !!memberId,
    staleTime: 10000,
  });
  const memberWaiversList = memberWaiversData?.waivers || [];

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
        {['templates', 'member-waivers'].map(t => (
          <button key={t} type="button" role="tab" aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >{t === 'templates' ? 'Waiver Templates' : 'Member Waivers'}</button>
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
                      <td className="px-4 py-2 text-sm text-red-600 hover:underline" onClick={(e) => { e.stopPropagation(); alert(w.body_text || 'Waiver content not available'); }}>View</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}

      {showSignModal && signingTemplate && (
        <SignWaiverModal
          template={signingTemplate}
          onClose={() => { setShowSignModal(false); setSigningTemplate(null); }}
          onSigned={() => { setShowSignModal(false); setSigningTemplate(null); success('Waiver signed'); queryClient.invalidateQueries({ queryKey: ['member-waivers'] }); }}
        />
      )}
    </div>
  );
}
