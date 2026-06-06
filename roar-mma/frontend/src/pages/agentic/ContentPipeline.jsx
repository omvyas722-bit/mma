import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const PLATFORM_ICONS = { TikTok: '🎵', Instagram: '📸', 'Facebook Ad': '👍' };
const TYPE_BADGES = {
  'Reel Script': { bg: '#FF3B3020', text: '#FF3B30' },
  'Post Caption': { bg: '#FFD60A20', text: '#FFD60A' },
  'Ad Copy': { bg: '#34C75920', text: '#34C759' },
};

export default function ContentPipeline() {
  const [approved, setApproved] = useState(new Set());
  const { data, isLoading } = useQuery({
    queryKey: ['agentic-cmo'],
    queryFn: () => api.get('/api/agentic/cmo').then(r => r.data),
    refetchInterval: 60000,
  });

  const handleApprove = (id) => {
    setApproved(prev => new Set([...prev, id]));
  };

  const handleRegen = (id) => {
    setApproved(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen" style={{ background: '#0D0F1A' }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">📢</span>
              <h1 className="text-2xl font-bold text-white">Today's Content</h1>
            </div>
            <p className="text-sm" style={{ color: '#8E8E93' }}>CMO Agent · Claude Sonnet 4</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#8E8E93' }}>Today's date</p>
            <p className="text-sm font-bold text-white">
              {data?.date ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: '#34C759' }} />
            <span className="text-xs" style={{ color: '#8E8E93' }}>
              Last run: {data?.lastRunTime ? new Date(data.lastRunTime + 'Z').toLocaleTimeString() : '—'}
            </span>
          </div>
          <span className="text-xs" style={{ color: '#8E8E93' }}>·</span>
          <span className="text-xs" style={{ color: '#8E8E93' }}>{data?.agentStatus?.contentCreatedToday ?? 0} pieces created today</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: '#FF3B30', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="space-y-6">
            {(data?.items || []).map(item => {
              const isApproved = approved.has(item.id);
              const typeStyle = TYPE_BADGES[item.type] || { bg: 'rgba(255,255,255,0.06)', text: '#8E8E93' };
              return (
                <div
                  key={item.id}
                  className="p-6 rounded-2xl border transition-all"
                  style={{
                    background: isApproved ? 'rgba(52,199,89,0.06)' : 'rgba(255,255,255,0.04)',
                    borderColor: isApproved ? 'rgba(52,199,89,0.25)' : 'rgba(255,255,255,0.08)',
                    opacity: isApproved ? 0.7 : 1,
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{PLATFORM_ICONS[item.platform] || '📄'}</span>
                      <h3 className="text-white font-bold">{item.title}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: typeStyle.bg, color: typeStyle.text }}>
                        {item.type}
                      </span>
                    </div>
                    <span className="text-[10px]" style={{ color: '#8E8E93' }}>{item.platform}</span>
                  </div>

                  <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <pre className="text-sm text-white whitespace-pre-wrap font-sans leading-relaxed">{item.body}</pre>
                  </div>

                  {item.notes && (
                    <p className="text-xs mb-4" style={{ color: '#8E8E93' }}>
                      <span style={{ color: '#FFD60A' }}>Notes:</span> {item.notes}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={isApproved}
                      className="px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                      style={{
                        background: isApproved ? '#34C759' : '#FF3B30',
                        color: '#fff',
                      }}
                    >
                      {isApproved ? '✓ Approved & Posted' : 'Approve & Post'}
                    </button>
                    <button
                      onClick={() => handleRegen(item.id)}
                      className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: 'rgba(255,255,255,0.08)', color: '#8E8E93' }}
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
