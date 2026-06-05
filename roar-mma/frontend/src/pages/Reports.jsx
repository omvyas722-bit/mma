// Reports page
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

const REPORT_TABS = ['membership', 'revenue', 'attendance', 'leads', 'staff_performance', 'pt_revenue', 'grading_stats', 'retention', 'social_media', 'eod_history'];

export default function Reports() {
  const [reportType, setReportType] = useState('membership');
  const today = () => { const d = new Date(); return d.toISOString().split('T')[0]; };
  const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);

  const applyPreset = (preset) => {
    const now = new Date();
    let from, to = today();
    if (preset === 'this_month') { from = firstOfMonth(); }
    else if (preset === 'last_month') { const d = new Date(); d.setMonth(d.getMonth()-1, 1); from = d.toISOString().split('T')[0]; const e = new Date(); e.setDate(0); to = e.toISOString().split('T')[0]; }
    else if (preset === 'last_30') { const d = new Date(); d.setDate(d.getDate()-30); from = d.toISOString().split('T')[0]; }
    else if (preset === 'this_year') { from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; }
    setDateFrom(from); setDateTo(to);
  };

  const needsBackend = ['staff_performance', 'pt_revenue', 'grading_stats', 'retention', 'social_media', 'eod_history'].includes(reportType);
  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', reportType, dateFrom, dateTo],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      if (['membership', 'revenue', 'attendance', 'leads', 'staff_performance', 'pt_revenue', 'grading_stats', 'retention', 'social_media', 'eod_history'].includes(reportType)) {
        const response = await api.get(`/api/reports/${reportType}`, {
          params: { date_from: dateFrom, date_to: dateTo }
        });
        return response.data;
      }
      return {};
    },
    enabled: !needsBackend || reportType !== 'eod_history',
  });

  const { data: eodData = [], isLoading: eodLoading } = useQuery({
    queryKey: ['eod-reports', dateFrom, dateTo],
    queryFn: async () => { const r = await api.get('/api/reports/eod_history', { params: { date_from: dateFrom, date_to: dateTo } }); return r.data?.reports || []; },
    enabled: reportType === 'eod_history',
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Reports</h1>

      {/* Report controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex gap-2 mb-4 flex-wrap">
          <button type="button" onClick={() => applyPreset('this_month')} className="text-xs px-3 py-1 border rounded hover:bg-gray-50">This Month</button>
          <button type="button" onClick={() => applyPreset('last_month')} className="text-xs px-3 py-1 border rounded hover:bg-gray-50">Last Month</button>
          <button type="button" onClick={() => applyPreset('last_30')} className="text-xs px-3 py-1 border rounded hover:bg-gray-50">Last 30 Days</button>
          <button type="button" onClick={() => applyPreset('this_year')} className="text-xs px-3 py-1 border rounded hover:bg-gray-50">This Year</button>
        </div>
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
              <option value="staff_performance">Staff Performance</option>
              <option value="pt_revenue">PT Revenue</option>
              <option value="grading_stats">Grading Stats</option>
              <option value="retention">Retention</option>
              <option value="social_media">Social Media</option>
              <option value="eod_history">EOD History</option>
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

          <div className="flex items-end gap-2">
            <button type="button" onClick={() => refetch()} className="btn btn-primary w-full">
              Generate Report
            </button>
            {report && !isError && !['eod_history', 'staff_performance', 'pt_revenue', 'grading_stats', 'retention', 'social_media'].includes(reportType) && (
              <button type="button" onClick={() => exportCSV(report, reportType)} className="btn btn-outline w-full">
                Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report content */}
      {isError && !['staff_performance', 'pt_revenue', 'grading_stats', 'retention', 'social_media'].includes(reportType) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-center" role="alert">
          <p className="text-red-700 text-sm mb-3">Failed to load report. Please try again.</p>
          <button type="button" onClick={refetch} className="text-sm text-red-600 underline hover:no-underline">Retry</button>
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
          {reportType === 'staff_performance' && <StaffPerformanceReport data={report} />}
          {reportType === 'pt_revenue' && <PTRevenueReport data={report} />}
          {reportType === 'grading_stats' && <GradingStatsReport data={report} />}
          {reportType === 'retention' && <RetentionReport data={report} />}
          {reportType === 'social_media' && <SocialMediaReport data={report} />}
        </>
      ) : null}
      {reportType === 'eod_history' && <EODHistoryReport data={eodData} loading={eodLoading} />}
    </div>
  );
}

