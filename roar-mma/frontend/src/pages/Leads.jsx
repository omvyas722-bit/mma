import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import AddLeadModal from '../components/Leads/AddLeadModal';
import TrialTrackingModal from '../components/Leads/TrialTrackingModal';
import CSVImportModal from '../components/Leads/CSVImportModal';
import ConfirmDialog from '../components/Shared/ConfirmDialog';

const STAGES = ['new', 'contacted', 'trial_booked', 'trial_completed', 'converted'];
const STAGE_LABELS = { new: 'New Leads', contacted: 'Contacted', trial_booked: 'Trial Booked', trial_completed: 'Trial Done', converted: 'Converted ✓' };
const SOURCE_COLORS = { website: 'bg-blue-100 text-blue-700', facebook: 'bg-indigo-100 text-indigo-700', instagram: 'bg-purple-100 text-purple-700', referral: 'bg-green-100 text-green-700', walk_in: 'bg-yellow-100 text-yellow-700', google: 'bg-red-100 text-red-700', tiktok: 'bg-pink-100 text-pink-700', other: 'bg-gray-100 text-gray-600' };
const SCORE_COLORS = { critical: 'border-red-500', high: 'border-orange-400', medium: 'border-yellow-400', low: 'border-gray-300' };

function getScorePriority(score) {
  if (!score || score < 30) return 'low';
  if (score < 50) return 'medium';
  if (score < 70) return 'high';
  return 'critical';
}

