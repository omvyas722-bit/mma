// Trial Conversion Dashboard - Analytics for trial-to-member conversion
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { PageLoader } from '../components/Shared/Spinner';

export default function TrialConversionDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['trial-conversion-stats'],
    queryFn: async () => {
      const response = await api.get('/api/trial-analytics/conversion-stats');
      return response.data;
    },
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['trial-conversion-trends'],
    queryFn: async () => {
      const response = await api.get('/api/trial-analytics/conversion-trends?days=30');
      return response.data;
    },
  });

  if (statsLoading || trendsLoading) {
    return <PageLoader />;
  }

  const overall = stats?.overall || {};
  const needsFollowUp = stats?.needs_follow_up || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Trial Conversion Analytics</h1>
        <p className="text-gray-600 mt-2">Track trial session performance and conversion rates</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          label="Trials Completed"
          value={overall.trials_completed || 0}
          color="blue"
        />
        <StatCard
          label="Converted to Members"
          value={overall.converted || 0}
          color="green"
        />
        <StatCard
          label="Conversion Rate"
          value={`${overall.conversion_rate || 0}%`}
          color={overall.conversion_rate >= 50 ? 'green' : overall.conversion_rate >= 30 ? 'yellow' : 'red'}
        />
      </div>

      {/* Conversion by Interest Level */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Conversion by Interest Level</h2>
        <div className="space-y-3">
          {stats?.by_interest_level?.map((item) => (
            <div key={item.trial_interest_level} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  item.trial_interest_level === 'hot' ? 'bg-red-100 text-red-800' :
                  item.trial_interest_level === 'warm' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {item.trial_interest_level === 'hot' ? '🔥 Hot' :
                   item.trial_interest_level === 'warm' ? '👍 Warm' :
                   '❄️ Cold'}
                </span>
                <span className="text-gray-600">{item.total} trials</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-green-600 font-semibold">{item.converted} converted</span>
                <span className="text-lg font-bold">{item.conversion_rate}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion by Experience Rating */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Conversion by Experience Rating</h2>
        <div className="space-y-3">
          {stats?.by_experience_rating?.map((item, idx) => (
            <div key={item.trial_experience_rating + '-' + idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {item.trial_experience_rating === 1 ? '😞' :
                   item.trial_experience_rating === 2 ? '😐' :
                   item.trial_experience_rating === 3 ? '🙂' :
                   item.trial_experience_rating === 4 ? '😊' : '🤩'}
                </span>
                <span className="text-gray-600">{item.total} trials</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-green-600 font-semibold">{item.converted} converted</span>
                <span className="text-lg font-bold">{item.conversion_rate}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion by Class Type */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Conversion by Class Type</h2>
        <div className="space-y-3">
          {stats?.by_class_type?.map((item) => (
            <div key={item.trial_class_type} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 uppercase">
                  {item.trial_class_type}
                </span>
                <span className="text-gray-600">{item.total} trials</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-green-600 font-semibold">{item.converted} converted</span>
                <span className="text-lg font-bold">{item.conversion_rate}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Needs Follow-up */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Trials Needing Follow-up</h2>
        {needsFollowUp.length === 0 ? (
          <p className="text-gray-500 text-center py-8">All trials have been followed up</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trial Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Ago</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {needsFollowUp.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {lead.first_name} {lead.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.trial_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        lead.trial_interest_level === 'hot' ? 'bg-red-100 text-red-800' :
                        lead.trial_interest_level === 'warm' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {lead.trial_interest_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {lead.trial_experience_rating}/5
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.floor(lead.days_since_trial)} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color] || 'text-gray-600'}`}>{value}</p>
    </div>
  );
}
