import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

function BarChart({ data, color = '#FF3B30', height = 120 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t transition-all"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: color,
              opacity: 0.7 + (d.value / max) * 0.3,
              minHeight: d.value > 0 ? 4 : 0,
            }}
          />
          <span className="text-[8px]" style={{ color: '#8E8E93' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ percentage, size = 100, color = '#FFD60A' }) {
  const r = size * 0.4;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={size * 0.1} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={size * 0.1}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-lg font-bold text-white">{Math.round(percentage)}%</span>
    </div>
  );
}

export default function WeeklyReports() {
  const [period, setPeriod] = useState('week');
  const { data, isLoading } = useQuery({
    queryKey: ['agentic-reports', period],
    queryFn: () => api.get(`/api/agentic/reports?period=${period}`).then(r => r.data),
    refetchInterval: 60000,
  });

  const retentionData = (data?.classRetention || []).slice(0, 8).map(c => ({
    label: c.name?.split(' ').slice(0, 2).join(' ') || c.class_type || 'Class',
    value: Math.round((c.retention_rate || 0) * 100),
  }));

  const revenueData = (data?.revenueTrend || []).slice(-14).map(r => ({
    label: new Date(r.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    value: Math.round(r.revenue || 0),
  }));

  const conversionRate = data?.trialConversions
    ? ((data.trialConversions.converted / Math.max(data.trialConversions.total_trials, 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen" style={{ background: '#0D0F1A' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">📊</span>
              <h1 className="text-2xl font-bold text-white">Weekly Reports</h1>
            </div>
            <p className="text-sm" style={{ color: '#8E8E93' }}>Data Analyst Agent · Gemini 2.5 Pro</p>
          </div>
          <div className="flex gap-2">
            {['week', 'month'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: period === p ? '#FF3B30' : 'rgba(255,255,255,0.06)',
                  color: period === p ? '#fff' : '#8E8E93',
                }}
              >
                {p === 'week' ? 'This Week' : 'Last Month'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: '#FF3B30', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <h3 className="text-sm font-bold text-white mb-4">Retention by Class Type</h3>
                {retentionData.length > 0 ? (
                  <BarChart data={retentionData} color="#FF3B30" height={150} />
                ) : (
                  <p className="text-sm" style={{ color: '#8E8E93' }}>No data available</p>
                )}
              </div>

              <div className="p-6 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <h3 className="text-sm font-bold text-white mb-4">Revenue Trend</h3>
                {revenueData.length > 0 ? (
                  <BarChart data={revenueData} color="#34C759" height={150} />
                ) : (
                  <p className="text-sm" style={{ color: '#8E8E93' }}>No data available</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border text-center" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <h3 className="text-sm font-bold text-white mb-4">Trial to Paid Conversion</h3>
                <DonutChart percentage={conversionRate} size={140} color="#FFD60A" />
                <p className="text-xs mt-3" style={{ color: '#8E8E93' }}>
                  {data?.trialConversions?.converted ?? 0} converted out of {data?.trialConversions?.total_trials ?? 0} trials
                </p>
              </div>

              <div className="p-6 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <h3 className="text-sm font-bold text-white mb-4">Churn Risk Signals</h3>
                {(data?.atRiskMembers || []).length > 0 ? (
                  <div className="space-y-2">
                    {(data.atRiskMembers || []).map((m, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,59,48,0.1)' }}>
                        <div>
                          <p className="text-sm text-white">{m.name}</p>
                          <p className="text-[10px]" style={{ color: '#8E8E93' }}>
                            Last booking: {m.last_booking ? new Date(m.last_booking + 'T00:00:00').toLocaleDateString() : 'Never'}
                          </p>
                        </div>
                        <span className="w-2 h-2 rounded-full" style={{ background: '#FF3B30' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: '#8E8E93' }}>No at-risk members detected</p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-xs" style={{ color: '#8E8E93' }}>
                Insights fed to agents automatically. Data Analyst syncs findings with CMO and Researcher agents.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
