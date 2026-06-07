import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

const STAGES = ['New', 'Contacted', 'Trial Booked', 'Converted', 'Lost'];
const SOURCE_TAGS = ['Walk-in', 'Web Form', 'Referral', 'Social Media', 'Phone'];

export default function CRMLeads() {
  const queryClient = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-pg'],
    queryFn: async () => {
      const data = await api.get('/api/leads');
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: 15000,
  });

  const updateLeadStage = useMutation({
    mutationFn: ({ id, stage }) => api.put(`/api/leads/${id}`, { stage: stage.toLowerCase().replace(' ', '_') }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads-pg'] }),
  });

  const mappedLeads = leads.length > 0
    ? leads.map(l => ({
        id: l.id,
        name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || l.name || 'Unknown',
        source: l.source ? (l.source.charAt(0).toUpperCase() + l.source.slice(1).replace(/_/g, ' ')) : 'Walk-in',
        daysInStage: l.days_in_stage || Math.floor((Date.now() - new Date(l.updated_at || l.created_at || Date.now()).getTime()) / 86400000) || 1,
        stage: l.stage ? (l.stage.charAt(0).toUpperCase() + l.stage.slice(1).replace(/_/g, ' ')) : 'New',
        phone: l.phone || '',
      }))
    : [];

  const [dragOver, setDragOver] = useState(null);

  const getStageLeads = (stage) => mappedLeads.filter(l => l.stage === stage);

  const sourceColor = (source) => {
    const colors = {
      'Walk-in': 'badge-blue',
      'Web Form': 'badge-green',
      'Referral': 'badge-yellow',
      'Social Media': 'badge-red',
      'Phone': 'badge-gray',
    };
    return colors[source] || 'badge-gray';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM & Lead Management</h1>
          <p className="text-sm text-gray-500">Kanban pipeline — drag leads through stages</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 overflow-x-auto pb-4" style={{ minWidth: 0 }}>
        {STAGES.map(stage => (
          <div key={stage}
            className={`bg-gray-50 rounded-lg p-3 min-w-[200px] ${dragOver === stage ? 'ring-2 ring-red-400' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              setDragOver(null);
              const leadId = parseInt(e.dataTransfer?.getData('leadId'), 10);
              if (leadId && stage !== getStageLeads(stage)?.[0]?.stage) {
                updateLeadStage.mutate({ id: leadId, stage });
              }
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase">{stage}</h3>
              <span className="badge badge-gray">{getStageLeads(stage).length}</span>
            </div>
            <div className="space-y-2">
              {getStageLeads(stage).map(lead => (
                <div key={lead.id} draggable
                  onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                >
                  <p className="text-sm font-semibold text-gray-900 mb-1">{lead.name}</p>
                  <div className="flex items-center gap-1 mb-2">
                    <span className={`badge ${sourceColor(lead.source)}`}>{lead.source}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{lead.phone}</span>
                    <span>{lead.daysInStage}d in stage</span>
                  </div>
                </div>
              ))}
              {getStageLeads(stage).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No leads</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
