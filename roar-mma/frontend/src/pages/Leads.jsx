// Leads page with Kanban board
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import AddLeadModal from '../components/Leads/AddLeadModal';
import EditLeadModal from '../components/Leads/EditLeadModal';
import TrialTrackingModal from '../components/Leads/TrialTrackingModal';
import ConfirmDialog from '../components/Shared/ConfirmDialog';

export default function Leads() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [trackingTrialLead, setTrackingTrialLead] = useState(null);
  const [deletingLead, setDeletingLead] = useState(null);
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const response = await api.get('/api/leads');
      return response.data;
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (leadId) => {
      await api.delete(`/api/leads/${leadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['dashboard']);
      setDeletingLead(null);
    },
    onError: (error) => {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead. Please try again.');
    }
  });

  const handleDeleteConfirm = () => {
    if (deletingLead) {
      deleteLead.mutate(deletingLead.id);
    }
  };

  const stages = [
    { id: 'new', label: 'New Leads', color: 'bg-gray-100' },
    { id: 'contacted', label: 'Contacted', color: 'bg-blue-100' },
    { id: 'trial_booked', label: 'Trial Booked', color: 'bg-yellow-100' },
    { id: 'trial_completed', label: 'Trial Completed', color: 'bg-purple-100' },
    { id: 'converted', label: 'Converted', color: 'bg-green-100' },
  ];

  // Group leads by stage
  const leadsByStage = {};
  stages.forEach((stage) => {
    leadsByStage[stage.id] = leads.filter((lead) => lead.stage === stage.id);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          Add Lead
        </button>
      </div>

      <AddLeadModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <EditLeadModal
        isOpen={!!editingLead}
        onClose={() => setEditingLead(null)}
        lead={editingLead}
      />
      <TrialTrackingModal
        isOpen={!!trackingTrialLead}
        onClose={() => setTrackingTrialLead(null)}
        lead={trackingTrialLead}
      />
      <ConfirmDialog
        isOpen={!!deletingLead}
        onClose={() => setDeletingLead(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Lead"
        message={`Are you sure you want to delete ${deletingLead?.first_name} ${deletingLead?.last_name}? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-80">
            <div className={`${stage.color} rounded-t-lg px-4 py-3`}>
              <h3 className="font-semibold text-gray-900">
                {stage.label}
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({leadsByStage[stage.id].length})
                </span>
              </h3>
            </div>
            <div className="bg-gray-50 rounded-b-lg p-4 min-h-[500px] space-y-3">
              {leadsByStage[stage.id].length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No leads</p>
              ) : (
                leadsByStage[stage.id].map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    stage={stage.id}
                    onClick={() => setEditingLead(lead)}
                    onTrackTrial={(e) => {
                      e.stopPropagation();
                      setTrackingTrialLead(lead);
                    }}
                    onDelete={(e) => {
                      e.stopPropagation();
                      setDeletingLead(lead);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadCard({ lead, stage, onClick, onTrackTrial, onDelete }) {
  const sourceColors = {
    website: 'bg-blue-100 text-blue-800',
    facebook: 'bg-indigo-100 text-indigo-800',
    instagram: 'bg-pink-100 text-pink-800',
    referral: 'bg-green-100 text-green-800',
    walk_in: 'bg-yellow-100 text-yellow-800',
    other: 'bg-gray-100 text-gray-800',
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer relative"
    >
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 text-gray-400 hover:text-red-600 transition-colors"
        title="Delete lead"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-gray-900">
            {lead.first_name} {lead.last_name}
          </p>
          <p className="text-sm text-gray-500">{lead.phone}</p>
          {lead.email && <p className="text-sm text-gray-500">{lead.email}</p>}
        </div>
      </div>

      {lead.source && (
        <span className={`badge text-xs ${sourceColors[lead.source] || 'badge-gray'} mb-2`}>
          {lead.source.replace('_', ' ')}
        </span>
      )}

      {lead.interests && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{lead.interests}</p>
      )}

      {/* Trial tracking button for trial_booked stage */}
      {stage === 'trial_booked' && (
        <button
          onClick={onTrackTrial}
          className="w-full mt-2 py-2 px-3 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          📝 Track Trial Session
        </button>
      )}

      {lead.assigned_to_name && (
        <p className="text-xs text-gray-500">Assigned: {lead.assigned_to_name}</p>
      )}

      <p className="text-xs text-gray-400 mt-2">{formatDate(lead.created_at)}</p>
    </div>
  );
}
