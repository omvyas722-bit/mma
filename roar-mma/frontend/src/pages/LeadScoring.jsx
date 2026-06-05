import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

const SCORE_CLASSES = {
  critical: 'border-l-4 border-red-500 bg-red-50',
  high: 'border-l-4 border-orange-400 bg-orange-50',
  medium: 'border-l-4 border-yellow-400',
  low: 'border-l-4 border-gray-300',
};

function getScoreLevel(score) {
  if (!score || score < 30) return 'low';
  if (score < 50) return 'medium';
  if (score < 70) return 'high';
  return 'critical';
}

export default function LeadScoring() {
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState('score_desc');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['lead-scoring', { minScore, sortBy }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (minScore > 0) params.append('min_score', minScore);
      params.append('sort', sortBy);
      const r = await api.get(`/api/lead-scoring/leads-with-scores?${params}`);
      return r.data?.leads || [];
    },
    retry: 2,
    staleTime: 10000,
  });

  const { data: highPriority = [] } = useQuery({
    queryKey: ['lead-scoring-high'],
    queryFn: async () => { const r = await api.get('/api/lead-scoring/high-priority'); return r.data?.leads || []; },
    retry: 1,
  });

  const scoreSummary = (leads || []).reduce((acc, l) => {
    const level = getScoreLevel(l.score);
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lead Scoring</h1>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-xs text-red-600 font-medium">Critical</p><p className="text-xl font-bold text-red-700">{scoreSummary.critical || 0}</p></div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3"><p className="text-xs text-orange-600 font-medium">High</p><p className="text-xl font-bold text-orange-700">{scoreSummary.high || 0}</p></div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"><p className="text-xs text-yellow-600 font-medium">Medium</p><p className="text-xl font-bold text-yellow-700">{scoreSummary.medium || 0}</p></div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3"><p className="text-xs text-gray-600 font-medium">Low</p><p className="text-xl font-bold text-gray-700">{scoreSummary.low || 0}</p></div>
      </div>

      {highPriority.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6 border-l-4 border-red-500">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">🔥 High Priority — Act Now</h3>
          <div className="space-y-2">
            {highPriority.slice(0, 5).map(l => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">{l.first_name} {l.last_name}</span>
                <span className="text-xs font-bold text-red-600">Score: {l.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Min Score:</label>
            <input type="number" min="0" max="100" value={minScore} onChange={e => setMinScore(parseInt(e.target.value) || 0)} className="input text-xs w-20" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Sort:</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input text-xs">
              <option value="score_desc">Score ↓</option><option value="score_asc">Score ↑</option><option value="name">Name</option><option value="created_desc">Newest</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-lg shadow text-center py-12"><p className="text-gray-500">No leads with scores</p></div>
      ) : (
        <div className="space-y-2">
          {leads.map(l => {
            const level = getScoreLevel(l.score);
            return (
              <div key={l.id} className={`bg-white rounded-lg shadow p-4 ${SCORE_CLASSES[level]}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{l.first_name} {l.last_name}</p>
                    <p className="text-xs text-gray-500">{l.email} · {l.phone || '—'} · Stage: {l.stage || 'new'}</p>
                    {l.source && <p className="text-xs text-gray-400">Source: {l.source}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${level === 'critical' ? 'text-red-600' : level === 'high' ? 'text-orange-600' : level === 'medium' ? 'text-yellow-600' : 'text-gray-500'}`}>{l.score}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{level}</p>
                  </div>
                </div>
                {l.last_interaction && <p className="text-xs text-gray-400 mt-1">Last interaction: {new Date(l.last_interaction).toLocaleDateString()}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