export default function Leads() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [tab, setTab] = useState('pipeline');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [deletingLead, setDeletingLead] = useState(null);
  const [trackingLead, setTrackingLead] = useState(null);
  const [detailLead, setDetailLead] = useState(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dragState, setDragState] = useState(null);

  const { data: leadsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['leads', { search, stage: stageFilter, source: sourceFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('query', search);
      if (stageFilter) params.append('stage', stageFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      const r = await api.get(`/api/leads?${params}`);
      return r.data;
    },
    retry: 2,
    staleTime: 10000,
  });

  const leads = leadsData?.leads || [];
  const invalidateLeads = () => queryClient.invalidateQueries({ queryKey: ['leads'] });

  const updateStage = useMutation({
    mutationFn: ({ id, stage }) => api.put(`/api/leads/${id}`, { stage }),
    onSuccess: () => { invalidateLeads(); success('Lead stage updated'); },
    onError: () => error('Failed to update lead'),
  });

  const deleteLead = useMutation({
    mutationFn: (id) => api.delete(`/api/leads/${id}`),
    onSuccess: () => { invalidateLeads(); setDeletingLead(null); setDetailLead(null); success('Lead deleted'); },
    onError: () => error('Failed to delete lead'),
  });

  const convertLead = useMutation({
    mutationFn: (id) => api.post(`/api/leads/${id}/convert`),
    onSuccess: () => { invalidateLeads(); queryClient.invalidateQueries({ queryKey: ['members'] }); setDetailLead(null); success('Lead converted to member!'); },
    onError: () => error('Failed to convert lead'),
  });

  const markLost = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/api/leads/${id}/lost`, { lost_reason: reason }),
    onSuccess: () => { invalidateLeads(); setDetailLead(null); success('Lead marked as lost'); },
    onError: () => error('Failed to mark lead lost'),
  });

  const grouped = STAGES.reduce((acc, s) => { acc[s] = leads.filter(l => l.stage === s); return acc; }, {});

  const isOverdue = (lead) => {
    if (lead.stage === 'converted' || lead.stage === 'trial_completed') return false;
    if (!lead.last_contact_date) return true;
    return Math.floor((Date.now() - new Date(lead.last_contact_date).getTime()) / 86400000) >= 3;
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    setDragState(null);
    const leadId = parseInt(e.dataTransfer.getData('leadId'));
    if (!leadId) return;
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === targetStage) return;
    if (targetStage === 'converted') {
      convertLead.mutate(leadId);
    } else {
      updateStage.mutate({ id: leadId, stage: targetStage });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTab('pipeline')} className={`text-sm px-4 py-2 rounded-lg ${tab === 'pipeline' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Pipeline</button>
          <button type="button" onClick={() => setTab('analytics')} className={`text-sm px-4 py-2 rounded-lg ${tab === 'analytics' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Analytics</button>
          {tab === 'pipeline' && <><button type="button" onClick={() => setShowAddModal(true)} className="btn-primary text-sm">+ Add Lead</button><Link to="/leads/wizard" className="btn-outline text-sm">+ Wizard</Link><button type="button" onClick={() => setShowImport(true)} className="btn-outline text-sm">Import CSV</button></>}
        </div>
      </div>

      <AddLeadModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <CSVImportModal isOpen={showImport} onClose={() => setShowImport(false)} />
      <EditModal isOpen={!!editingLead} onClose={() => setEditingLead(null)} lead={editingLead} />
      <TrialTrackingModal isOpen={!!trackingLead} onClose={() => setTrackingLead(null)} lead={trackingLead} />
      <ConfirmDialog isOpen={!!deletingLead} onClose={() => setDeletingLead(null)} onConfirm={() => deleteLead.mutate(deletingLead.id)}
        title="Delete Lead" message={`Delete ${deletingLead?.first_name} ${deletingLead?.last_name}?`} confirmText="Delete" type="danger" />

      {tab === 'analytics' ? <LeadsAnalytics /> : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="input text-sm" aria-label="Search leads" />
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="input text-sm" aria-label="Filter by stage">
                <option value="">All Stages</option>
                {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="input text-sm" aria-label="Filter by source">
                <option value="">All Sources</option>
                {['website', 'facebook', 'instagram', 'referral', 'walk_in', 'google', 'tiktok', 'event', 'other'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Error state */}
          {isError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
              <p className="text-red-700 text-sm mb-3">Failed to load leads</p>
              <button type="button" onClick={refetch} className="text-sm text-red-600 underline hover:no-underline">Try again</button>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {STAGES.map(s => <SkeletonColumn key={s} count={3} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto" style={{ minHeight: '60vh' }}>
              {STAGES.map(stage => (
                <div
                  key={stage}
                  className={`bg-gray-50 rounded-lg p-3 min-h-[400px] ${dragState === stage ? 'bg-blue-50 ring-2 ring-blue-300' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragState(stage); }}
                  onDragLeave={() => setDragState(null)}
                  onDragEnd={() => setDragState(null)}
                  onDrop={(e) => handleDrop(e, stage)}
                  aria-label={`${STAGE_LABELS[stage]} column, ${(grouped[stage] || []).length} leads`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-600 uppercase">{STAGE_LABELS[stage]}</h3>
                    <span className="text-xs font-medium text-gray-400 bg-gray-200 rounded-full px-2 py-0.5" aria-label={`${(grouped[stage] || []).length} leads`}>{grouped[stage]?.length || 0}</span>
                  </div>
                  <div className="space-y-2 min-h-[200px]">
                    {(grouped[stage] || []).map(lead => (
                      <LeadCard key={lead.id} lead={lead} overdue={isOverdue(lead)}
                        onClick={() => setDetailLead(lead)} onDelete={() => setDeletingLead(lead)}
                        onTrack={() => { setTrackingLead(lead); }} onConvert={() => convertLead.mutate(lead.id)} />
                    ))}
                  </div>
                  {stage === 'new' && (
                    <button type="button" onClick={() => setShowAddModal(true)}
                      className="w-full mt-2 py-2 text-xs text-gray-400 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:text-red-500 transition-colors">
                      + Add Lead
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail Panel */}
      {detailLead && <LeadDetail lead={detailLead} onClose={() => setDetailLead(null)} onEdit={() => { setEditingLead(detailLead); setDetailLead(null); }}
        onTrack={() => { setTrackingLead(detailLead); setDetailLead(null); }} onConvert={() => convertLead.mutate(detailLead.id)}
        onMarkLost={(r) => markLost.mutate({ id: detailLead.id, reason: r })} onDelete={() => setDeletingLead(detailLead)}
        onStageChange={(stage) => updateStage.mutate({ id: detailLead.id, stage })} />}
    </div>
  );
}

function LeadCard({ lead, onClick, onDelete, onTrack, onConvert, overdue }) {
  const score = lead.score || 0;
  const priority = getScorePriority(score);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('leadId', String(lead.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`bg-white rounded-lg shadow-sm border-l-4 ${SCORE_COLORS[priority] || 'border-gray-300'} p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${overdue ? 'ring-2 ring-red-300' : ''}`}
      onClick={onClick}
      role="button" tabIndex={0} aria-label={`${lead.first_name} ${lead.last_name}, score ${score}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-sm font-medium text-gray-900 truncate">{lead.first_name} {lead.last_name}</span>
        <span className="text-[10px] font-mono text-gray-400" aria-label={`Score ${score}`}>{score}</span>
      </div>
      {lead.email && <p className="text-xs text-gray-500 truncate">{lead.email}</p>}
      {lead.phone && <p className="text-xs text-gray-500">{lead.phone}</p>}
      {lead.source && <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 ${SOURCE_COLORS[lead.source] || ''}`}>{lead.source.replace(/_/g, ' ')}</span>}
      {lead.interests && <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{lead.interests}</p>}
      {lead.assigned_staff_name && <p className="text-[10px] text-gray-400 mt-1">👤 {lead.assigned_staff_name}</p>}
      <TimeAgo date={lead.created_at} />
    </div>
  );
}

function TimeAgo({ date }) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  let label;
  if (days === 0) { const h = Math.floor(diff / 3600000); label = h === 0 ? 'Just now' : `${h}h ago`; }
  else if (days === 1) label = 'Yesterday';
  else label = `${days}d ago`;
  return <p className="text-[10px] text-gray-400 mt-1">{label}</p>;
}

