import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

export default function Privacy() {
  const [tab, setTab] = useState('consents');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Privacy & GDPR</h1>
      </div>

      <nav className="flex gap-1 border-b border-gray-200 mb-4">
        <button onClick={() => setTab('consents')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'consents' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Member Consents</button>
        <button onClick={() => setTab('retention')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'retention' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Retention Policies</button>
        <button onClick={() => setTab('export')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'export' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Data Export</button>
      </nav>

      {tab === 'consents' && <ConsentManager />}
      {tab === 'retention' && <RetentionPolicies />}
      {tab === 'export' && <DataExport />}
    </div>
  );
}

function ConsentManager() {
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

  const { data: consents } = useQuery({
    queryKey: ['member-consents', selectedMember?.id],
    queryFn: () => api.get(`/api/privacy/consents/${selectedMember.id}`).then(r => r.data),
    enabled: !!selectedMember,
  });

  const searchMembers = async (q) => {
    if (q.length < 2) { setMemberResults([]); return; }
    try { const r = await api.get(`/api/members?query=${q}&limit=10`); setMemberResults(r.data.members || []); } catch { setMemberResults([]); }
  };

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">Search Member</label>
        {selectedMember ? (
          <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
            <span className="text-sm font-medium">{selectedMember.first_name} {selectedMember.last_name}</span>
            <button onClick={() => { setSelectedMember(null); setMemberSearch(''); }} className="text-xs text-red-600 hover:underline">Change</button>
          </div>
        ) : (
          <div>
            <input type="text" placeholder="Search members by name..." value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); searchMembers(e.target.value); }} className="input text-sm w-full" />
            {memberResults.length > 0 && (
              <div className="mt-1 border rounded max-h-40 overflow-y-auto">
                {memberResults.map(m => (
                  <div key={m.id} onClick={() => { setSelectedMember(m); setMemberSearch(''); setMemberResults([]); }}
                    className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"><span>{m.first_name} {m.last_name} </span><span className="text-gray-400">{m.email}</span></div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedMember && consents && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Consent Preferences</h3>
          {Object.keys(consents).length === 0 ? (
            <p className="text-sm text-gray-500">No consents recorded for this member.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(consents).map(([type, value]) => (
                <ConsentToggle key={type} memberId={selectedMember.id} type={type} granted={value} />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedMember && !consents && (
        <div className="bg-white rounded-lg shadow text-center py-8">
          <p className="text-gray-500">Loading consents...</p>
        </div>
      )}
    </div>
  );
}

function ConsentToggle({ memberId, type, granted }) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  const update = useMutation({
    mutationFn: (granted) => api.put(`/api/privacy/consents/${memberId}/${type}`, { granted }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['member-consents'] }); success('Consent updated'); },
    onError: () => error('Failed to update'),
  });

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100">
      <span className="text-sm text-gray-700 capitalize">{type.replace(/_/g, ' ')}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={!!granted} onChange={(e) => update.mutate(e.target.checked)} className="sr-only peer" />
        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
      </label>
    </div>
  );
}

function RetentionPolicies() {
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['retention-policies'],
    queryFn: () => api.get('/api/privacy/retention').then(r => r.data?.policies || []),
  });

  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  const updatePolicy = useMutation({
    mutationFn: ({ id, data }) => api.put(`/api/privacy/retention/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['retention-policies'] }); success('Policy updated'); },
    onError: () => error('Failed to update'),
  });

  if (isLoading) return <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>;

  if (policies.length === 0) return <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No retention policies configured</p></div>;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
          <th className="px-4 py-3">Data Type</th><th className="px-4 py-3">Retention Period</th><th className="px-4 py-3">Auto-Delete</th><th className="px-4 py-3">Actions</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-200">
          {policies.map(p => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{p.data_type}</td>
              <td className="px-4 py-3 text-gray-600">{p.retention_days} days</td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.auto_delete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.auto_delete ? 'Yes' : 'No'}</span></td>
              <td className="px-4 py-3">
                <button onClick={() => updatePolicy.mutate({ id: p.id, data: { auto_delete: !p.auto_delete } })} className="text-xs text-blue-600 hover:underline">
                  Toggle Auto-Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataExport() {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);

  const { data: exports = [] } = useQuery({
    queryKey: ['data-exports'],
    queryFn: () => api.get('/api/privacy/exports').then(r => r.data?.exports || []),
  });

  const searchMembers = async (q) => {
    if (q.length < 2) { setMemberResults([]); return; }
    try { const r = await api.get(`/api/members?query=${q}&limit=10`); setMemberResults(r.data.members || []); } catch { setMemberResults([]); }
  };

  const requestExport = useMutation({
    mutationFn: (memberId) => api.post('/api/privacy/export', { member_id: memberId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['data-exports'] }); success('Export requested'); setSelectedMember(null); setMemberSearch(''); },
    onError: () => error('Failed to request export'),
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Request Data Export</h3>
        <label className="block text-xs font-medium text-gray-700 mb-1">Member</label>
        {selectedMember ? (
          <div className="flex items-center justify-between bg-blue-50 p-2 rounded mb-3">
            <span className="text-sm font-medium">{selectedMember.first_name} {selectedMember.last_name}</span>
            <button onClick={() => { setSelectedMember(null); setMemberSearch(''); }} className="text-xs text-red-600">Change</button>
          </div>
        ) : (
          <div>
            <input type="text" placeholder="Search..." value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); searchMembers(e.target.value); }} className="input text-sm w-full mb-3" />
            {memberResults.length > 0 && <div className="border rounded max-h-40 overflow-y-auto mb-3">{memberResults.map(m => <div key={m.id} onClick={() => { setSelectedMember(m); setMemberSearch(''); setMemberResults([]); }} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"><span>{m.first_name} {m.last_name} </span><span className="text-gray-400">{m.email}</span></div>)}</div>}
          </div>
        )}
        <button onClick={() => requestExport.mutate(selectedMember.id)} disabled={!selectedMember || requestExport.isPending} className="btn-primary text-sm">{requestExport.isPending ? 'Requesting...' : 'Request Export'}</button>
      </div>

      {exports.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Export History</h3>
          <div className="space-y-2">
            {exports.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-900">Member #{e.member_id}</p>
                  <p className="text-xs text-gray-500">{e.requested_at ? new Date(e.requested_at).toLocaleString() : '—'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.status === 'completed' ? 'bg-green-100 text-green-700' : e.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{e.status || 'pending'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
