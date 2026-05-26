// Payments Page - Billing and Transaction Management
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../lib/formatters';
import { PageLoader } from '../components/Shared/Spinner';
import Modal from '../components/Shared/Modal';

export default function Payments() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payments', { status: statusFilter, query: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('query', searchQuery);

      const [transactionsRes, statsRes] = await Promise.all([
        api.get(`/api/transactions?${params}`),
        api.get('/api/transactions/stats')
      ]);

      return {
        transactions: transactionsRes.transactions || [],
        summary: {
          total_revenue: statsRes.mrr || 0,
          pending_amount: 0,
          failed_count: statsRes.failed_this_month?.count || 0,
          month_revenue: statsRes.this_month || 0,
        }
      };
    },
  });

  const payments = data?.transactions || [];
  const summary = data?.summary || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <button
          onClick={() => setShowProcessModal(true)}
          className="btn btn-primary"
        >
          Process Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          label="Total Revenue"
          value={formatCurrency(summary.total_revenue || 0)}
          color="green"
        />
        <SummaryCard
          label="Pending"
          value={formatCurrency(summary.pending_amount || 0)}
          color="yellow"
        />
        <SummaryCard
          label="Failed"
          value={summary.failed_count || 0}
          color="red"
        />
        <SummaryCard
          label="This Month"
          value={formatCurrency(summary.month_revenue || 0)}
          color="blue"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search by member name or transaction ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="">All Statuses</option>
            <option value="succeeded">Succeeded</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    onRefund={() => {}}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Process Payment Modal */}
      <ProcessPaymentModal
        isOpen={showProcessModal}
        onClose={() => {
          setShowProcessModal(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
      />
    </div>
  );
}

function PaymentRow({ payment, onRefund }) {
  const queryClient = useQueryClient();

  const refundPayment = useMutation({
    mutationFn: async () => {
      await api.post(`/api/transactions/${payment.id}/refund`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      alert('Payment refunded successfully');
    },
    onError: (error) => {
      console.error('Error refunding payment:', error);
      alert('Failed to refund payment');
    }
  });

  const handleRefund = () => {
    if (confirm(`Refund ${formatCurrency(payment.amount)} to ${payment.member_name}?`)) {
      refundPayment.mutate();
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatDate(payment.created_at)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {payment.member_name}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {payment.description}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {formatCurrency(payment.amount)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <PaymentStatusBadge status={payment.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {payment.status === 'succeeded' && (
          <button
            onClick={handleRefund}
            disabled={refundPayment.isPending}
            className="text-red-600 hover:text-red-900"
          >
            Refund
          </button>
        )}
      </td>
    </tr>
  );
}

function ProcessPaymentModal({ isOpen, onClose, member }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    description: '',
    type: 'membership',
    payment_method: 'card',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(member);

  const { data: members = [] } = useQuery({
    queryKey: ['members-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const response = await api.get('/api/members', {
        params: { query: searchQuery }
      });
      return response.data.members || [];
    },
    enabled: isOpen && searchQuery.length >= 2,
  });

  const processPayment = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/api/transactions', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      onClose();
      resetForm();
      alert('Payment processed successfully');
    },
    onError: (error) => {
      console.error('Error processing payment:', error);
      alert('Failed to process payment');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedMember) {
      alert('Please select a member');
      return;
    }

    processPayment.mutate({
      ...formData,
      member_id: selectedMember.id,
      amount: parseFloat(formData.amount),
    });
  };

  const resetForm = () => {
    setFormData({
      member_id: '',
      amount: '',
      description: '',
      type: 'membership',
      payment_method: 'card',
    });
    setSearchQuery('');
    setSelectedMember(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Payment" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Member Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Member *
          </label>
          {selectedMember ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">
                  {selectedMember.first_name} {selectedMember.last_name}
                </p>
                <p className="text-sm text-gray-500">{selectedMember.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="text-blue-600 hover:text-blue-900"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="input mb-2"
              />
              {searchQuery.length >= 2 && (
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {members.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No members found</p>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedMember(m);
                            setSearchQuery('');
                          }}
                          className="p-3 cursor-pointer hover:bg-gray-50"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {m.first_name} {m.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{m.email}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="input pl-8"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="input"
            placeholder="Monthly membership fee"
            required
          />
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transaction Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            className="input"
            required
          >
            <option value="membership">Membership</option>
            <option value="hold_fee">Hold Fee</option>
            <option value="pt_pack">PT Pack</option>
            <option value="product">Product</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <select
            value={formData.payment_method}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
            className="input"
          >
            <option value="card">Credit/Debit Card</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={processPayment.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={processPayment.isPending}
          >
            {processPayment.isPending ? 'Processing...' : 'Process Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SummaryCard({ label, value, color }) {
  const colors = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
}

function PaymentStatusBadge({ status }) {
  const badges = {
    succeeded: 'badge-green',
    pending: 'badge-yellow',
    failed: 'badge-red',
    refunded: 'badge-gray',
  };

  return (
    <span className={`badge ${badges[status] || 'badge-gray'} capitalize`}>
      {status}
    </span>
  );
}
