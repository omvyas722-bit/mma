// Billing/Transactions page
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { formatDate, formatCurrency } from '../lib/formatters';

export default function Billing() {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', { status: statusFilter, type: typeFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);

      const response = await api.get(`/api/transactions?${params}`);
      return response.data;
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['transaction-stats'],
    queryFn: async () => {
      const response = await api.get('/api/transactions/stats');
      return response.data;
    },
  });

  const transactions = transactionsData?.transactions || [];
  const total = transactionsData?.total || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Transactions</h1>
        <button type="button" className="btn btn-primary">Record Payment</button>
      </div>

      {/* Stats cards */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Today's Revenue" value={formatCurrency(stats.today)} color="green" />
          <StatCard label="This Month" value={formatCurrency(stats.this_month)} color="blue" />
          <StatCard label="MRR" value={formatCurrency(stats.mrr)} color="purple" />
          <StatCard
            label="Failed This Month"
            value={`${stats.failed_this_month?.count || 0} ($${stats.failed_this_month?.total?.toFixed?.(2) || '0.00'})`}
            color="red"
          />
        </div>
      )}

      {/* Revenue by type */}
      {!statsLoading && stats && stats.by_type?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Revenue by Type (This Month)</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {stats.by_type.map((item) => (
              <div key={item.type} className="text-center">
                <p className="text-sm text-gray-500 capitalize">{item.type.replace('_', ' ')}</p>
                <p className="text-2xl font-bold text-gray-900">${item.total.toFixed(2)}</p>
                <p className="text-xs text-gray-400">{item.count} transactions</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="">All Statuses</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input"
          >
            <option value="">All Types</option>
            <option value="membership">Membership</option>
            <option value="hold_fee">Hold Fee</option>
            <option value="pt_pack">PT Pack</option>
            <option value="product">Product</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {transactionsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{transaction.member_name}</div>
                      <div className="text-sm text-gray-500">{transaction.member_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="badge badge-blue capitalize">
                        {transaction.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {transaction.payment_method || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-gray-50 px-6 py-3 text-sm text-gray-700">
              Showing {transactions.length} of {total} transactions
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'blue' }) {
  const colors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    red: 'text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const badges = {
    succeeded: 'badge-green',
    failed: 'badge-red',
    pending: 'badge-yellow',
    refunded: 'badge-gray',
  };

  return (
    <span className={`badge ${badges[status] || 'badge-gray'} capitalize`}>
      {status}
    </span>
  );
}
