// Reports page
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function Reports() {
  const [reportType, setReportType] = useState('membership');
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', reportType, dateFrom, dateTo],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const response = await api.get(`/api/reports/${reportType}`, {
        params: { date_from: dateFrom, date_to: dateTo }
      });
      return response.data;
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Reports</h1>

      {/* Report controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="input"
            >
              <option value="membership">Membership</option>
              <option value="revenue">Revenue</option>
              <option value="attendance">Attendance</option>
              <option value="leads">Leads</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex items-end">
            <button onClick={() => refetch()} className="btn btn-primary w-full">
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Report content */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">Failed to load report. Please try again.</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : !isError && report ? (
        <>
          {reportType === 'membership' && <MembershipReport data={report} />}
          {reportType === 'revenue' && <RevenueReport data={report} />}
          {reportType === 'attendance' && <AttendanceReport data={report} />}
          {reportType === 'leads' && <LeadsReport data={report} />}
        </>
      ) : null}
    </div>
  );
}

function MembershipReport({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard label="Total Members" value={data?.summary?.total_members ?? 0} />
        <StatCard label="Active" value={data?.summary?.active ?? 0} color="green" />
        <StatCard label="Trial" value={data?.summary?.trial ?? 0} color="yellow" />
        <StatCard label="Paused" value={data?.summary?.paused ?? 0} color="gray" />
        <StatCard label="Cancelled" value={data?.summary?.cancelled ?? 0} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By location */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Members by Location</h3>
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Location</th>
                <th className="text-left py-2">Status</th>
                <th className="text-right py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {(data?.by_location || []).map((row) => (
                <tr key={row.location + row.status} className="border-b">
                  <td className="py-2 capitalize">{row.location.replace('_', ' ')}</td>
                  <td className="py-2 capitalize">{row.status}</td>
                  <td className="py-2 text-right">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* By plan */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Active Members by Plan</h3>
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Plan</th>
                <th className="text-right py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {(data?.by_plan || []).map((row) => (
                <tr key={row.plan || 'no-plan'} className="border-b">
                  <td className="py-2 capitalize">{row.plan?.replace('_', ' ') || 'No plan'}</td>
                  <td className="py-2 text-right">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trial conversions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">Trial Conversions</h3>
        <p className="text-3xl font-bold text-green-600">{data?.trial_conversions ?? 0}</p>
        <p className="text-sm text-gray-500">Members converted from trial to active</p>
      </div>
    </div>
  );
}

function RevenueReport({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`$${data?.summary?.total_revenue?.toFixed?.(2) || '0.00'}`} color="green" />
        <StatCard label="Transactions" value={data?.summary?.total_transactions ?? 0} />
        <StatCard label="Failed Payments" value={data?.summary?.failed_payments?.count ?? 0} color="red" />
        <StatCard label="Avg Transaction" value={`$${data?.summary?.avg_transaction?.toFixed?.(2) || '0.00'}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue by Type</h3>
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Count</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {(data?.by_type || []).map((row) => (
                <tr key={row.type || 'unknown'} className="border-b">
                  <td className="py-2 capitalize">{row.type?.replace('_', ' ') || ''}</td>
                  <td className="py-2 text-right">{row.count ?? 0}</td>
                  <td className="py-2 text-right font-medium">${(row.total ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top members */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top 10 Members by Revenue</h3>
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Member</th>
                <th className="text-right py-2">Transactions</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {(data?.top_members || []).map((row) => (
                <tr key={row.name} className="border-b">
                  <td className="py-2">{row.name}</td>
                  <td className="py-2 text-right">{row.transaction_count ?? 0}</td>
                  <td className="py-2 text-right font-medium">${(row.total_spent ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AttendanceReport({ data }) {
  if (!data) return null;

  const totalBookings = data?.summary?.total_bookings || 0;
  const attended = data?.summary?.attended || 0;
  const attendanceRate = totalBookings > 0
    ? ((attended / totalBookings) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard label="Total Bookings" value={totalBookings} />
        <StatCard label="Attended" value={attended} color="green" />
        <StatCard label="No Shows" value={data?.summary?.no_shows || 0} color="red" />
        <StatCard label="Cancelled" value={data?.summary?.cancelled || 0} color="gray" />
        <StatCard label="Attendance Rate" value={`${attendanceRate}%`} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By class type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Attendance by Class Type</h3>
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Class Type</th>
                <th className="text-right py-2">Bookings</th>
                <th className="text-right py-2">Attended</th>
                <th className="text-right py-2">Rate</th>
              </tr>
            </thead>
            <tbody>
              {(data?.by_class_type || []).map((row) => {
                const rate = row.bookings > 0 ? ((row.attended / row.bookings) * 100).toFixed(1) : 0;
                return (
                  <tr key={row.class_type} className="border-b">
                    <td className="py-2 uppercase">{row.class_type}</td>
                    <td className="py-2 text-right">{row.bookings}</td>
                    <td className="py-2 text-right">{row.attended}</td>
                    <td className="py-2 text-right">{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Top attendees */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top 10 Attendees</h3>
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Member</th>
                <th className="text-right py-2">Bookings</th>
                <th className="text-right py-2">Attended</th>
              </tr>
            </thead>
            <tbody>
              {(data?.top_attendees || []).map((row) => (
                <tr key={row.name} className="border-b">
                  <td className="py-2">{row.name}</td>
                  <td className="py-2 text-right">{row.total_bookings}</td>
                  <td className="py-2 text-right font-medium">{row.attended}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LeadsReport({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={data?.summary?.total_leads ?? 0} />
        <StatCard label="Converted" value={data?.summary?.converted ?? 0} color="green" />
        <StatCard label="Lost" value={data?.summary?.lost ?? 0} color="red" />
        <StatCard label="Conversion Rate" value={`${data?.summary?.conversion_rate ?? 0}%`} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By source */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Leads by Source</h3>
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Source</th>
                <th className="text-right py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {(data?.by_source || []).map((row) => (
                <tr key={row.source || 'unknown'} className="border-b">
                  <td className="py-2 capitalize">{row.source?.replace('_', ' ') || 'Unknown'}</td>
                  <td className="py-2 text-right">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* By stage */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Leads by Stage</h3>
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Stage</th>
                <th className="text-right py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {(data?.by_stage || []).map((row) => (
                <tr key={row.stage || 'unknown'} className="border-b">
                  <td className="py-2 capitalize">{row.stage?.replace('_', ' ') || ''}</td>
                  <td className="py-2 text-right">{row.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversion funnel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
        <div className="space-y-2">
          <FunnelBar label="New Leads" value={data?.conversion_funnel?.new || 0} max={data?.conversion_funnel?.new || 0} />
          <FunnelBar label="Contacted" value={data?.conversion_funnel?.contacted || 0} max={data?.conversion_funnel?.new || 0} />
          <FunnelBar label="Trial Booked" value={data?.conversion_funnel?.trial_booked || 0} max={data?.conversion_funnel?.new || 0} />
          <FunnelBar label="Trial Completed" value={data?.conversion_funnel?.trial_completed || 0} max={data?.conversion_funnel?.new || 0} />
          <FunnelBar label="Converted" value={data?.conversion_funnel?.converted || 0} max={data?.conversion_funnel?.new || 0} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'blue' }) {
  const colors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    gray: 'text-gray-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
}

function FunnelBar({ label, value, max }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-6">
        <div
          className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium"
          style={{ width: `${percentage}%` }}
        >
          {percentage > 10 && `${percentage.toFixed(0)}%`}
        </div>
      </div>
    </div>
  );
}
