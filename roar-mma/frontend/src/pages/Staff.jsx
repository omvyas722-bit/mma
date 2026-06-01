import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Staff() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [roleFilter, setRoleFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailStaff, setDetailStaff] = useState(null);

  const { data: staff = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['staff', { role: roleFilter }],
    queryFn: async () => { const p = roleFilter ? `?role=${roleFilter}` : ''; const r = await api.get(`/api/staff${p}`); return r.data; },
    retry: 2,
    staleTime: 10000,
  });

  const { data: stats, isError: statsError } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: async () => { const r = await api.get('/api/staff/stats'); return r.data; },
    retry: 1,
  });

  const canManageStaff = hasPermission('staff:create');

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff & Coaches</h1>
        {canManageStaff && <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">+ Add Staff Member</button>}
      </div>

      {showAddModal && <AddStaffModal onClose={() => setShowAddModal(false)} />}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4" role="alert">
          <p className="text-red-700 text-sm">Failed to load staff. <button onClick={refetch} className="underline hover:no-underline">Try again</button></p>
        </div>
      )}

      {/* Stats */}
      {!statsError && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          <StatCard label="Total" value={stats.total} />
          {(stats.by_role || []).map(r => <StatCard key={r.role} label={r.role.replace(/_/g, ' ')} value={r.count} />)}
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input text-sm" aria-label="Filter by role">
          <option value="">All Roles</option>
          <option value="owner">Owner</option><option value="gm">GM</option><option value="front_desk">Front Desk</option>
          <option value="coach">Coach</option><option value="sales">Sales</option><option value="social">Social Media</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3 animate-pulse" aria-label="Loading">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded"></div>)}</div>
        ) : staff.length === 0 ? (
          <div className="text-center py-12"><p className="text-gray-500">No staff members found</p></div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200" role="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {staff.map(member => (
                <tr key={member.id} onClick={() => setDetailStaff(member)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{member.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{member.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><RoleBadge role={member.role} /></td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize hidden lg:table-cell">{member.location || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{member.active ? <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Active</span> : <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">Inactive</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{new Date(member.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailStaff && <StaffProfile staff={detailStaff} onClose={() => setDetailStaff(null)} />}
    </div>
  );
}

function StatCard({ label, value }) {
  return <div className="bg-white rounded-lg shadow p-3"><p className="text-xs text-gray-500 mb-0.5 capitalize">{label}</p><p className="text-xl font-bold text-gray-900">{value}</p></div>;
}

function RoleBadge({ role }) {
  const colors = { owner: 'bg-red-100 text-red-800', gm: 'bg-red-100 text-red-800', front_desk: 'bg-green-100 text-green-800', coach: 'bg-yellow-100 text-yellow-800', sales: 'bg-purple-100 text-purple-800', social: 'bg-pink-100 text-pink-800' };
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${colors[role] || 'bg-gray-100 text-gray-600'}`}>{role.replace(/_/g, ' ').toUpperCase()}</span>;
}

function AddStaffModal({ onClose }) {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'coach', location: 'rockingham', password: '' });
  const [errors, setErrors] = useState({});
  const u = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!EMAIL_REGEX.test(form.email)) e.email = 'Invalid email format';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Min 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) e.password = 'Must contain upper, lower, and digit';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createStaff = useMutation({
    mutationFn: () => api.post('/api/staff', { ...form, password_hash: form.password }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); queryClient.invalidateQueries({ queryKey: ['staff-stats'] }); success('Staff created'); onClose(); },
    onError: (err) => error(err?.response?.data?.error || 'Failed to create staff'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-staff-title">
        <h2 id="add-staff-title" className="text-lg font-semibold mb-4">Add Staff Member</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input placeholder="Full name" value={form.name} onChange={e => u('name', e.target.value)} className={`input text-sm w-full ${errors.name ? 'border-red-400' : ''}`} />
            {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" placeholder="Email" value={form.email} onChange={e => u('email', e.target.value)} className={`input text-sm w-full ${errors.email ? 'border-red-400' : ''}`} />
            {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input placeholder="Phone" value={form.phone} onChange={e => u('phone', e.target.value)} className="input text-sm w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" placeholder="Temp password" value={form.password} onChange={e => u('password', e.target.value)} className={`input text-sm w-full ${errors.password ? 'border-red-400' : ''}`} />
            {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password}</p>}
          </div>
          <select value={form.role} onChange={e => u('role', e.target.value)} className="input text-sm">
            <option value="coach">Coach</option><option value="owner">Owner</option><option value="gm">GM</option>
            <option value="front_desk">Front Desk</option><option value="sales">Sales</option><option value="social">Social Media</option>
          </select>
          <select value={form.location} onChange={e => u('location', e.target.value)} className="input text-sm">
            <option value="rockingham">Rockingham</option><option value="bibra_lake">Bibra Lake</option><option value="both">Both</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-outline text-sm">Cancel</button>
          <button onClick={() => { if (validate()) createStaff.mutate(); }} disabled={createStaff.isPending} className="btn-primary text-sm">{createStaff.isPending ? 'Creating...' : 'Create Staff'}</button>
        </div>
      </div>
    </div>
  );
}

function StaffProfile({ staff, onClose }) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  const { data: perf } = useQuery({
    queryKey: ['staff-performance', staff.id],
    queryFn: async () => { const r = await api.get(`/api/staff-performance/${staff.id}`); return r.data; },
    enabled: !!staff.id,
    retry: 1,
  });

  const toggleActive = useMutation({
    mutationFn: () => api.put(`/api/staff/${staff.id}`, { active: staff.active ? 0 : 1 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); success(staff.active ? 'Staff deactivated' : 'Staff activated'); },
    onError: () => error('Failed to update'),
  });

  const docExpiry = (staff.documents || []).map(d => ({ ...d, status: daysUntil(d.expiry) }));
  if (docExpiry.length === 0) {
    docExpiry.push(...[
      { name: 'First Aid Cert', expiry: null, status: null },
      { name: 'Working with Children', expiry: null, status: null },
      { name: 'Police Clearance', expiry: null, status: null },
    ]);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md bg-white shadow-xl h-full overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Staff profile">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">{staff.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl" aria-label="Close">&times;</button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <RoleBadge role={staff.role} />
            {staff.active ? <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Active</span> : <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">Inactive</span>}
          </div>
        </div>
        <div className="p-5 space-y-4">
          <dl className="space-y-2 text-sm">
            <div><dt className="text-gray-500 inline">Email:</dt><dd className="inline ml-1">{staff.email}</dd></div>
            <div><dt className="text-gray-500 inline">Phone:</dt><dd className="inline ml-1">{staff.phone || '—'}</dd></div>
            {staff.location && <div><dt className="text-gray-500 inline">Location:</dt><dd className="inline ml-1 capitalize">{staff.location.replace(/_/g, ' ')}</dd></div>}
            <div><dt className="text-gray-500 inline">Joined:</dt><dd className="inline ml-1">{new Date(staff.created_at).toLocaleDateString()}</dd></div>
          </dl>

          {staff.role === 'coach' && (
            <section className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Performance</h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricBox label="Classes/month" value={perf?.classes_taught ?? '-'} />
                <MetricBox label="Avg fill rate" value={perf?.avg_fill_rate != null ? `${perf.avg_fill_rate}%` : '-'} />
                <MetricBox label="PT sessions" value={perf?.pt_sessions ?? '-'} />
                <MetricBox label="PT revenue" value={perf?.pt_revenue != null ? `$${perf.pt_revenue}` : '-'} />
              </div>
            </section>
          )}

          {(staff.role === 'coach' || staff.role === 'owner' || staff.role === 'gm') && (
            <section className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Document Compliance</h3>
              <div className="space-y-2">
                  {docExpiry.map(doc => {
                  const isExpired = doc.status != null && doc.status < 0;
                  const isUrgent = doc.status != null && doc.status >= 0 && doc.status < 14;
                  const isWarning = doc.status != null && doc.status >= 14 && doc.status < 60;
                  const noDate = doc.status == null;
                  const bg = noDate ? 'bg-gray-50 border-gray-200 text-gray-500' : isExpired ? 'bg-red-50 border-red-200 text-red-700' : isUrgent ? 'bg-red-50 border-red-200 text-red-700' : isWarning ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600';
                  return (
                    <div key={doc.name} className={`border rounded-lg p-2 flex items-center justify-between ${bg}`}>
                      <span className="text-xs font-medium">{doc.name}</span>
                      <span className="text-xs">{doc.expiry ? doc.expiry : 'Not set'}{isExpired ? ' (EXPIRED)' : ''}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="border-t pt-4 flex gap-2">
            <button onClick={toggleActive.mutate} className={`text-xs px-3 py-1.5 rounded-lg border ${staff.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
              {staff.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value }) {
  return <div className="bg-gray-50 rounded p-3 text-center"><p className="text-lg font-bold text-gray-900">{value}</p><p className="text-xs text-gray-500">{label}</p></div>;
}

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}
