import { useState } from 'react';
import api from '../../lib/api';

const AGENT_ICONS = {
  leads: '🎯',
  trials: '👥',
  retention: '🔄',
  tasks: '📋',
  analytics: '📊',
  billing: '💰',
  belt_grading: '🥋',
  stock: '📦',
  staff: '👔',
  messaging: '📞'
};

export default function AgentToggle({ agentName, enabled, description, lastAction, onChange }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isEnabled = enabled;

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      const response = await api.post(`/api/ai/agents/${agentName}/toggle`);
      const newState = response.data.enabled;
      if (onChange) onChange(agentName, newState);
    } catch (error) {
      console.error('Failed to toggle agent:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatLastAction = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 0) return 'Just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-xl">{AGENT_ICONS[agentName] || '🤖'}</span>
        <div>
          <h3 className="font-medium text-gray-900 capitalize">
            {agentName.replace(/_/g, ' ')}
          </h3>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
          {lastAction && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last action: {formatLastAction(lastAction)}
            </p>
          )}
        </div>
      </div>
      <label className={`relative inline-flex items-center cursor-pointer ${isUpdating ? 'opacity-50' : ''}`}>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={handleToggle}
          disabled={isUpdating}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );
}