function MembershipReport({ data }) {
  if (!data) return null;

  const byLocation = data?.by_location || [];
  const byPlan = data?.by_plan || [];
  const maxLoc = Math.max(...byLocation.map(r => r.count || 0), 1);
  const maxPlan = Math.max(...byPlan.map(r => r.count || 0), 1);

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
        {/* By location bar chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Members by Location</h3>
          <div className="space-y-3">
            {byLocation.map((row) => (
              <div key={row.location + row.status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize">{row.location?.replace('_', ' ') || ''} <span className="text-gray-500">({row.status})</span></span>
                  <span className="font-medium">{row.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className="bg-blue-500 h-4 rounded-full text-xs text-white text-right pr-2 leading-4"
                    style={{ width: `${(row.count / maxLoc) * 100}%` }}>
                    {row.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By plan bar chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Active Members by Plan</h3>
          <div className="space-y-3">
            {byPlan.map((row) => (
              <div key={row.plan || 'no-plan'}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize">{row.plan?.replace('_', ' ') || 'No plan'}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className="bg-green-500 h-4 rounded-full text-xs text-white text-right pr-2 leading-4"
                    style={{ width: `${(row.count / maxPlan) * 100}%` }}>
                    {row.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
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

  const byType = data?.by_type || [];
  const maxTypeTotal = Math.max(...byType.map(r => r.total || 0), 1);
  const topMembers = data?.top_members || [];
  const maxMemberTotal = Math.max(...topMembers.map(r => r.total_spent || 0), 1);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`$${data?.summary?.total_revenue?.toFixed?.(2) || '0.00'}`} color="green" />
        <StatCard label="Transactions" value={data?.summary?.total_transactions ?? 0} />
        <StatCard label="Failed Payments" value={data?.summary?.failed_payments?.count ?? 0} color="red" />
        <StatCard label="Avg Transaction" value={`$${data?.summary?.avg_transaction?.toFixed?.(2) || '0.00'}`} />
      </div>

      {/* Revenue trend chart */}
      {data?.daily_revenue?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Revenue Trend</h3>
          <div className="flex items-end gap-1 h-32">
            {data.daily_revenue.slice(-30).map((d, i) => {
              const max = Math.max(...data.daily_revenue.slice(-30).map(x => x.total || 0), 1);
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                  <div className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors min-h-[2px]"
                    style={{ height: `${((d.total || 0) / max) * 100}%` }}
                    title={`${d.date}: $${(d.total || 0).toFixed(0)}`} />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Last 30 days</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By type - bar chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue by Type</h3>
          <div className="space-y-3">
            {byType.map((row) => (
              <div key={row.type || 'unknown'}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize">{row.type?.replace(/_/g, ' ') || ''}</span>
                  <span className="font-medium">${(row.total ?? 0).toFixed(0)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className="bg-blue-500 h-4 rounded-full text-xs text-white text-right pr-2 leading-4"
                    style={{ width: `${((row.total || 0) / maxTypeTotal) * 100}%` }}>
                    {row.count ?? 0} tx
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top members bar chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top 10 Members by Revenue</h3>
          <div className="space-y-2">
            {topMembers.map((row) => (
              <div key={row.name}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-700 truncate">{row.name}</span>
                  <span className="text-gray-500">${(row.total_spent ?? 0).toFixed(0)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: `${((row.total_spent || 0) / maxMemberTotal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
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

function exportCSV(report, type) {
  const rows = [];
  if (type === 'membership') {
    const s = report.summary || {};
    rows.push(['Metric', 'Value'], ['Total Members', s.total_members], ['Active', s.active], ['Trial', s.trial], ['Paused', s.paused], ['Cancelled', s.cancelled], [], ['Trial Conversions', report.trial_conversions]);
    if (report.by_location?.length) { rows.push([], ['Location', 'Status', 'Count']); report.by_location.forEach(r => rows.push([r.location, r.status, r.count])); }
    if (report.by_plan?.length) { rows.push([], ['Plan', 'Count']); report.by_plan.forEach(r => rows.push([r.plan, r.count])); }
  } else if (type === 'revenue') {
    const s = report.summary || {};
    rows.push(['Metric', 'Value'], ['Total Revenue', s.total_revenue], ['Transactions', s.total_transactions], ['Failed Payments', s.failed_payments?.count], ['Avg Transaction', s.avg_transaction]);
    if (report.by_type?.length) { rows.push([], ['Type', 'Count', 'Total']); report.by_type.forEach(r => rows.push([r.type, r.count, r.total])); }
    if (report.top_members?.length) { rows.push([], ['Member', 'Transactions', 'Total Spent']); report.top_members.forEach(r => rows.push([r.name, r.transaction_count, r.total_spent])); }
  } else if (type === 'attendance') {
    const s = report.summary || {};
    rows.push(['Metric', 'Value'], ['Total Bookings', s.total_bookings], ['Attended', s.attended], ['No Shows', s.no_shows], ['Cancelled', s.cancelled], ['Rate', s.attendance_rate]);
    if (report.by_class_type?.length) { rows.push([], ['Class Type', 'Bookings', 'Attended', 'Rate']); report.by_class_type.forEach(r => rows.push([r.class_type, r.bookings, r.attended, ((r.attended / (r.bookings || 1)) * 100).toFixed(1) + '%'])); }
    if (report.top_attendees?.length) { rows.push([], ['Member', 'Bookings', 'Attended']); report.top_attendees.forEach(r => rows.push([r.name, r.total_bookings, r.attended])); }
  } else if (type === 'leads') {
    const s = report.summary || {};
    rows.push(['Metric', 'Value'], ['Total Leads', s.total_leads], ['Converted', s.converted], ['Lost', s.lost], ['Conversion Rate', s.conversion_rate + '%']);
    if (report.by_source?.length) { rows.push([], ['Source', 'Count']); report.by_source.forEach(r => rows.push([r.source, r.count])); }
    if (report.by_stage?.length) { rows.push([], ['Stage', 'Count']); report.by_stage.forEach(r => rows.push([r.stage, r.count])); }
  }
  const csv = rows.map(r => r.map(c => typeof c === 'string' && (c.includes(',') || c.includes('"') || c.includes('\n')) ? `"${c.replace(/"/g, '""')}"` : c).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${type}-report.csv`; a.click();
  URL.revokeObjectURL(url);
}

function StaffPerformanceReport({ data }) {
  if (!data) return <div className="bg-white rounded-lg shadow p-6"><p className="text-sm text-gray-400">Report data available. Full visualization coming in next release.</p></div>;
  const staff = data?.staff || [];
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Staff Performance</h3>
      {staff.length === 0 ? <p className="text-sm text-gray-400">No staff data for this period.</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Staff</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Classes Taught</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">PT Sessions</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">PT Revenue</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Signups</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {staff.map(s => (
                <tr key={s.staff_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{s.staff_name}</td>
                  <td className="px-4 py-2 text-sm text-right">{s.metrics?.classes_taught ?? '-'}</td>
                  <td className="px-4 py-2 text-sm text-right">{s.metrics?.pt_sessions_sold ?? '-'}</td>
                  <td className="px-4 py-2 text-sm text-right">${(s.metrics?.pt_revenue || 0).toFixed(0)}</td>
                  <td className="px-4 py-2 text-sm text-right">{s.metrics?.signups ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PTRevenueReport({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total PT Revenue" value={`$${(data?.summary?.total_revenue || 0).toFixed(2)}`} color="green" />
        <StatCard label="PT Sessions" value={data?.summary?.total_sessions || 0} />
        <StatCard label="Avg per Session" value={`$${(data?.summary?.avg_per_session || 0).toFixed(2)}`} />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">PT Revenue Breakdown</h3>
        <p className="text-sm text-gray-500">Report data available. Full visualization coming in next release.</p>
      </div>
    </div>
  );
}

function GradingStatsReport({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Sessions" value={data?.total_sessions || 0} />
        <StatCard label="Participants" value={data?.total_participants || 0} color="blue" />
        <StatCard label="Passed" value={data?.passed || 0} color="green" />
        <StatCard label="Failed" value={data?.failed || 0} color="red" />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Grading Stats</h3>
        <p className="text-sm text-gray-500">Report data available. Full visualization coming in next release.</p>
      </div>
    </div>
  );
}

function RetentionReport({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Active Members" value={data?.active_members || 0} color="green" />
        <StatCard label="Cancelled" value={data?.cancelled || 0} color="red" />
        <StatCard label="Retention Rate" value={data?.retention_rate != null ? `${data.retention_rate}%` : '-'} color="blue" />
        <StatCard label="Win-Back" value={data?.winback_candidates || 0} color="yellow" />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Retention</h3>
        <p className="text-sm text-gray-500">Report data available. Full visualization coming in next release.</p>
      </div>
    </div>
  );
}

function SocialMediaReport({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Impressions" value={data?.total?.impressions || 0} />
        <StatCard label="Reach" value={data?.total?.reach || 0} color="blue" />
        <StatCard label="Engagement" value={data?.total?.engagement || 0} color="green" />
        <StatCard label="Clicks" value={data?.total?.clicks || 0} color="purple" />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Social Media</h3>
        <p className="text-sm text-gray-500">Report data available. Full visualization coming in next release.</p>
      </div>
    </div>
  );
}

function EODHistoryReport({ data, loading }) {
  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">End of Day Reports</h3>
      {(!data || data.length === 0) ? (
        <p className="text-sm text-gray-400">No EOD reports found for this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Summary</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Leads</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((r, i) => (
                <tr key={r.id || i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900">{r.date || '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">{r.summary || r.notes || '—'}</td>
                  <td className="px-4 py-2 text-sm text-right">{r.leads_count ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-right">{r.revenue != null ? `$${r.revenue}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
          className="bg-red-600 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium"
          style={{ width: `${percentage}%` }}
        >
          {percentage > 10 && `${percentage.toFixed(0)}%`}
        </div>
      </div>
    </div>
  );
}
