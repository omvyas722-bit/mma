const STATUS_COLORS = {
  success: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-blue-100 text-blue-800'
};

function AgentBadge({ name }) {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700'
  ];
  const hash = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const color = colors[hash % colors.length];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {name.replace(/_/g, ' ')}
    </span>
  );
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return 'just now';
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ActivityFeed({ activities, isLoading, emptyMessage }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{emptyMessage || 'No activity yet'}</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="divide-y divide-gray-200">
        {activities.map((activity) => (
          <li key={activity.id} className="py-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AgentBadge name={activity.agent_name} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {activity.summary}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatRelativeTime(activity.created_at)}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[activity.status] || STATUS_COLORS.success}`}
              >
                {activity.status || 'success'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
