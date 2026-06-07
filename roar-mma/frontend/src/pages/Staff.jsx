import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function daysUntil(d) { if (!d) return null; const diff = new Date(d) - new Date(); return Math.ceil(diff / 86400000); }

export default function Staff() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [tab, setTab] = useState('list');
  const [roleFilter, setRoleFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailStaff, setDetailStaff] = useState(null);
  const [complianceStaff, setComplianceStaff] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');

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
    staleTime: 300000,
  });

  const { data: allCerts = [] } = useQuery({
    queryKey: ['all-certifications'],
    queryFn: async () => { const r = await api.get('/api/certifications'); return r.data?.certifications || []; },
    staleTime: 60000,
  });

  const cStatus = (staffId) => {
    const staffCerts = allCerts.filter(c => c.staff_id === staffId);
    if (staffCerts.length === 0) return null;
    const minDays = Math.min(...staffCerts.map(c => daysUntil(c.expiry_date) ?? 999));
    if (minDays < 0 || minDays < 14) return 'expired';
    if (minDays < 60) return 'warning';
    return 'valid';
  };

  const canManageStaff = hasPermission('staff:create');

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Staff & Coaches</h1>
        <div className="flex gap-2">{canManageStaff && <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">+ Add Staff Member</button>}</div>
      </div>

      <nav className="flex gap-1 border-b border-gray-200 mb-4">
        <button onClick={() => setTab('list')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'list' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Staff List</button>
        <button onClick={() => setTab('schedule')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'schedule' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Schedule</button>
      </nav>

        {showAddModal && <AddStaffModal onClose={() => setShowAddModal(false)} />}

      {tab === 'schedule' && <StaffScheduleView />}

      {tab === 'list' && (<>
        <ExpiringCertsAlert />
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4" role="alert">
            <p className="text-red-700 text-sm">Failed to load staff. <button onClick={refetch} className="underline hover:no-underline">Try again</button></p>
          </div>
        )}

        {/* Stats */}
        {!statsError && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Active" value={stats.active} />
            <StatCard label="Coaches" value={stats.coaches} />
            <StatCard label="Front Desk" value={stats.front_desk} />
            <StatCard label="Sales" value={stats.sales} />
            <StatCard label="GM" value={stats.gm} />
            <StatCard label="Owner" value={stats.owner} />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center gap-3">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input max-w-xs text-sm" aria-label="Filter by role">
              <option value="">All Roles</option>
              <option value="owner">Owner</option>
              <option value="gm">General Manager</option>
              <option value="front_desk">Front Desk</option>
              <option value="coach">Coach</option>
              <option value="sales">Sales</option>
              <option value="social">Social Media</option>
            </select>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4 animate-pulse" aria-label="Loading">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded"></div>)}
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-12"><p className="text-gray-500">No staff found.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Phone</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Compliance</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDetailStaff(member)}>
                      <td className="px-4 py-3 whitespace-nowrap"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-medium text-red-700">{(member.name || '?')[0]}</div><span className="font-medium text-gray-900">{member.name}</span></div></td>
                      <td className="px-4 py-3 whitespace-nowrap"><RoleBadge role={member.role} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{member.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 hidden sm:table-cell">{member.phone || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize hidden lg:table-cell">{member.location || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{member.active ? <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Active</span> : <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">Inactive</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          const s = cStatus(member.id);
                          if (!s) return <span className="text-xs text-gray-400">—</span>;
                          const colors = { expired: 'bg-red-100 text-red-700', warning: 'bg-yellow-100 text-yellow-700', valid: 'bg-green-100 text-green-700' };
                          const labels = { expired: '⚠ Overdue', warning: '🟡 Expiring', valid: '✅ Compliant' };
                          return <button onClick={(e) => { e.stopPropagation(); setComplianceStaff(member); }} className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[s]}`}>{labels[s]}</button>;
                        })()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{new Date(member.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>)}

      {detailStaff && <StaffProfile staff={detailStaff} onClose={() => setDetailStaff(null)} tab={detailTab} onTabChange={setDetailTab} />}
      {complianceStaff && <ComplianceModal staff={complianceStaff} onClose={() => setComplianceStaff(null)} />}
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

function StaffProfile({ staff, onClose, tab, onTabChange }) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  const { data: perf } = useQuery({
    queryKey: ['staff-performance', staff.id],
    queryFn: async () => { const r = await api.get(`/api/staff-performance/${staff.id}`); return r.data; },
    enabled: !!staff.id,
    retry: 1,
    staleTime: 10000,
  });

  const { data: monthlyEarnings = [] } = useQuery({
    queryKey: ['staff-monthly-earnings', staff.id],
    queryFn: async () => {
      const end = new Date();
      const start = new Date(); start.setMonth(start.getMonth() - 5);
      const earnings = [];
      for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        const dateFrom = `${y}-${String(m).padStart(2, '0')}-01`;
        const dateTo = new Date(y, m, 0).toISOString().split('T')[0];
        try {
          const r = await api.get(`/api/staff-performance/${staff.id}`, { params: { date_from: dateFrom, date_to: dateTo } });
          earnings.push({ month: `${d.toLocaleString('default', { month: 'short' })}`, pt_revenue: r.data?.pt_revenue || 0, classes_taught: r.data?.classes_taught || 0 });
        } catch { earnings.push({ month: d.toLocaleString('default', { month: 'short' }), pt_revenue: 0, classes_taught: 0 }); }
      }
      return earnings;
    },
    enabled: !!staff.id && staff.role === 'coach',
    staleTime: 10000,
  });

  const toggleActive = useMutation({
    mutationFn: () => api.put(`/api/staff/${staff.id}`, { active: staff.active ? 0 : 1 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); success(staff.active ? 'Staff deactivated' : 'Staff activated'); },
    onError: () => error('Failed to update'),
  });

  const { data: staffCerts = [] } = useQuery({
    queryKey: ['staff-certs', staff.id],
    queryFn: async () => { const r = await api.get(`/api/certifications/staff/${staff.id}`); return r.data?.certifications || []; },
    enabled: !!staff.id,
    staleTime: 30000,
  });

  const addCert = useMutation({
    mutationFn: (name) => api.post('/api/certifications', { staff_id: staff.id, cert_name: name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-certs', staff.id] }); queryClient.invalidateQueries({ queryKey: ['all-certifications'] }); success('Cert added'); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

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

        <nav className="flex gap-1 border-b border-gray-200 px-5">
          <button onClick={() => onTabChange('overview')} className={`px-3 py-2 text-xs font-medium border-b-2 ${tab === 'overview' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Overview</button>
          {staff.role === 'coach' && <button onClick={() => onTabChange('performance')} className={`px-3 py-2 text-xs font-medium border-b-2 ${tab === 'performance' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Performance</button>}
          {staff.role === 'coach' && <button onClick={() => onTabChange('pt-earnings')} className={`px-3 py-2 text-xs font-medium border-b-2 ${tab === 'pt-earnings' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>PT Earnings</button>}
        </nav>

        <div className="p-5 space-y-4">
          {tab === 'overview' && (
            <>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-gray-500 inline">Email:</dt><dd className="inline ml-1">{staff.email}</dd></div>
                <div><dt className="text-gray-500 inline">Phone:</dt><dd className="inline ml-1">{staff.phone || '—'}</dd></div>
                {staff.location && <div><dt className="text-gray-500 inline">Location:</dt><dd className="inline ml-1 capitalize">{staff.location.replace(/_/g, ' ')}</dd></div>}
                <div><dt className="text-gray-500 inline">Joined:</dt><dd className="inline ml-1">{new Date(staff.created_at).toLocaleDateString()}</dd></div>
              </dl>

              {monthlyEarnings.length > 0 && (
                <section className="border-t pt-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Monthly PT Revenue (Last 6 Months)</h4>
                  <div className="flex items-end gap-2 h-20">
                    {(() => {
                      const max = Math.max(...monthlyEarnings.map(m => m.pt_revenue), 1);
                      return monthlyEarnings.map((m, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div className="w-full bg-green-500 rounded-t transition-colors min-h-[4px]" style={{ height: `${(m.pt_revenue / max) * 100}%` }} title={`$${m.pt_revenue}`} />
                          <span className="text-[9px] text-gray-400 mt-1">{m.month}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </section>
              )}

              <section className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Document Compliance</h3>
                  <button onClick={() => { const n = prompt('Certification name:'); if (n) addCert.mutate(n); }} className="text-xs text-blue-600 hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {staffCerts.length === 0 && <p className="text-xs text-gray-400">No certifications on file.</p>}
                  {staffCerts.map(doc => {
                    const d = daysUntil(doc.expiry_date);
                    const isExpired = d != null && d < 0;
                    const isUrgent = d != null && d >= 0 && d < 14;
                    const isWarning = d != null && d >= 14 && d < 60;
                    const noDate = d == null;
                    const bg = noDate ? 'bg-gray-50 border-gray-200 text-gray-500' : isExpired ? 'bg-red-50 border-red-200 text-red-700' : isUrgent ? 'bg-red-50 border-red-200 text-red-700' : isWarning ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600';
                    return (
                      <div key={doc.id} className={`border rounded-lg p-2 flex items-center justify-between ${bg}`}>
                        <span className="text-xs font-medium">{doc.cert_name}</span>
                        <span className="text-xs">{doc.expiry_date || 'Not set'}{isExpired ? ' (EXPIRED)' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="border-t pt-4 flex gap-2">
                <button onClick={toggleActive.mutate} className={`text-xs px-3 py-1.5 rounded-lg border ${staff.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                  {staff.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </>
          )}

          {tab === 'performance' && staff.role === 'coach' && (
            <CoachPerformanceTab perf={perf} staffId={staff.id} />
          )}

          {tab === 'pt-earnings' && staff.role === 'coach' && (
            <PTEarningsTab staffId={staff.id} />
          )}
        </div>
      </div>
    </div>
  );
}

function TrendArrow({ value }) {
  if (value == null) return null;
  if (value > 0) return <span className="text-green-600 text-xs ml-1">↑{value}</span>;
  if (value < 0) return <span className="text-red-600 text-xs ml-1">↓{Math.abs(value)}</span>;
  return <span className="text-gray-400 text-xs ml-1">→0</span>;
}

function CoachPerformanceTab({ perf, staffId }) {
  const { data: activePTClients = [] } = useQuery({
    queryKey: ['pt-clients', staffId],
    queryFn: async () => { const r = await api.get(`/api/staff-performance/${staffId}`); return r.data?.pt_clients || []; },
    enabled: !!staffId,
    staleTime: 10000,
  });

  const weeklyClasses = perf?.weekly_classes || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricBox label="Classes/month" value={perf?.classes_taught ?? '-'} trend={perf?.trends?.classes_taught} />
        <MetricBox label="Avg fill rate" value={perf?.avg_fill_rate != null ? `${perf.avg_fill_rate}%` : '-'} trend={perf?.trends?.avg_fill_rate} />
        <MetricBox label="PT sessions" value={perf?.pt_sessions ?? '-'} trend={perf?.trends?.pt_sessions} />
        <MetricBox label="PT revenue" value={perf?.pt_revenue != null ? `$${perf.pt_revenue}` : '-'} trend={perf?.trends?.pt_revenue} />
        <MetricBox label="Attendance rate" value={perf?.attendance_rate != null ? `${perf.attendance_rate}%` : '-'} trend={perf?.trends?.attendance_rate} />
        <MetricBox label="Retention rate" value={perf?.student_retention_rate != null ? `${perf.student_retention_rate}%` : '-'} trend={perf?.trends?.student_retention_rate} />
      </div>

      <section className="border-t pt-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">This Week's Classes</h4>
        {weeklyClasses.length === 0 ? (
          <p className="text-xs text-gray-400">No classes this week.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 uppercase">
                <th className="pb-1 pr-2">Class</th>
                <th className="pb-1 pr-2">Date</th>
                <th className="pb-1 pr-2">Time</th>
                <th className="pb-1 pr-2">Fill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {weeklyClasses.map(c => {
                const fill = c.capacity > 0 ? Math.round((c.booked_count / c.capacity) * 100) : 0;
                const fillColor = fill >= 80 ? 'text-green-600' : fill >= 50 ? 'text-yellow-600' : 'text-red-600';
                return (
                  <tr key={c.id}>
                    <td className="py-1.5 pr-2 font-medium">{c.class_name}</td>
                    <td className="py-1.5 pr-2 text-gray-500">{new Date(c.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td className="py-1.5 pr-2 text-gray-500">{c.start_time?.slice(0, 5)}</td>
                    <td className={`py-1.5 font-medium ${fillColor}`}>{fill}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="border-t pt-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">PT Clients</h4>
        {activePTClients.length === 0 ? (
          <p className="text-xs text-gray-400">No active PT clients.</p>
        ) : (
          <div className="space-y-2">
            {activePTClients.map(c => (
              <div key={c.member_id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                <div>
                  <p className="text-xs font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                  <p className="text-[10px] text-gray-500">{c.package_name}</p>
                </div>
                <span className={`text-xs font-medium ${c.sessions_remaining <= 2 ? 'text-red-600' : 'text-green-600'}`}>{c.sessions_remaining}/{c.sessions_total} remaining</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PTEarningsTab({ staffId }) {
  const { data: perf } = useQuery({
    queryKey: ['staff-performance', staffId],
    queryFn: async () => { const r = await api.get(`/api/staff-performance/${staffId}`); return r.data; },
    enabled: !!staffId,
    retry: 1,
    staleTime: 10000,
  });

  const earnings = perf?.pt_earnings;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricBox label="Total Sessions" value={earnings?.total_sessions ?? '-'} />
        <MetricBox label="Total Revenue" value={earnings?.total_revenue != null ? `$${earnings.total_revenue.toLocaleString()}` : '-'} />
        <MetricBox label={`Coach's Cut (${earnings?.split_pct ?? 0}%)`} value={earnings?.coach_cut != null ? `$${earnings.coach_cut.toLocaleString()}` : '-'} />
        <MetricBox label="Gym's Cut" value={earnings?.gym_cut != null ? `$${earnings.gym_cut.toLocaleString()}` : '-'} />
      </div>
      {earnings && (
        <div className="bg-gray-50 rounded p-3">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${earnings.split_pct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>Coach: {earnings.split_pct}% (${earnings.coach_cut.toLocaleString()})</span>
            <span>Gym: {100 - earnings.split_pct}% (${earnings.gym_cut.toLocaleString()})</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value, trend }) {
  return (
    <div className="bg-gray-50 rounded p-3 text-center">
      <p className="text-lg font-bold text-gray-900 flex items-center justify-center gap-1">{value}{trend != null && <TrendArrow value={trend} />}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function StaffScheduleView() {
  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['staff-schedule'],
    queryFn: () => api.get('/api/staff-schedule').then(r => r.data?.schedule || { shifts: [], timeOff: [] }),
    refetchInterval: 30000,
    staleTime: 10000,
  });
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ staff_id: '', day_of_week: 1, start_time: '09:00', end_time: '17:00', location: '' });

  const { data: staffList } = useQuery({ queryKey: ['staff', {}], queryFn: () => api.get('/api/staff').then(r => r.data), staleTime: 10000 });

  const addShift = useMutation({
    mutationFn: () => api.post('/api/staff-schedule/shifts', form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-schedule'] }); success('Shift added'); setShowForm(false); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });

  const delShift = useMutation({
    mutationFn: (id) => api.delete(`/api/staff-schedule/shifts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-schedule'] }); success('Shift removed'); },
    onError: () => error('Failed to delete'),
  });

  const shifts = scheduleData?.shifts || [];
  const timeOff = scheduleData?.timeOff || [];

  if (isLoading) return <div className="bg-white rounded-lg shadow p-6 animate-pulse"><div className="h-8 bg-gray-100 rounded w-48 mb-4"></div><div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-100 rounded"></div>)}</div></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Weekly Schedule</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs">{showForm ? 'Cancel' : '+ Add Shift'}</button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <select value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))} className="input text-xs" aria-label="Staff"><option value="">Staff...</option>{(staffList || []).map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select>
          <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: parseInt(e.target.value) }))} className="input text-xs" aria-label="Day">{DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}</select>
          <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="input text-xs" />
          <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="input text-xs" />
          <button onClick={addShift.mutate} disabled={!form.staff_id || addShift.isPending} className="bg-red-600 text-white text-xs py-2 rounded-lg hover:bg-red-700 disabled:opacity-40">Save</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
            <th className="px-4 py-2.5">Staff</th>{DAY_NAMES.map(d => <th key={d} className="px-3 py-2.5">{d}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {[...new Set(shifts.map(s => s.staff_id))].map(sid => {
              const staff = staffList?.find(s => s.id === sid);
              return <tr key={sid} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{staff?.first_name} {staff?.last_name}</td>
                {DAY_NAMES.map((_, di) => {
                  const dayShifts = shifts.filter(s => s.staff_id === sid && s.day_of_week === di);
                  return <td key={di} className="px-3 py-2.5 text-xs">{dayShifts.map(s => <div key={s.id} className="flex items-center gap-1"><span className="text-gray-700">{s.start_time}-{s.end_time}</span><button onClick={() => delShift.mutate(s.id)} className="text-red-400 hover:text-red-600">✕</button></div>)}</td>;
                })}
              </tr>;
            })}
            {shifts.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No shifts scheduled</td></tr>}
          </tbody>
        </table>
      </div>

      {timeOff.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Time Off</h3>
          <div className="space-y-1 text-xs text-yellow-700">{timeOff.map(t => <p key={t.id}>{t.first_name} {t.last_name}: {t.date_from} → {t.date_to} ({t.type})</p>)}</div>
        </div>
      )}
    </div>
  );
}

function ComplianceModal({ staff, onClose }) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  const { data: certs = [] } = useQuery({
    queryKey: ['staff-certs', staff.id],
    queryFn: async () => { const r = await api.get(`/api/certifications/staff/${staff.id}`); return r.data?.certifications || []; },
    enabled: !!staff.id,
    staleTime: 10000,
  });

  const renewCert = useMutation({
    mutationFn: (cert) => {
      const expiry = prompt(`Enter new expiry date for ${cert.cert_name} (YYYY-MM-DD):`, cert.expiry_date || '');
      if (!expiry) return Promise.reject();
      return api.put(`/api/certifications/${cert.id}`, { expiry_date: expiry });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-certs', staff.id] }); queryClient.invalidateQueries({ queryKey: ['all-certifications'] }); success('Certification renewed'); },
    onError: (err) => { if (err) error(err?.response?.data?.error || 'Failed to renew'); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="compliance-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="compliance-title" className="text-lg font-semibold text-gray-900">{staff.name} — Compliance</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        {certs.length === 0 ? (
          <p className="text-sm text-gray-500">No certifications on file.</p>
        ) : (
          <div className="space-y-3">
            {certs.map(cert => {
              const d = daysUntil(cert.expiry_date);
              const isExpired = d != null && d < 0;
              const isUrgent = d != null && d >= 0 && d < 14;
              const isWarning = d != null && d >= 14 && d < 60;
              const noDate = d == null;
              const border = noDate ? 'border-gray-200' : isExpired || isUrgent ? 'border-red-200' : isWarning ? 'border-yellow-200' : 'border-green-200';
              const bg = noDate ? 'bg-gray-50' : isExpired || isUrgent ? 'bg-red-50' : isWarning ? 'bg-yellow-50' : 'bg-green-50';
              return (
                <div key={cert.id} className={`border rounded-lg p-3 ${border} ${bg}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cert.cert_name}</p>
                      {cert.issuing_body && <p className="text-xs text-gray-500">{cert.issuing_body}</p>}
                    </div>
                    <button onClick={() => renewCert.mutate(cert)} className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700">Renew</button>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className={noDate ? 'text-gray-400' : isExpired ? 'text-red-600 font-medium' : isUrgent ? 'text-red-600 font-medium' : isWarning ? 'text-yellow-600' : 'text-green-600'}>
                      {cert.expiry_date || 'No expiry date'}
                    </span>
                    {d != null && (
                      <span className={d < 0 ? 'text-red-600 font-medium' : d < 14 ? 'text-red-600 font-medium' : d < 60 ? 'text-yellow-600' : 'text-green-600'}>
                        ({d < 0 ? `${Math.abs(d)} days overdue` : `${d} days remaining`})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="btn-outline text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

function ExpiringCertsAlert() {
  const [alertDays, setAlertDays] = useState(60);
  const [criticalDays, setCriticalDays] = useState(14);
  useEffect(() => {
    fetch('/api/settings', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json()).then(s => {
        if (s.system?.doc_expiry_alert_days) setAlertDays(parseInt(s.system.doc_expiry_alert_days, 10));
        if (s.system?.doc_expiry_critical_days) setCriticalDays(parseInt(s.system.doc_expiry_critical_days, 10));
      }).catch(() => {});
  }, []);
  const { data: certs = [] } = useQuery({
    queryKey: ['expiring-certs', alertDays],
    queryFn: async () => { const r = await api.get(`/api/certifications/expiring?days=${alertDays}`); return r.data?.expiring || []; },
    staleTime: 60000,
  });
  if (certs.length === 0) return null;
  const expired = certs.filter(c => daysUntil(c.expiry_date) < 0);
  const urgent = certs.filter(c => { const d = daysUntil(c.expiry_date); return d >= 0 && d < criticalDays; });
  const warning = certs.filter(c => { const d = daysUntil(c.expiry_date); return d >= criticalDays && d < alertDays; });
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900">Compliance Summary</h3>
        {expired.length > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{expired.length} Expired</span>}
        {urgent.length > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{urgent.length} Urgent (&lt;{criticalDays}d)</span>}
        {warning.length > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">{warning.length} Warning (&lt;{alertDays}d)</span>}
        {certs.length > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{certs.length} Total Certifications</span>}
      </div>
    </div>
  );
}
