import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useWebSocket } from '../contexts/WebSocketContext';

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => { const r = await api.get('/api/dashboard'); return r.data; },
    refetchInterval: 30000,
    retry: 2,
    staleTime: 10000,
  });
}

function useDashboardAnalytics() {
  return useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => { const r = await api.get('/api/analytics/dashboard'); return r.data; },
    retry: 1,
    staleTime: 60000,
  });
}

function useAiStatus() {
  return useQuery({
    queryKey: ['ai-status-pill'],
    queryFn: async () => { const r = await api.get('/api/ai/status'); return r.data; },
    refetchInterval: 30000,
    retry: 1,
  });
}

function useSparklines() {
  return useQuery({
    queryKey: ['dashboard-sparklines'],
    queryFn: async () => { const r = await api.get('/api/dashboard/sparklines'); return r.data?.sparklines || []; },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: d, isLoading, isError, error: dashError, refetch } = useDashboard();
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();
  const { data: aiStatus } = useAiStatus();
  const { data: sparklines = [] } = useSparklines();
  useWebSocket();

  const getSparkline = (key) => { const s = sparklines.find(sp => sp.metric_key === key); return s ? JSON.parse(s.data || '[]') : []; };

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      {isError ? (
        <ErrorState message={dashError?.message || 'Failed to load dashboard data'} onRetry={refetch} />
      ) : isLoading ? (
        <LoadingState />
      ) : (
        <DashboardContent
          data={d}
          analytics={analytics}
          analyticsLoading={analyticsLoading}
          aiStatus={aiStatus}
          sparklines={{ activeMembers: getSparkline('new_members'), revenue: getSparkline('revenue'), attendance: getSparkline('attendance'), leads: getSparkline('leads') }}
          navigate={navigate}
        />
      )}
    </div>
  );
}