function LeadsAnalytics() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['lead-stats'],
    queryFn: async () => { const r = await api.get('/api/leads/stats'); return r.data; },
    retry: 2,
  });

  const { data: winback } = useQuery({
    queryKey: ['lead-winback'],
    queryFn: async () => { const r = await api.get('/api/leads/winback'); return r.data?.leads || []; },
    retry: 2,
  });

  const funnel = useMemo(() => {
    if (!stats) return [];
    const stages = [
      { label: 'New Leads', key: 'new', color: 'bg-blue-500' },
      { label: 'Contacted', key: 'contacted', color: 'bg-indigo-500' },
      { label: 'Trial Booked', key: 'trial_booked', color: 'bg-purple-500' },
      { label: 'Trial Completed', key: 'trial_completed', color: 'bg-pink-500' },
      { label: 'Converted', key: 'converted', color: 'bg-green-500' },
    ];
    const maxCount = Math.max(...stages.map(s => stats[s.key]?.count ?? stats[s.key] ?? 0), 1);
    return stages.map(s => ({ ...s, count: stats[s.key]?.count ?? stats[s.key] ?? 0, pct: Math.round(((stats[s.key]?.count ?? stats[s.key] ?? 0) / maxCount) * 100) }));
  }, [stats]);

  const sourceData = useMemo(() => {
    if (!stats?.by_source) return [];
    const maxCount = Math.max(...stats.by_source.map(s => s.count), 1);
    return stats.by_source.map(s => ({ ...s, pct: Math.round((s.count / maxCount) * 100) }));
  }, [stats]);

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;
  if (isError) return <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert"><p className="text-red-700 text-sm">Failed to load analytics</p></div>;

  return (
    <div className="space-y-6">
      {/* Stage Counts */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {funnel.map(s => (
          <div key={s.key} className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{s.count}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats?.total ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
          <div className="space-y-3">
            {funnel.map((s, i) => (
              <div key={s.key}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{s.label}</span><span>{s.count} ({i > 0 && funnel[i-1].count > 0 ? `${Math.round((s.count / funnel[i-1].count) * 100)}%` : '—'})</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className={`${s.color} h-3 rounded-full transition-all`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-gray-500">Overall conversion: {stats?.conversion_rate ?? 0}%</div>
        </div>

        {/* Source Breakdown */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Leads by Source</h3>
          <div className="space-y-2">
            {sourceData.map(s => (
              <div key={s.source}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="capitalize">{s.source.replace(/_/g, ' ')}</span><span>{s.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
            {sourceData.length === 0 && <p className="text-xs text-gray-400">No data</p>}
          </div>
          <div className="mt-4 pt-3 border-t">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Conversion Rate by Source</h4>
            <p className="text-xs text-gray-500">Calculated: {stats?.conversion_rate ?? 0}%</p>
          </div>
        </div>
      </div>

      {/* Win-Back Pipeline */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Win-Back Pipeline</h3>
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">Lost leads inactive 14+ days</span>
        </div>
        {(!winback || winback.length === 0) ? (
          <p className="text-xs text-gray-400 py-4 text-center">No win-back candidates</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr><th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Name</th><th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Source</th><th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Reason Lost</th><th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Last Contact</th><th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Assigned</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {winback.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">{l.first_name} {l.last_name}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 capitalize">{l.source?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 max-w-[150px] truncate">{l.lost_reason || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{l.last_contact_date ? new Date(l.last_contact_date).toLocaleDateString('en-AU') : 'Never'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{l.assigned_to_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonColumn({ count }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2 animate-pulse" aria-label="Loading">
      <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
      {[...Array(count)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>)}
    </div>
  );
}

function EditModal({ isOpen, onClose, lead }) {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', source: '', location: '', interests: '', notes: '' });
  useEffect(() => { if (lead) setForm({ first_name: lead.first_name || '', last_name: lead.last_name || '', email: lead.email || '', phone: lead.phone || '', source: lead.source || '', location: lead.location || '', interests: lead.interests || '', notes: lead.notes || '' }); }, [lead]);

  if (!isOpen) return null;
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name) { error('Name is required'); return; }
    try { await api.put(`/api/leads/${lead.id}`, form); queryClient.invalidateQueries({ queryKey: ['leads'] }); success('Lead updated'); onClose(); }
    catch { error('Failed to update lead'); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="text-lg font-semibold mb-4">Edit Lead</h2>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="First name" value={form.first_name} onChange={e => u('first_name', e.target.value)} className="input text-sm" required />
          <input placeholder="Last name" value={form.last_name} onChange={e => u('last_name', e.target.value)} className="input text-sm" required />
          <input placeholder="Email" type="email" value={form.email} onChange={e => u('email', e.target.value)} className="input text-sm col-span-2" />
          <input placeholder="Phone" value={form.phone} onChange={e => u('phone', e.target.value)} className="input text-sm col-span-2" />
          <select value={form.source} onChange={e => u('source', e.target.value)} className="input text-sm"><option value="">Source</option>{['website','facebook','instagram','referral','walk_in','google','tiktok','event','other'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</select>
          <select value={form.location} onChange={e => u('location', e.target.value)} className="input text-sm"><option value="">Location</option><option value="rockingham">Rockingham</option><option value="bibra_lake">Bibra Lake</option></select>
          <textarea placeholder="Interests" value={form.interests} onChange={e => u('interests', e.target.value)} className="input text-sm col-span-2" rows={2} />
          <textarea placeholder="Notes" value={form.notes} onChange={e => u('notes', e.target.value)} className="input text-sm col-span-2" rows={2} />
        </div>
        <div className="flex justify-end gap-2 mt-4"><button onClick={onClose} className="btn-outline text-sm">Cancel</button><button onClick={handleSubmit} className="btn-primary text-sm">Save</button></div>
      </div>
    </div>
  );
}

function LeadDetail({ lead, onClose, onEdit, onTrack, onConvert, onMarkLost, onDelete, onStageChange }) {
  const { data: interactions } = useQuery({
    queryKey: ['lead-interactions', lead.id],
    queryFn: async () => { const r = await api.get(`/api/leads/${lead.id}/interactions`); return r.data; },
    enabled: !!lead.id,
  });
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [note, setNote] = useState('');
  const [type, setType] = useState('note');

  const addInteraction = useMutation({
    mutationFn: () => api.post(`/api/leads/${lead.id}/interactions`, { interaction_type: type, notes: note }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lead-interactions', lead.id] }); queryClient.invalidateQueries({ queryKey: ['leads'] }); setNote(''); success('Interaction logged'); },
    onError: () => error('Failed to log interaction'),
  });

  const score = lead.score || 0;
  const priority = getScorePriority(score || 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md bg-white shadow-xl h-full overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Lead details">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{lead.first_name} {lead.last_name}</h2>
            <p className="text-xs text-gray-500 capitalize">Stage: {lead.stage?.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl" aria-label="Close">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          <dl className="space-y-2 text-sm">
            {lead.email && <div><dt className="text-gray-500 inline">Email:</dt><dd className="inline ml-1">{lead.email}</dd></div>}
            {lead.phone && <div><dt className="text-gray-500 inline">Phone:</dt><dd className="inline ml-1">{lead.phone}</dd></div>}
            {lead.source && <div><dt className="text-gray-500 inline">Source:</dt><dd className="inline ml-1 capitalize">{lead.source.replace(/_/g, ' ')}</dd></div>}
            {lead.location && <div><dt className="text-gray-500 inline">Location:</dt><dd className="inline ml-1 capitalize">{lead.location.replace(/_/g, ' ')}</dd></div>}
            {lead.interests && <div><dt className="text-gray-500 inline">Interests:</dt><dd className="inline ml-1">{lead.interests}</dd></div>}
            {lead.assigned_staff_name && <div><dt className="text-gray-500 inline">Assigned to:</dt><dd className="inline ml-1">{lead.assigned_staff_name}</dd></div>}
          </dl>
          <p className="text-sm"><span className="text-gray-500">Score:</span> <span className={`font-medium ${priority === 'critical' ? 'text-red-600' : priority === 'high' ? 'text-orange-600' : priority === 'medium' ? 'text-yellow-600' : 'text-gray-500'}`}>{score} ({priority})</span></p>

          <div className="flex flex-wrap gap-2 pt-3 border-t">
            <button onClick={onEdit} className="btn-outline text-xs">Edit</button>
            {lead.stage === 'new' && onStageChange && <button onClick={() => onStageChange('contacted')} className="btn-outline text-xs">Mark Contacted</button>}
            {lead.stage === 'trial_booked' && <button onClick={onTrack} className="btn-outline text-xs bg-yellow-50">Track Trial</button>}
            {lead.stage === 'trial_completed' && <button onClick={onConvert} className="btn-primary text-xs">Convert to Member</button>}
            <button onClick={() => { const r = prompt('Lost reason:'); if (r) onMarkLost(r); }} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Mark Lost</button>
            <button onClick={onDelete} className="text-xs px-3 py-1.5 text-red-600 hover:underline">Delete</button>
          </div>

          {/* Interaction Log */}
          <div className="pt-3 border-t">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Interaction Log</h3>
            <div className="flex gap-2 mb-3">
              <select value={type} onChange={e => setType(e.target.value)} className="input text-xs flex-1" aria-label="Interaction type">
                <option value="note">Note</option><option value="call">Call</option><option value="email">Email</option><option value="sms">SMS</option><option value="in_person">In Person</option>
              </select>
              <button onClick={addInteraction.mutate} disabled={!note.trim()} className="btn-primary text-xs">+ Add</button>
            </div>
            <textarea placeholder="Notes..." value={note} onChange={e => setNote(e.target.value)} className="input text-sm w-full mb-3" rows={2} />
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(interactions?.interactions || []).length === 0 && <p className="text-xs text-gray-400">No interactions yet</p>}
              {(interactions?.interactions || []).map(ix => (
                <div key={ix.id} className="border-l-2 border-gray-200 pl-3 py-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${ix.interaction_type === 'call' ? 'bg-green-100 text-green-700' : ix.interaction_type === 'email' ? 'bg-blue-100 text-blue-700' : ix.interaction_type === 'sms' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{ix.interaction_type}</span>
                    <span className="text-[10px] text-gray-400">{new Date(ix.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  {ix.notes && <p className="text-xs text-gray-600 mt-0.5">{ix.notes}</p>}
                  {ix.staff_name && <p className="text-[10px] text-gray-400">by {ix.staff_name}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
