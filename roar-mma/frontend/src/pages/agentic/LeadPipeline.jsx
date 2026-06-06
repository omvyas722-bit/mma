import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const STAGES = ['New Enquiry', 'Trial Booked', 'Trial Done', 'Signed', 'At Risk', 'Churned'];
const STAGE_COLORS = {
  'New Enquiry': '#007AFF',
  'Trial Booked': '#FF9500',
  'Trial Done': '#FFD60A',
  'Signed': '#34C759',
  'At Risk': '#FF3B30',
  'Churned': '#8E8E93',
};

function getUrgency(lead) {
  if (lead.stage === 'churned' || lead.stage === 'at_risk') return 'red';
  if (lead.stage === 'new' || lead.stage === 'contacted') return 'green';
  return 'yellow';
}

function stageLabel(stage) {
  const map = {
    'new': 'New Enquiry', 'contacted': 'New Enquiry',
    'trial_booked': 'Trial Booked', 'trial_completed': 'Trial Done',
    'converted': 'Signed', 'lost': 'Churned',
  };
  return map[stage] || stage;
}

function matchesStage(stage, leadStage) {
  const map = {
    'New Enquiry': ['new', 'contacted'],
    'Trial Booked': ['trial_booked'],
    'Trial Done': ['trial_completed'],
    'Signed': ['converted'],
    'At Risk': ['at_risk'],
    'Churned': ['lost'],
  };
  return (map[stage] || []).includes(leadStage);
}

export default function LeadPipeline() {
  const [selectedLead, setSelectedLead] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['agentic-leads'],
    queryFn: () => api.get('/api/agentic/leads').then(r => r.data),
    refetchInterval: 30000,
  });

  const leads = data?.leads || [];

  return (
    <div className="min-h-screen" style={{ background: '#0D0F1A' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🎯</span>
              <h1 className="text-2xl font-bold text-white">Lead Pipeline</h1>
            </div>
            <p className="text-sm" style={{ color: '#8E8E93' }}>Sales Rep Agent · Claude Sonnet 4</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#8E8E93' }}>Total Leads</p>
            <p className="text-lg font-bold text-white">{leads.length}</p>
          </div>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin', minHeight: '60vh' }}>
          {STAGES.map(stage => {
            const stageLeads = leads.filter(l => matchesStage(stage, l.stage));
            return (
              <div key={stage} className="flex-shrink-0 w-64">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: STAGE_COLORS[stage] }} />
                    <h3 className="text-sm font-bold text-white">{stage}</h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#8E8E93' }}>
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {stageLeads.map(lead => (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                      className="w-full text-left p-3 rounded-xl border transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        borderColor: selectedLead?.id === lead.id ? '#FF3B30' : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <p className="text-sm font-bold text-white truncate">{lead.first_name} {lead.last_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px]" style={{ color: '#8E8E93' }}>
                          {lead.phone || lead.email || 'No contact'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {lead.interest_level && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                            background: lead.interest_level === 'hot' ? '#FF3B3020' : lead.interest_level === 'high' ? '#FFD60A20' : 'rgba(255,255,255,0.06)',
                            color: lead.interest_level === 'hot' ? '#FF3B30' : lead.interest_level === 'high' ? '#FFD60A' : '#8E8E93',
                          }}>
                            {lead.interest_level}
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: '#8E8E93' }}>
                          {lead.created_at ? new Date(lead.created_at + 'Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                        </span>
                      </div>
                    </button>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="p-4 text-center">
                      <p className="text-xs" style={{ color: '#8E8E93' }}>No leads</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {data?.recentOutreach?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-white mb-4">Outreach Sent Tonight</h2>
            <div className="space-y-2">
              {data.recentOutreach.slice(0, 10).map((msg, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <p className="text-sm text-white">{msg.summary}</p>
                  <p className="text-[10px] mt-1" style={{ color: '#8E8E93' }}>
                    {new Date(msg.created_at + 'Z').toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedLead && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setSelectedLead(null)}
          >
            <div
              className="w-full max-w-md p-6 rounded-2xl border"
              style={{ background: '#0D0F1A', borderColor: 'rgba(255,255,255,0.12)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{selectedLead.first_name} {selectedLead.last_name}</h3>
                <button onClick={() => setSelectedLead(null)} className="text-xl" style={{ color: '#8E8E93' }}>×</button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: '#8E8E93' }}>Email</span>
                  <span className="text-sm text-white">{selectedLead.email || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: '#8E8E93' }}>Phone</span>
                  <span className="text-sm text-white">{selectedLead.phone || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: '#8E8E93' }}>Stage</span>
                  <span className="text-sm text-white">{stageLabel(selectedLead.stage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: '#8E8E93' }}>Interest</span>
                  <span className="text-sm text-white capitalize">{selectedLead.interest_level || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: '#8E8E93' }}>Created</span>
                  <span className="text-sm text-white">{selectedLead.created_at ? new Date(selectedLead.created_at + 'Z').toLocaleDateString() : '—'}</span>
                </div>
                {selectedLead.notes && (
                  <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <p className="text-xs mb-1" style={{ color: '#8E8E93' }}>Notes</p>
                    <p className="text-sm text-white">{selectedLead.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
