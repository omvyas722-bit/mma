import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import { format } from 'date-fns';

const TABS = [
  { key: 'compose', label: 'Compose', icon: '✏️' },
  { key: 'calendar', label: 'Calendar', icon: '📅' },
  { key: 'analytics', label: 'Analytics', icon: '📊' },
  { key: 'platforms', label: 'Platforms', icon: '🔗' },
];

export default function SocialMedia() {
  const [activeTab, setActiveTab] = useState('compose');
  const { success, error } = useNotifications();

  if (activeTab === 'compose') return <ComposeTab key={activeTab} onSwitch={setActiveTab} success={success} error={error} />;
  if (activeTab === 'calendar') return <CalendarTab key={activeTab} success={success} error={error} />;
  if (activeTab === 'analytics') return <AnalyticsTab key={activeTab} />;
  if (activeTab === 'platforms') return <PlatformsTab key={activeTab} success={success} error={error} />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Social Media</h1>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function TabBar({ activeTab, onTabChange }) {
  return (
    <nav className="flex gap-1 border-b border-gray-200" role="tablist">
      {TABS.map(t => (
        <button key={t.key} role="tab" aria-selected={activeTab === t.key} onClick={() => onTabChange(t.key)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >{t.icon} {t.label}</button>
      ))}
    </nav>
  );
}

function ComposeTab({ onSwitch, success, error }) {
  const [platforms, setPlatforms] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleMode, setScheduleMode] = useState('now');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const queryClient = useQueryClient();

  const { data: platformsData } = useQuery({ queryKey: ['social-platforms'], queryFn: () => api.get('/api/social-media/platforms').then(r => r.data?.platforms || []) });
  const { data: templatesData } = useQuery({ queryKey: ['social-templates'], queryFn: () => api.get('/api/social-media/templates').then(r => r.data?.templates || []) });

  const createPost = useMutation({
    mutationFn: (data) => api.post('/api/social-media/posts', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-posts'] }); success('Post created'); reset(); },
    onError: (err) => error(err?.response?.data?.error || 'Failed to create post'),
  });

  const reset = () => { setTitle(''); setContent(''); setPlatforms([]); setScheduledAt(''); setScheduleMode('now'); setSelectedTemplate(''); };

  const handleTemplateSelect = (e) => {
    const val = e.target.value;
    setSelectedTemplate(val);
    if (!val) return;
    const tpl = templatesData?.find(t => t.id === parseInt(val));
    if (tpl) setContent(tpl.content);
  };

  const handleSubmit = () => {
    if (!content.trim()) { error('Content is required'); return; }
    if (platforms.length === 0) { error('Select at least one platform'); return; }
    createPost.mutate({
      platform_ids: JSON.stringify(platforms), title: title.trim() || null, content: content.trim(),
      scheduled_at: scheduleMode === 'schedule' ? scheduledAt : null, status: scheduleMode === 'now' ? 'draft' : 'scheduled', created_by: 1,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compose Post</h1>
      </div>
      <TabBar activeTab="compose" onTabChange={onSwitch} />

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {(platformsData || []).map(p => (
              <button key={p.id} type="button" onClick={() => setPlatforms(prev => prev.includes(p.name) ? prev.filter(x => x !== p.name) : [...prev, p.name])}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${platforms.includes(p.name) ? 'bg-red-50 border-red-300 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >{p.icon || '📱'} {p.display_name}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Template</label>
          <select value={selectedTemplate} onChange={handleTemplateSelect} className="input text-sm w-full max-w-md" aria-label="Content template">
            <option value="">Custom post...</option>
            {(templatesData || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title..." className="input text-sm w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={8} placeholder="Write your post content here... Supports {variable} placeholders from templates."
            className="input text-sm w-full resize-y font-mono" />
          <p className="text-xs text-gray-400 mt-1">{content.length} characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600"><input type="radio" name="schedule" checked={scheduleMode === 'now'} onChange={() => setScheduleMode('now')} className="text-red-600 focus:ring-red-500" /> Save as Draft</label>
            <label className="flex items-center gap-2 text-sm text-gray-600"><input type="radio" name="schedule" checked={scheduleMode === 'schedule'} onChange={() => setScheduleMode('schedule')} className="text-red-600 focus:ring-red-500" /> Schedule</label>
          </div>
          {scheduleMode === 'schedule' && (
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="input text-sm mt-2 max-w-xs" />
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={handleSubmit} disabled={createPost.isPending}
            className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40"
          >{createPost.isPending ? 'Saving...' : scheduleMode === 'now' ? 'Save Draft' : 'Schedule Post'}</button>
          <button type="button" onClick={reset} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Reset</button>
        </div>
      </div>
    </div>
  );
}

function CalendarTab({ success, error }) {
  const [showComposer, setShowComposer] = useState(false);
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['social-posts'],
    queryFn: () => api.get('/api/social-media/posts').then(r => r.data?.posts || []),
  });

  const handleDelete = useMutation({
    mutationFn: (id) => api.delete(`/api/social-media/posts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-posts'] }); success('Post deleted'); },
    onError: (err) => error(err?.response?.data?.error || 'Failed to delete post'),
  });

  const handlePublish = useMutation({
    mutationFn: (id) => api.post(`/api/social-media/posts/${id}/publish`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-posts'] }); success('Post published'); },
    onError: (err) => error(err?.response?.data?.error || 'Failed to publish'),
  });

  const grouped = useMemo(() => {
    const g = {};
    for (const p of posts) {
      const key = p.scheduled_at ? p.scheduled_at.split('T')[0] : 'unscheduled';
      if (!g[key]) g[key] = [];
      g[key].push(p);
    }
    return g;
  }, [posts]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
        <button onClick={() => setShowComposer(!showComposer)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
        >{showComposer ? 'Cancel' : '+ New Post'}</button>
      </div>
      {showComposer && <div className="bg-gray-50 border border-gray-200 rounded-xl p-6"><ComposeTab onSwitch={() => {}} success={success} error={error} /></div>}
      <TabBar activeTab="calendar" onTabChange={() => {}} />
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-gray-400">No posts yet. Create your first post!</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b)).map(([date, dayPosts]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">{date === 'unscheduled' ? 'Unscheduled' : format(new Date(date), 'EEEE, MMM d, yyyy')}</h3>
              <div className="space-y-2">
                {dayPosts.map(post => (
                  <div key={post.id} className={`border rounded-lg p-4 flex items-start justify-between ${post.status === 'published' ? 'bg-green-50 border-green-200' : post.status === 'scheduled' ? 'bg-blue-50 border-blue-200' : post.status === 'failed' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${post.status === 'published' ? 'bg-green-200 text-green-800' : post.status === 'scheduled' ? 'bg-blue-200 text-blue-800' : post.status === 'failed' ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-700'}`}>{post.status}</span>
                        <span className="text-xs text-gray-400">{post.published_at ? format(new Date(post.published_at), 'MMM d, HH:mm') : ''}</span>
                      </div>
                      <p className="text-sm text-gray-900 line-clamp-2">{post.title || post.content.substring(0, 120)}{!post.title && post.content.length > 120 ? '...' : ''}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Platforms: {(JSON.parse(post.platform_ids || '[]')).join(', ') || 'None selected'}</p>
                    </div>
                    <div className="flex gap-1 ml-3 shrink-0">
                      {post.status !== 'published' && <button onClick={() => handlePublish.mutate(post.id)} disabled={handlePublish.isPending} className="p-1.5 text-green-600 hover:text-green-800" title="Publish">▶</button>}
                      {post.status !== 'published' && <button onClick={() => handleDelete.mutate(post.id)} disabled={handleDelete.isPending} className="p-1.5 text-red-500 hover:text-red-700" title="Delete">🗑</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['social-analytics'],
    queryFn: () => api.get('/api/social-media/analytics').then(r => r.data),
  });

  const { data: platformData } = useQuery({
    queryKey: ['social-platforms'],
    queryFn: () => api.get('/api/social-media/platforms').then(r => r.data?.platforms || []),
  });

  const metrics = [
    { key: 'impressions', label: 'Impressions', color: 'text-blue-600' },
    { key: 'reach', label: 'Reach', color: 'text-green-600' },
    { key: 'engagement', label: 'Engagement', color: 'text-purple-600' },
    { key: 'likes', label: 'Likes', color: 'text-red-600' },
    { key: 'comments', label: 'Comments', color: 'text-yellow-600' },
    { key: 'shares', label: 'Shares', color: 'text-indigo-600' },
    { key: 'clicks', label: 'Clicks', color: 'text-teal-600' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      <TabBar activeTab="analytics" onTabChange={() => {}} />
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : !data ? (
        <div className="text-center py-12 text-gray-400">No analytics data available yet.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.slice(0, 4).map(m => (
              <div key={m.key} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-500">{m.label}</p>
                <p className={`text-2xl font-bold ${m.color}`}>{(data?.total?.[m.key] || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metrics.slice(4).map(m => (
              <div key={m.key} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-500">{m.label}</p>
                <p className={`text-2xl font-bold ${m.color}`}>{(data?.total?.[m.key] || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200"><h3 className="text-sm font-semibold text-gray-700">By Platform</h3></div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2.5">Platform</th>
                {metrics.map(m => <th key={m.key} className="px-3 py-2.5">{m.label}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.byPlatform || []).map(row => (
                  <tr key={row.platform} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 capitalize">{(platformData || []).find(p => p.name === row.platform)?.icon || '📱'} {row.platform}</td>
                    {metrics.map(m => <td key={m.key} className="px-3 py-2.5 text-gray-600">{(row[m.key] || 0).toLocaleString()}</td>)}
                  </tr>
                ))}
                {(data?.byPlatform || []).length === 0 && <tr><td colSpan={metrics.length + 1} className="px-4 py-8 text-center text-gray-400">No platform data yet</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function PlatformsTab({ success, error }) {
  const queryClient = useQueryClient();

  const { data: platforms = [], isLoading } = useQuery({
    queryKey: ['social-platforms'],
    queryFn: () => api.get('/api/social-media/platforms').then(r => r.data?.platforms || []),
  });

  const handleConnect = useMutation({
    mutationFn: ({ id, connected }) => connected
      ? api.post(`/api/social-media/platforms/${id}/disconnect`)
      : api.post(`/api/social-media/platforms/${id}/connect`, { access_token: 'pending' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-platforms'] }); success('Platform updated'); },
    onError: (err) => error(err?.response?.data?.error || 'Failed to update platform'),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Platform Connections</h1>
      <TabBar activeTab="platforms" onTabChange={() => {}} />
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {platforms.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.icon || '📱'}</span>
                <div><p className="font-medium text-gray-900">{p.display_name}</p><p className="text-xs text-gray-500">{p.connected ? 'Connected' : 'Not connected'}{p.connected ? ` — Page ID: ${p.page_id || 'N/A'}` : ''}</p></div>
              </div>
              <button onClick={() => handleConnect.mutate({ id: p.id, connected: p.connected })}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium ${p.connected ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-red-600 text-white hover:bg-red-700'}`}
              >{p.connected ? 'Disconnect' : 'Connect'}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
