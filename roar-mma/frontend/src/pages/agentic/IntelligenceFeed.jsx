import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const CATEGORY_COLORS = {
  Competitor: { bg: '#FF3B3020', text: '#FF3B30', border: '#FF3B3040' },
  Trend: { bg: '#FFD60A20', text: '#FFD60A', border: '#FFD60A40' },
  Opportunity: { bg: '#34C75920', text: '#34C759', border: '#34C75940' },
};

export default function IntelligenceFeed() {
  const [activeTab, setActiveTab] = useState('All');
  const { data, isLoading } = useQuery({
    queryKey: ['agentic-researcher'],
    queryFn: () => api.get('/api/agentic/researcher').then(r => r.data),
    refetchInterval: 60000,
  });

  const filteredItems = (data?.items || []).filter(
    item => activeTab === 'All' || item.category === activeTab
  );

  return (
    <div className="min-h-screen" style={{ background: '#0D0F1A' }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🔍</span>
              <h1 className="text-2xl font-bold text-white">Intelligence Feed</h1>
            </div>
            <p className="text-sm" style={{ color: '#8E8E93' }}>Researcher Agent · Gemini 2.5 Pro</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#8E8E93' }}>Items collected</p>
            <p className="text-lg font-bold text-white">{data?.totalIntelItems ?? 0}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
          {(data?.categories || ['All']).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap"
              style={{
                background: activeTab === cat ? '#FF3B30' : 'rgba(255,255,255,0.06)',
                color: activeTab === cat ? '#fff' : '#8E8E93',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: data?.agentStatus?.status === 'running' ? '#34C759' : '#FFD60A' }} />
          <span className="text-xs" style={{ color: '#8E8E93' }}>
            {data?.agentStatus?.status === 'running' ? 'Scanning' : 'Waiting'} · Last updated: {data?.lastUpdated ? new Date(data.lastUpdated + 'Z').toLocaleTimeString() : '—'}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: '#FF3B30', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => {
              const colors = CATEGORY_COLORS[item.category] || { bg: 'rgba(255,255,255,0.04)', text: '#8E8E93', border: 'rgba(255,255,255,0.08)' };
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-xl border transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                          {item.category}
                        </span>
                        <span className="text-[10px]" style={{ color: '#8E8E93' }}>{item.source}</span>
                        {item.fedToCmo && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#FFD60A20', color: '#FFD60A' }}>
                            Fed to CMO
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white leading-relaxed">{item.summary}</p>
                    </div>
                    <span className="text-[10px] flex-shrink-0" style={{ color: '#8E8E93' }}>
                      {new Date(item.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: '#8E8E93' }}>No intelligence items found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
