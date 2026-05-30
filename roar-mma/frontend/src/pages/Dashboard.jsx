// Dashboard page
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import StatsCard, { UsersIcon, DollarIcon, CalendarIcon, TrendingIcon } from '../components/Shared/StatsCard';
import BarChart from '../components/Shared/BarChart';
import LineChart from '../components/Shared/LineChart';

export default function Dashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/api/dashboard');
      return response.data;
    },
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/dashboard');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {};
  const todaysClasses = dashboardData?.todays_classes || [];
  const recentActivity = dashboardData?.recent_activity || [];

  // Prepare chart data
  const memberGrowthData = analyticsData?.member_growth || [];
  const revenueData = analyticsData?.revenue_trend || [];
  const attendanceData = analyticsData?.class_attendance || [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Active Members"
          value={kpis.active_members?.value || 0}
          change={kpis.active_members?.delta || 0}
          icon={<UsersIcon />}
          color="blue"
        />
        <StatsCard
          title="Monthly Revenue"
          value={`$${(kpis.monthly_revenue?.value || 0).toLocaleString()}`}
          change={kpis.monthly_revenue?.delta || 0}
          icon={<DollarIcon />}
          color="green"
        />
        <StatsCard
          title="Today's Classes"
          value={kpis.today_bookings?.value || 0}
          change={kpis.today_bookings?.delta || 0}
          icon={<CalendarIcon />}
          color="purple"
        />
        <StatsCard
          title="New Leads"
          value={kpis.new_leads?.value || 0}
          change={kpis.new_leads?.delta || 0}
          icon={<TrendingIcon />}
          color="yellow"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChart
          data={memberGrowthData}
          title="Member Growth (Last 30 Days)"
          color="blue"
        />
        <LineChart
          data={revenueData}
          title="Revenue Trend (Last 30 Days)"
          color="green"
        />
      </div>

      <div className="mb-8">
        <BarChart
          data={attendanceData}
          title="Class Attendance This Week"
          xLabel="Classes"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Classes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Today's Classes</h2>
          {todaysClasses.length === 0 ? (
            <p className="text-gray-500">No classes scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {todaysClasses.map((classItem) => (
                <ClassCard key={classItem.id} classItem={classItem} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-gray-500">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <ActivityItem key={activity.id || activity.timestamp || activity.description} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClassCard({ classItem }) {
  const fillPercentage = classItem.capacity ? (classItem.booked_count / classItem.capacity) * 100 : 0;
  const fillColor =
    fillPercentage >= 90
      ? 'bg-red-500'
      : fillPercentage >= 80
      ? 'bg-yellow-500'
      : 'bg-green-500';

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-medium text-gray-900">{classItem.name}</p>
          <p className="text-sm text-gray-500">
            {classItem.start_time} • {classItem.coach_name || 'No coach assigned'}
          </p>
        </div>
        <span className="badge badge-blue capitalize">{classItem.location}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`${fillColor} h-2 rounded-full transition-all`}
            style={{ width: `${fillPercentage}%` }}
          ></div>
        </div>
        <span className="text-sm text-gray-600">
          {classItem.booked_count}/{classItem.capacity}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ activity }) {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'member_joined':
        return '👤';
      case 'booking_created':
        return '📅';
      case 'payment_succeeded':
        return '💰';
      default:
        return '📌';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex items-start gap-3">
      <span className="text-2xl">{getActivityIcon(activity.type)}</span>
      <div className="flex-1">
        <p className="text-sm text-gray-900">{activity.description}</p>
        <p className="text-xs text-gray-500">{formatTimestamp(activity.timestamp)}</p>
      </div>
    </div>
  );
}
