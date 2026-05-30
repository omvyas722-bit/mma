// Staff management page
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function Staff() {
  const { hasPermission } = useAuth();
  const [roleFilter, setRoleFilter] = useState('');

  const { data: staff = [], isLoading, isError } = useQuery({
    queryKey: ['staff', { role: roleFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);

      const response = await api.get(`/api/staff?${params}`);
      return response.data;
    },
  });

  const { data: stats, isError: statsError } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: async () => {
      const response = await api.get('/api/staff/stats');
      return response.data;
    },
  });

  const canManageStaff = hasPermission('staff:create');

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
        {canManageStaff && (
          <button type="button" className="btn btn-primary">Add Staff Member</button>
        )}
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">Failed to load staff data. Please try again.</p>
        </div>
      )}

      {/* Stats */}
      {stats && !statsError && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
          <StatCard label="Total Staff" value={stats.total} />
          {(stats.by_role || []).map((role) => (
            <StatCard
              key={role.role}
              label={role.role.replace('_', ' ').toUpperCase()}
              value={role.count}
            />
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input"
        >
          <option value="">All Roles</option>
          <option value="owner">Owner</option>
          <option value="gm">GM</option>
          <option value="front_desk">Front Desk</option>
          <option value="coach">Coach</option>
          <option value="sales">Sales</option>
          <option value="social">Social Media</option>
        </select>
      </div>

      {/* Staff table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No staff members found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{member.phone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {member.active ? (
                      <span className="badge badge-green">Active</span>
                    ) : (
                      <span className="badge badge-gray">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function RoleBadge({ role }) {
  const colors = {
    owner: 'bg-red-100 text-red-800',
    gm: 'bg-red-100 text-red-800',
    front_desk: 'bg-green-100 text-green-800',
    coach: 'bg-yellow-100 text-yellow-800',
    sales: 'bg-purple-100 text-purple-800',
    social: 'bg-pink-100 text-pink-800',
  };

  return (
    <span className={`badge ${colors[role] || 'badge-gray'}`}>
      {role.replace('_', ' ').toUpperCase()}
    </span>
  );
}
