import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { formatDate } from '../lib/formatters';
const READINESS_COLORS = { fight_ready: 'badge-green', ready: 'badge-blue', developing: 'badge-yellow', not_ready: 'badge-gray' };
const READINESS_LABELS = { fight_ready: 'Fight Ready', ready: 'Ready', developing: 'Developing', not_ready: 'Not Ready' };

export default function Coaching() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const { data: allStudents, isLoading, isError, refetch } = useQuery({
    queryKey: ['coaching-summary'],
    queryFn: async () => { const r = await api.get('/api/coaching/ratings'); return r.data; },
  });

  let students = allStudents || [];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    students = students.filter(s =>
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }
  students.sort((a, b) => {
    if (sortBy === 'name') return a.last_name?.localeCompare(b.last_name);
    if (sortBy === 'ratings') return (b.total_ratings || 0) - (a.total_ratings || 0);
    if (sortBy === 'defense') return (b.avg_defense || 0) - (a.avg_defense || 0);
    return 0;
  });

  function RatingCell({ value }) {
    if (!value) return <span className="text-gray-300">-</span>;
    const color = value >= 7 ? 'text-green-600' : value >= 4 ? 'text-yellow-600' : 'text-red-600';
    return <span className={`font-semibold ${color}`}>{Number(value).toFixed(1)}</span>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coaching</h1>
          <p className="text-gray-500 mt-1">Rate students, track progress, and get AI-powered coaching insights</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="Search students..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="input" />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Sort:</span>
            {['name', 'ratings', 'defense'].map(s => (
              <button key={s} type="button" onClick={() => setSortBy(s)}
                className={`px-2 py-1 rounded ${sortBy === s ? 'bg-red-100 text-red-700 font-medium' : 'hover:bg-gray-100'}`}>
                {s === 'name' ? 'Name' : s === 'ratings' ? 'Most Rated' : 'Best Defense'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center m-4" role="alert">
            <p className="text-red-700 text-sm mb-3">Failed to load coaching data</p>
            <button type="button" onClick={refetch} className="text-sm text-red-600 underline hover:no-underline">Try again</button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No students found. Start by rating a student's training session.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Defense</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offense</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Practice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ratings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Rated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map(s => (
                  <tr key={s.id} onClick={() => navigate(`/members/${s.id}`)}
                    className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {(s.first_name || '?')[0]}{(s.last_name || '?')[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                          {s.experience_level && <p className="text-xs text-gray-400">{s.experience_level}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge capitalize ${
                        s.status === 'active' ? 'badge-green' : s.status === 'trial' ? 'badge-yellow' : 'badge-gray'
                      }`}>{s.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><RatingCell value={s.avg_defense} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><RatingCell value={s.avg_stance} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><RatingCell value={s.avg_offense} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center"><RatingCell value={s.avg_practice} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium">{s.total_ratings || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {s.last_rating_date ? formatDate(s.last_rating_date) : '-'}
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
