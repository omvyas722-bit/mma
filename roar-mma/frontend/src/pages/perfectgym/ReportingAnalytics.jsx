import { useState } from 'react';

const KPI_CARDS = [
  { title: 'Active Members', value: '847', change: 12, color: 'blue' },
  { title: 'Monthly Recurring Revenue', value: '$67,432', change: 8, color: 'green' },
  { title: 'Churn Rate', value: '3.2%', change: -0.5, color: 'red' },
  { title: 'Classes Booked This Week', value: '1,284', change: 5, color: 'purple' },
];

const MONTHLY_REVENUE = [
  { month: 'Jan', revenue: 52000 },
  { month: 'Feb', revenue: 54800 },
  { month: 'Mar', revenue: 56100 },
  { month: 'Apr', revenue: 58900 },
  { month: 'May', revenue: 62400 },
  { month: 'Jun', revenue: 67432 },
];

const RECENT_SIGNUPS = [
  { name: 'Liam O\'Brien', plan: 'Unlimited MMA', date: '2026-06-04' },
  { name: 'Sophie Chen', plan: '2x Week', date: '2026-06-03' },
  { name: 'Jack Thompson', plan: 'Unlimited MMA', date: '2026-06-02' },
  { name: 'Mia Rodriguez', plan: 'Corporate Platinum', date: '2026-06-01' },
  { name: 'Ethan Williams', plan: 'Casual', date: '2026-05-30' },
];

const maxRevenue = Math.max(...MONTHLY_REVENUE.map(r => r.revenue));

export default function ReportingAnalytics() {
  const [dateRange, setDateRange] = useState('6m');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporting & Analytics</h1>
          <p className="text-sm text-gray-500">Real-time KPIs, charts, and member insights</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input w-auto" value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="1m">Last Month</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
          </select>
          <button className="btn btn-outline">Export PDF</button>
          <button className="btn btn-outline">Export CSV</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KPI_CARDS.map((kpi, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-5">
            <p className="text-sm font-medium text-gray-500 mb-1">{kpi.title}</p>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <div className={`flex items-center mt-1 text-sm font-medium ${kpi.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <span>{kpi.change >= 0 ? '↑' : '↓'} {Math.abs(kpi.change)}{kpi.title === 'Churn Rate' ? 'pp' : '%'}</span>
              <span className="text-gray-400 ml-1 text-xs">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <div className="flex items-end gap-2" style={{ height: 180 }}>
            {MONTHLY_REVENUE.map((item, i) => {
              const height = (item.revenue / maxRevenue) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500">${(item.revenue / 1000).toFixed(0)}k</span>
                  <div
                    className="w-full bg-red-500 rounded-t hover:bg-red-600 transition-colors cursor-pointer"
                    style={{ height: `${height}%`, minHeight: 8 }}
                    title={`${item.month}: $${item.revenue.toLocaleString()}`}
                  />
                  <span className="text-[10px] text-gray-500">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Sign-ups */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Sign-ups</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Plan</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_SIGNUPS.map((s, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900 font-medium">{s.name}</td>
                  <td className="py-2 text-gray-600">{s.plan}</td>
                  <td className="py-2 text-gray-500 text-xs">{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