function DashboardContent({ data, analytics, analyticsLoading, aiStatus, sparklines = {}, navigate }) {
  const kpis = data?.kpis || {};
  const todaysClasses = data?.todays_classes || [];
  const recentActivity = data?.recent_activity || [];
  const failedPayments = data?.failed_payments || { count: 0, total: 0 };
  const memberGrowthData = !analyticsLoading ? analytics?.member_growth || [] : [];
  const revenueData = !analyticsLoading ? analytics?.revenue_trend || [] : [];
  const attendanceData = !analyticsLoading ? analytics?.class_attendance || [] : [];

  const classesByLocation = todaysClasses.reduce((acc, c) => {
    const loc = c.location || 'unknown';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(c);
    return acc;
  }, {});

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <KpiCard title="Active Members" value={kpis.active_members?.value ?? '—'} change={kpis.active_members?.delta} sparkline={sparklines.activeMembers} color="#22c55e" onClick={() => navigate('/members')} loading={false} />
        <KpiCard title="Monthly Revenue" value={kpis.monthly_revenue?.value != null ? `$${Number(kpis.monthly_revenue.value).toLocaleString()}` : '—'} change={kpis.monthly_revenue?.delta} sparkline={sparklines.revenue} color="#dc2626" onClick={() => navigate('/billing')} loading={false} />
        <KpiCard title="Open Leads" value={kpis.open_leads?.value ?? '—'} onClick={() => navigate('/leads')} loading={false} />
        <KpiCard title="Class Fill %" value={kpis.class_fill?.value ?? '—'} onClick={() => navigate('/classes')} loading={false} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard title="New This Week" value={kpis.new_leads?.value ?? '—'} change={kpis.new_leads?.delta} sparkline={sparklines.leads} color="#f59e0b" onClick={() => navigate('/leads')} loading={false} />
        <KpiCard title="Active Trials" value={kpis.trial_members?.value ?? '—'} change={kpis.trial_members?.delta} onClick={() => navigate('/members?status=trial')} loading={false} />
        <KpiCard title="Today's Bookings" value={kpis.today_bookings?.value ?? '—'} change={kpis.today_bookings?.delta} sparkline={sparklines.attendance} color="#3b82f6" onClick={() => navigate('/classes')} loading={false} />
        <KpiCard title="Hot Leads" value={kpis.hot_leads?.value ?? '—'} color="#ef4444" onClick={() => navigate('/leads?interest=hot')} loading={false} />
      </div>

      {/* Charts + AI Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Member Growth (30d)" loading={analyticsLoading}>
              <SimpleBarChart data={memberGrowthData} />
            </ChartCard>
            <ChartCard title="Revenue Trend (30d)" loading={analyticsLoading}>
              <SimpleBarChart data={revenueData} color="green" />
            </ChartCard>
          </div>
          <ChartCard title="Class Attendance This Week" loading={analyticsLoading}>
            <SimpleBarChart data={attendanceData} color="blue" />
          </ChartCard>
        </div>

        {/* AI Agent Status Panel */}
        <AiStatusPanel aiStatus={aiStatus} pendingApproval={data?.ai_pending_approval || 0} navigate={navigate} />
      </div>

      {/* Failed Payments Alert + Goal Tracker + MIDAS + EOD Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-4">
          {failedPayments.count > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5" aria-hidden="true">⚠</span>
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Failed Payments</h3>
                  <p className="text-sm text-red-700 mt-1">{failedPayments.count} member{failedPayments.count !== 1 ? 's' : ''} · ${(failedPayments.total || 0).toFixed(2)} at risk</p>
                  <button type="button" onClick={() => navigate('/billing?status=failed')} className="mt-2 text-xs font-medium text-red-700 underline hover:no-underline">Resolve →</button>
                </div>
              </div>
            </div>
          )}
          {data?.midas_chase && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5" aria-hidden="true">🤖</span>
                <div>
                  <h3 className="text-sm font-semibold text-indigo-800">MIDAS Chase</h3>
                  <p className="text-sm text-indigo-700 mt-1">{data.midas_chase.description}</p>
                  <p className="text-[10px] text-indigo-500 mt-0.5">{new Date(data.midas_chase.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          {data?.expiring_certs?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5" aria-hidden="true">📋</span>
                <div>
                  <h3 className="text-sm font-semibold text-yellow-800">Certifications Expiring Soon</h3>
                  <div className="text-xs text-yellow-700 mt-1 space-y-0.5">
                    {data.expiring_certs.slice(0, 4).map(c => (
                      <p key={c.id}>{c.first_name} {c.last_name} — {c.cert_name} (expires {new Date(c.expiry_date).toLocaleDateString()})</p>
                    ))}
                    {data.expiring_certs.length > 4 && <p className="text-yellow-600">+{data.expiring_certs.length - 4} more</p>}
                  </div>
                  <button type="button" onClick={() => navigate('/staff')} className="mt-2 text-xs font-medium text-yellow-700 underline hover:no-underline">View Staff →</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Monthly Membership Goal</h2>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-3xl font-bold text-gray-900">{data?.goal_progress?.current || 0}</span>
            <span className="text-sm text-gray-500 mb-1">/ {data?.goal_progress?.target || 30}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2" role="progressbar" aria-valuenow={data?.goal_progress?.current || 0} aria-valuemin={0} aria-valuemax={data?.goal_progress?.target || 30}>
            <div className="bg-red-600 h-2.5 rounded-full transition-all" style={{ width: `${Math.min(100, ((data?.goal_progress?.current || 0) / (data?.goal_progress?.target || 30)) * 100)}%` }}></div>
          </div>
          {data?.goal_progress?.conversion_rate != null && (
            <p className="text-xs text-gray-500">{data.goal_progress.conversion_rate}% trial→paid conversion</p>
          )}
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
            <div><span className="block text-lg font-bold text-gray-900">{data?.goal_sub_metrics?.trials ?? 0}</span><span className="text-gray-500">Trials</span></div>
            <div><span className="block text-lg font-bold text-gray-900">{data?.goal_sub_metrics?.conversion_rate ?? 0}%</span><span className="text-gray-500">Conversion</span></div>
            <div><span className="block text-lg font-bold text-gray-900">{data?.goal_sub_metrics?.referrals ?? 0}</span><span className="text-gray-500">Referrals</span></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">End-of-Day Preview</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Classes run</dt><dd className="font-medium">{data?.eod_preview?.classes_run || 0}/{data?.eod_preview?.classes_total || 0}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Revenue today</dt><dd className="font-medium">${(data?.eod_preview?.revenue_today || 0).toFixed(0)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">New members</dt><dd className="font-medium">{data?.eod_preview?.new_members || 0}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Leads contacted</dt><dd className="font-medium">{data?.eod_preview?.leads_contacted || 0}</dd></div>
          </dl>
          <button type="button" onClick={() => navigate('/reports')} className="mt-3 text-xs text-red-600 hover:underline">Preview Full Report →</button>
        </div>
      </div>

      {/* Revenue Forecast */}
      <RevenueForecastCard />

      {/* Today's Classes + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-lg shadow p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Today's Classes</h2>
          {Object.keys(classesByLocation).length === 0 ? (
            <EmptyState message="No classes scheduled today" />
          ) : (
            <div className="space-y-4">
              {Object.entries(classesByLocation).map(([loc, classes]) => (
                <div key={loc}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{loc.replace('_', ' ')}</p>
                  <div className="space-y-2">
                    {classes.slice(0, 4).map(c => <ClassCard key={c.id} item={c} onClick={() => navigate(`/classes?instance=${c.id}`)} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={() => navigate('/classes')} className="mt-3 text-xs text-red-600 hover:underline">View Full Timetable →</button>
        </section>

        <section className="bg-white rounded-lg shadow p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <EmptyState message="No recent activity" />
          ) : (
            <ul className="space-y-2" role="list">
              {recentActivity.slice(0, 8).map((a, i) => <ActivityItem key={a.id || i} activity={a} />)}
            </ul>
          )}
          <button type="button" onClick={() => navigate('/reports')} className="mt-3 text-xs text-red-600 hover:underline">View All Activity →</button>
        </section>
      </div>
    </div>
  );
}

function Sparkline({ data = [], color = '#dc2626' }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100; const h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return <svg className="w-full h-7 mt-1" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} vectorEffect="non-scaling-stroke" /></svg>;
}

function KpiCard({ title, value, change, onClick, loading, sparkline, color }) {
  if (loading) return <div className="bg-white rounded-lg shadow p-4 animate-pulse"><div className="h-3 bg-gray-200 rounded w-20 mb-2"></div><div className="h-6 bg-gray-200 rounded w-16"></div></div>;
  const changeNum = Number(change) || 0;
  return (
    <button type="button" onClick={onClick} className="bg-white rounded-lg shadow p-4 text-left hover:shadow-md transition-shadow w-full group" aria-label={`${title}: ${value}`}>
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Sparkline data={sparkline} color={color} />
      </div>
      {change != null && <p className={`text-xs mt-0.5 ${changeNum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {changeNum >= 0 ? '↑' : '↓'} {Math.abs(changeNum)}%
      </p>}
    </button>
  );
}

function AiStatusPanel({ aiStatus, pendingApproval, navigate }) {
  const agents = [
    { name: 'ZEUS', role: 'Orchestrator', color: 'bg-red-500', status: aiStatus?.running ? 'RUN' : 'OFF', detail: null },
    { name: 'MIDAS', role: 'Billing', color: 'bg-green-500', status: 'RUN', detail: aiStatus?.actionsToday > 0 ? `${aiStatus.actionsToday} tasks` : 'Idle' },
    { name: 'HERMES', role: 'Comms', color: 'bg-blue-500', status: 'RUN', detail: 'Idle' },
    { name: 'ORACLE', role: 'Reports', color: 'bg-yellow-500', status: 'IDLE', detail: 'EOD pending' },
    { name: 'HEALER', role: 'Monitor', color: 'bg-green-500', status: 'RUN', detail: null },
  ];
  const statusColors = { RUN: 'text-green-600', IDLE: 'text-yellow-600', OFF: 'text-red-600' };

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">AI Agent Status</h2>
        <div className="flex items-center gap-2">
          {pendingApproval > 0 && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">{pendingApproval} pending</span>}
          <button type="button" onClick={() => navigate('/ai-dashboard')} className="text-xs text-red-600 hover:underline">Open Mission Control →</button>
        </div>
      </div>
      <ul className="space-y-3" role="list">
        {agents.map(a => (
          <li key={a.name} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${a.color}`} aria-hidden="true"></span>
              <div>
                <p className="text-sm font-medium text-gray-900">{a.name}</p>
                <p className="text-[10px] text-gray-500">{a.role}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-xs font-medium ${statusColors[a.status] || 'text-gray-500'}`}>{a.status}</span>
              {a.detail && <p className="text-[10px] text-gray-400">{a.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
      {pendingApproval > 0 && (
        <button type="button" onClick={() => navigate('/ai-dashboard')}
          className="mt-3 w-full py-2 text-xs font-medium bg-orange-50 text-orange-700 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
        >{pendingApproval} pending approval ⚠</button>
      )}
    </div>
  );
}

function ClassCard({ item, onClick }) {
  const fillPct = item.capacity ? Math.min(100, (item.booked_count / item.capacity) * 100) : 0;
  const fillColor = fillPct >= 90 ? 'bg-red-500' : fillPct >= 80 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <button type="button" onClick={onClick} className="w-full text-left border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-sm font-medium text-gray-900">{item.name}</p>
        <time className="text-[10px] text-gray-500">{item.start_time}</time>
      </div>
      {item.coach_name && <p className="text-xs text-gray-500 mb-1.5">{item.coach_name}</p>}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-1.5" role="progressbar" aria-valuenow={item.booked_count} aria-valuemin={0} aria-valuemax={item.capacity}>
          <div className={`${fillColor} h-1.5 rounded-full`} style={{ width: `${fillPct}%` }}></div>
        </div>
        <span className="text-xs text-gray-600">{item.booked_count}/{item.capacity}</span>
      </div>
    </button>
  );
}

function ActivityItem({ activity }) {
  const fmt = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };
  return (
    <li className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-base mt-0.5" aria-hidden="true">📌</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{activity.description}</p>
        <p className="text-[10px] text-gray-400">{fmt(activity.timestamp)}</p>
      </div>
    </li>
  );
}

function ChartCard({ title, children, loading }) {
  if (loading) return <div className="bg-white rounded-lg shadow p-5 animate-pulse"><div className="h-4 bg-gray-200 rounded w-40 mb-4"></div><div className="h-32 bg-gray-100 rounded"></div></div>;
  return <div className="bg-white rounded-lg shadow p-5"><h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>{children}</div>;
}

function SimpleBarChart({ data, color = 'red' }) {
  if (!data || data.length === 0) return <EmptyState message="No data" />;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const colorMap = { red: 'bg-red-500', green: 'bg-green-500', blue: 'bg-blue-500', yellow: 'bg-yellow-500' };
  return (
    <div className="flex items-end gap-2 h-32" role="img" aria-label="Bar chart">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100%' }}>
            <div className={`absolute bottom-0 w-full ${colorMap[color] || 'bg-red-500'} rounded-t transition-all`} style={{ height: `${(d.value / maxVal) * 100}%` }}></div>
          </div>
          <span className="text-[8px] text-gray-400 truncate w-full text-center">{d.label || ''}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return <p className="text-sm text-gray-500 text-center py-6">{message}</p>;
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
      <p className="text-red-700 text-sm mb-3">{message}</p>
      <button type="button" onClick={onRetry} className="text-sm text-red-600 underline hover:no-underline">Try again</button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard" role="status">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse"><div className="h-3 bg-gray-200 rounded w-20 mb-2"></div><div className="h-6 bg-gray-200 rounded w-16"></div></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => <div key={i} className="bg-white rounded-lg shadow p-5 animate-pulse"><div className="h-4 bg-gray-200 rounded w-40 mb-4"></div><div className="h-32 bg-gray-100 rounded"></div></div>)}
          </div>
          <div className="bg-white rounded-lg shadow p-5 animate-pulse"><div className="h-4 bg-gray-200 rounded w-48 mb-4"></div><div className="h-32 bg-gray-100 rounded"></div></div>
        </div>
        <div className="bg-white rounded-lg shadow p-5 animate-pulse"><div className="h-4 bg-gray-200 rounded w-32 mb-4"></div><div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded"></div>)}</div></div>
      </div>
    </div>
  );
}

function RevenueForecastCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-forecast'],
    queryFn: () => api.get('/api/dashboard/revenue-forecast').then(r => r.data),
    staleTime: 60000,
  });
  if (isLoading) return <div className="bg-white rounded-lg shadow p-5 animate-pulse mb-6"><div className="h-4 bg-gray-200 rounded w-40 mb-4"></div><div className="flex gap-8">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded w-24"></div>)}</div></div>;
  if (!data) return null;
  return (
    <div className="bg-white rounded-lg shadow p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Revenue Forecast</h2>
        <span className="text-xs text-gray-400">Based on 90d trend</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div><p className="text-xs text-gray-500">Daily Avg</p><p className="text-lg font-bold text-gray-900">${data.currentDailyAvg?.toFixed(0) || 0}</p></div>
        <div><p className="text-xs text-gray-500">Monthly Projection</p><p className="text-lg font-bold text-gray-900">${data.monthlyProjection?.toLocaleString() || 0}</p></div>
        <div><p className="text-xs text-gray-500">Next Month Est.</p><p className="text-lg font-bold text-green-600">${data.projectedNextMonth?.toLocaleString() || 0}</p></div>
        <div><p className="text-xs text-gray-500">Churn Rate (30d)</p><p className="text-lg font-bold text-red-600">{data.churnRate || 0}%</p></div>
      </div>
      {data.forecast?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-gray-500 uppercase"><th className="pb-1.5 pr-4">Month</th><th className="pb-1.5 pr-4">Projected Revenue</th><th className="pb-1.5">Projected Members</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.forecast.map(f => (
                <tr key={f.month} className="text-gray-700"><td className="py-1.5 pr-4 font-medium">{f.month}</td><td className="py-1.5 pr-4">${f.projectedRevenue?.toLocaleString()}</td><td className="py-1.5">{f.projectedMembers}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
