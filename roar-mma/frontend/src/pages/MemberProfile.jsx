// Member Profile Page
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../lib/api';
import { formatDate, formatCurrency, formatPhone, calculateAge } from '../lib/formatters';
import EditMemberModal from '../components/Members/EditMemberModal';
import ConfirmDialog from '../components/Shared/ConfirmDialog';
import { PageLoader } from '../components/Shared/Spinner';
import { useNotifications } from '../contexts/NotificationContext';

export default function MemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { error } = useNotifications();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch member data
  const { data: member, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: async () => {
      const response = await api.get(`/api/members/${id}`);
      return response.data;
    },
  });

  // Fetch member attendance
  const { data: attendance = [] } = useQuery({
    queryKey: ['member-attendance', id],
    queryFn: async () => {
      const response = await api.get(`/api/members/${id}/attendance`);
      return response.data;
    },
  });

  // Fetch member payments
  const { data: payments = [] } = useQuery({
    queryKey: ['member-payments', id],
    queryFn: async () => {
      const response = await api.get(`/api/members/${id}/payments`);
      return response.data;
    },
  });

  const deleteMember = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['members']);
      navigate('/members');
    },
    onError: (err) => {
      console.error('Error deleting member:', err);
      error('Failed to delete member. Please try again.');
    }
  });

  if (isLoading) return <PageLoader />;
  if (!member) return <div>Member not found</div>;

  const age = member.date_of_birth ? calculateAge(member.date_of_birth) : null;

  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {(member.first_name || '?')[0]}{(member.last_name || '?')[0]}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {member.first_name} {member.last_name}
                </h1>
                <p className="text-gray-600">{member.email}</p>
                <p className="text-gray-600">{formatPhone(member.phone)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="btn btn-secondary"
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="btn bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2 mt-4">
            <StatusBadge status={member.membership_status} />
            <span className="badge badge-blue capitalize">
              {member.membership_type?.replace('_', ' ')}
            </span>
            {member.belt_rank && (
              <span className="badge badge-purple capitalize">
                {member.belt_rank} Belt
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'attendance'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'payments'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Payments
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
            <dl className="space-y-3">
              <InfoRow label="Date of Birth" value={member.date_of_birth ? formatDate(member.date_of_birth) : 'Not provided'} />
              {age && <InfoRow label="Age" value={`${age} years`} />}
              <InfoRow label="Gender" value={member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : 'Not provided'} />
              <InfoRow label="Address" value={member.address || 'Not provided'} />
              <InfoRow label="Suburb" value={member.suburb || 'Not provided'} />
              <InfoRow label="Postcode" value={member.postcode || 'Not provided'} />
            </dl>
          </div>

          {/* Membership Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Membership Information</h2>
            <dl className="space-y-3">
              <InfoRow label="Status" value={<StatusBadge status={member.membership_status} />} />
              <InfoRow label="Type" value={member.membership_type?.replace('_', ' ').toUpperCase()} />
              <InfoRow label="Joined Date" value={formatDate(member.joined_date)} />
              <InfoRow label="Location" value={member.location?.replace('_', ' ')} />
              <InfoRow label="Belt Rank" value={member.belt_rank ? `${member.belt_rank} Belt` : 'Not set'} />
            </dl>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Emergency Contact</h2>
            <dl className="space-y-3">
              <InfoRow label="Name" value={member.emergency_contact_name || 'Not provided'} />
              <InfoRow label="Phone" value={member.emergency_contact_phone ? formatPhone(member.emergency_contact_phone) : 'Not provided'} />
            </dl>
          </div>

          {/* Medical & Goals */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Medical & Goals</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Medical Conditions</h3>
                <p className="text-gray-600">{member.medical_conditions || 'None reported'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Training Goals</h3>
                <p className="text-gray-600">{member.goals || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Attendance History</h2>
            {attendance.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No attendance records</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checked In</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendance.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.class_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.start_time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.checked_in_at ? new Date(record.checked_in_at).toLocaleTimeString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Payment History</h2>
            {payments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No payment records</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(payment.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <EditMemberModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        member={member}
      />
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => deleteMember.mutate()}
        title="Delete Member"
        message={`Are you sure you want to delete ${member.first_name} ${member.last_name}? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }) {
  const badges = {
    active: 'badge-green',
    trial: 'badge-yellow',
    paused: 'badge-gray',
    cancelled: 'badge-red',
  };

  return (
    <span className={`badge ${badges[status] || 'badge-gray'} capitalize`}>
      {status}
    </span>
  );
}

function PaymentStatusBadge({ status }) {
  const badges = {
    succeeded: 'badge-green',
    pending: 'badge-yellow',
    failed: 'badge-red',
  };

  return (
    <span className={`badge ${badges[status] || 'badge-gray'} capitalize`}>
      {status}
    </span>
  );
}
