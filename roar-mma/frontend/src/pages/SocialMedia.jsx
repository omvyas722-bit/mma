import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import { format } from 'date-fns';

const TABS = [
  { key: 'compose', label: 'Compose', icon: '✏️' },
  { key: 'calendar', label: 'Calendar', icon: '📅' },
  { key: 'campaigns', label: 'Campaigns', icon: '📣' },
  { key: 'analytics', label: 'Analytics', icon: '📊' },
  { key: 'platforms', label: 'Platforms', icon: '🔗' },
];

const TAB_COMPONENTS = { compose: ComposeTab, calendar: CalendarTab, campaigns: CampaignsTab, analytics: AnalyticsTab, platforms: PlatformsTab };

export default function SocialMedia() {
  const [activeTab, setActiveTab] = useState('compose');
  const { success, error } = useNotifications();
  const TabComponent = TAB_COMPONENTS[activeTab];

  const { data: platforms = [] } = useQuery({
    queryKey: ['social-platforms'],
    queryFn: () => api.get('/api/social-media/platforms').then(r => r.data?.platforms || []),
    staleTime: 300000,
  });
  const connectedCount = platforms.filter(p => p.connected).length;
  const totalCount = platforms.length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Social Media</h1>
        <div className="flex items-center gap-3">
          {platforms.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5">
              <span className="font-medium">Platforms:</span>
              {platforms.map(p => (
                <span key={p.id} className={`flex items-center gap-1 ${p.connected ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${p.connected ? 'bg-green-500' : 'bg-gray-300'}`} />
                  {p.icon || (p.platform_type === 'facebook' ? '📘' : p.platform_type === 'instagram' ? '📷' : p.platform_type === 'tiktok' ? '🎵' : '📱')}
                  {p.connected ? '' : ' (disconnected)'}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      {TabComponent && <TabComponent key={activeTab} onSwitch={setActiveTab} success={success} error={error} />}
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
  const [postType, setPostType] = useState('image');
  const [showHashtagModal, setShowHashtagModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: platformsData } = useQuery({ queryKey: ['social-platforms'], queryFn: () => api.get('/api/social-media/platforms').then(r => r.data?.platforms || []), staleTime: 300000 });
  const { data: templatesData } = useQuery({ queryKey: ['social-templates'], queryFn: () => api.get('/api/social-media/templates').then(r => r.data?.templates || []), staleTime: 300000 });

  const createPost = useMutation({
    mutationFn: (data) => api.post('/api/social-media/posts', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-posts'] }); success('Post created'); reset(); },
    onError: (err) => error(err?.response?.data?.error || 'Failed to create post'),
  });

  const reset = () => { setTitle(''); setContent(''); setPlatforms([]); setScheduledAt(''); setScheduleMode('now'); setSelectedTemplate(''); setPostType('image'); };

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
    const statusMap = { now: 'draft', schedule: 'scheduled', publish: 'published' };
    createPost.mutate({
      platform_ids: JSON.stringify(platforms), title: title.trim() || null, content: content.trim(),
      scheduled_at: scheduleMode === 'schedule' ? scheduledAt : null, status: statusMap[scheduleMode] || 'draft', created_by: 1,
      post_type: postType,
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Post Type</label>
          <div className="flex gap-2">
            {[{v:'reel',l:'📸 Reel'},{v:'image',l:'🖼 Image'},{v:'video',l:'📹 Video'},{v:'story',l:'📝 Story'}].map(t => (
              <button key={t.v} type="button" onClick={() => setPostType(t.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${postType === t.v ? 'bg-red-50 border-red-300 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >{t.l}</button>
            ))}
          </div>
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
            <label className="flex items-center gap-2 text-sm text-gray-600"><input type="radio" name="schedule" checked={scheduleMode === 'publish'} onChange={() => setScheduleMode('publish')} className="text-red-600 focus:ring-red-500" /> Publish Now</label>
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
          >{createPost.isPending ? 'Saving...' : scheduleMode === 'publish' ? 'Publish Now' : scheduleMode === 'now' ? 'Save Draft' : 'Schedule Post'}</button>
          <button type="button" onClick={reset} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Reset</button>
        </div>
      </div>

      {/* Saved Hashtag Groups */}
      <HashtagGroupsPanel content={content} setContent={setContent} showModal={showHashtagModal} setShowModal={setShowHashtagModal} success={success} error={error} />
    </div>
  );
}

function HashtagGroupsPanel({ content, setContent, showModal, setShowModal, success, error }) {
  const queryClient = useQueryClient();
  const { data: groups = [] } = useQuery({ queryKey: ['hashtag-groups'], queryFn: () => api.get('/api/social-media/hashtag-groups').then(r => r.data?.groups || []), staleTime: 30000 });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', hashtags: '' });

  const delGroup = useMutation({
    mutationFn: (id) => api.delete(`/api/social-media/hashtag-groups/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hashtag-groups'] }); success('Deleted'); },
    onError: (err) => error(err?.response?.data?.error || 'Delete failed'),
  });

  const saveGroup = useMutation({
    mutationFn: (data) => editing ? api.put(`/api/social-media/hashtag-groups/${editing}`, data) : api.post('/api/social-media/hashtag-groups', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hashtag-groups'] }); success(editing ? 'Updated' : 'Created'); setEditing(null); setForm({name:'',hashtags:''}); },
    onError: (err) => error(err?.response?.data?.error || 'Save failed'),
  });

  const insertHashtags = (g) => {
    const tags = typeof g.hashtags === 'string' ? JSON.parse(g.hashtags) : g.hashtags;
    if (Array.isArray(tags)) setContent(prev => prev + (prev ? '\n\n' : '') + tags.join(' '));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Saved Hashtag Groups</h3>
        <button onClick={() => setShowModal(true)} className="text-xs text-red-600 hover:underline">Manage Groups</button>
      </div>
      {groups.length === 0 ? (
        <p className="text-xs text-gray-400">No hashtag groups saved.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {groups.map(g => (
            <button key={g.id} onClick={() => insertHashtags(g)}
              className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium hover:bg-purple-100"
            >{g.name}</button>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Manage Hashtag Groups</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <input type="text" placeholder="Group name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="input text-sm w-full" />
              <textarea placeholder="Hashtags (space separated, e.g. #mma #bjj #fitness)" value={form.hashtags} onChange={e => setForm(f => ({...f, hashtags: e.target.value}))} className="input text-sm w-full" rows={2} />
              <div className="flex gap-2">
                <button onClick={() => { const tags = form.hashtags.trim().split(/\s+/).filter(Boolean); saveGroup.mutate({ name: form.name, hashtags: tags }); }}
                  disabled={!form.name.trim() || saveGroup.isPending} className="btn-primary text-xs">{saveGroup.isPending ? 'Saving...' : editing ? 'Update' : 'Save Group'}</button>
                {editing && <button onClick={() => { setEditing(null); setForm({name:'',hashtags:''}); }} className="btn-outline text-xs">Cancel</button>}
              </div>
            </div>

            <div className="space-y-2">
              {groups.map(g => {
                const tags = typeof g.hashtags === 'string' ? JSON.parse(g.hashtags) : g.hashtags;
                return (
                  <div key={g.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{g.name}</p>
                      <p className="text-xs text-gray-500 truncate">{(Array.isArray(tags) ? tags : []).join(' ')}</p>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button onClick={() => { setEditing(g.id); setForm({ name: g.name, hashtags: (Array.isArray(tags) ? tags : []).join(' ') }); }} className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => delGroup.mutate(g.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </div>
                );
              })}
              {groups.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No groups yet. Create one above.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarTab({ onSwitch, success, error }) {
  const [showComposer, setShowComposer] = useState(false);
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['social-posts'],
    queryFn: () => api.get('/api/social-media/posts').then(r => r.data?.posts || []),
    staleTime: 10000,
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
      <TabBar activeTab="calendar" onTabChange={onSwitch} />
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
                        <span className="text-xs">{({reel:'📸',image:'🖼',video:'📹',story:'📝'})[post.post_type] || '🖼'} {post.post_type && <span className="text-gray-400 font-normal">{post.post_type.charAt(0).toUpperCase() + post.post_type.slice(1)}</span>}</span>
                        <span className="text-xs text-gray-400">{post.published_at ? format(new Date(post.published_at), 'MMM d, HH:mm') : ''}</span>
                      </div>
                      <p className="text-sm text-gray-900 line-clamp-2">{post.title || post.content.substring(0, 120)}{!post.title && post.content.length > 120 ? '...' : ''}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Platforms: {(JSON.parse(post.platform_ids || '[]')).map(p => { const colors = {facebook:'bg-blue-500',instagram:'bg-orange-500',tiktok:'bg-black',google:'bg-green-500'}; return <span key={p} className={`inline-block w-2 h-2 rounded-full ${colors[p] || 'bg-gray-400'} mr-0.5`} title={p}></span>; }) || 'None selected'} {(JSON.parse(post.platform_ids || '[]')).join(', ') || ''}</p>
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

function AnalyticsTab({ onSwitch }) {
  const { data, isLoading } = useQuery({
    queryKey: ['social-analytics'],
    queryFn: () => api.get('/api/social-media/analytics').then(r => r.data),
    staleTime: 300000,
  });

  const { data: platformData } = useQuery({
    queryKey: ['social-platforms'],
    queryFn: () => api.get('/api/social-media/platforms').then(r => r.data?.platforms || []),
    staleTime: 300000,
  });

  const { data: leadCorr } = useQuery({
    queryKey: ['lead-correlation'],
    queryFn: () => api.get('/api/social-media/lead-correlation').then(r => r.data),
    staleTime: 300000,
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
      <TabBar activeTab="analytics" onTabChange={onSwitch} />
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

          {/* Lead-from-post correlation */}
          {leadCorr?.correlations?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200"><h3 className="text-sm font-semibold text-gray-700">Post → Lead Correlation</h3></div>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Post</th><th className="px-3 py-2.5">UTM Campaign</th><th className="px-3 py-2.5">Leads Generated</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {leadCorr.correlations.map(c => (
                    <tr key={c.post_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900 max-w-xs truncate">{c.title || `Post #${c.post_id}`}</td>
                      <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{c.utm_campaign || '—'}</td>
                      <td className="px-3 py-2.5"><span className="font-bold">{c.leads_count}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CampaignsTab({ success, error }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [subTab, setSubTab] = useState('campaigns');

  const { data: campaigns = [] } = useQuery({ queryKey: ['social-campaigns'], queryFn: () => api.get('/api/social-media/campaigns').then(r => r.data?.campaigns || []), staleTime: 10000 });
  const { data: leadCorr } = useQuery({ queryKey: ['lead-correlation'], queryFn: () => api.get('/api/social-media/lead-correlation').then(r => r.data), staleTime: 300000 });

  const delCampaign = useMutation({
    mutationFn: (id) => api.delete(`/api/social-media/campaigns/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-campaigns'] }); success('Campaign deleted'); },
    onError: (err) => error(err?.response?.data?.error || 'Failed to delete'),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Ad Campaigns & Lead Correlation</h2>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">+ New Campaign</button>
      </div>
      {showCreate && <CampaignForm onClose={() => setShowCreate(false)} queryClient={queryClient} success={success} error={error} />}

      <div className="flex gap-4 border-b border-gray-200">
        <button onClick={() => setSubTab('campaigns')} className={`pb-2 text-sm font-medium border-b-2 ${subTab === 'campaigns' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Campaigns</button>
        <button onClick={() => setSubTab('leads')} className={`pb-2 text-sm font-medium border-b-2 ${subTab === 'leads' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Lead Correlation</button>
      </div>

      {subTab === 'leads' ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Post → Lead Correlation</h3>
            {leadCorr && <span className="text-lg font-bold text-blue-600">{leadCorr.total_leads} total leads</span>}
          </div>
          {leadCorr?.correlations?.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2.5">Post</th><th className="px-3 py-2.5">UTM Campaign</th><th className="px-3 py-2.5">Leads</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {leadCorr.correlations.map(c => (
                  <tr key={c.post_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 max-w-xs truncate">{c.title || `Post #${c.post_id}`}</td>
                    <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{c.utm_campaign || '—'}</td>
                    <td className="px-3 py-2.5"><span className="font-bold">{c.leads_count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-center py-8 text-gray-400">No lead correlation data yet. Publish posts with UTM tags to track leads.</p>}
        </div>
      ) : selectedCampaign ? (
        <CampaignDetail campaign={selectedCampaign} onBack={() => setSelectedCampaign(null)} onDelete={(id) => { delCampaign.mutate(id); setSelectedCampaign(null); }} />
      ) : (
        <div className="space-y-3">
          {campaigns.length === 0 ? <p className="text-center py-8 text-gray-400">No campaigns yet</p> :
          campaigns.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm cursor-pointer" onClick={() => setSelectedCampaign(c)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><p className="font-medium text-gray-900">{c.name}</p><StatusBadge status={c.status} /></div>
                <p className="text-xs text-gray-500">{c.platform} · {c.campaign_type} · {c.start_date || 'No start date'} {c.budget ? `· $${c.budget.toFixed(2)}` : ''}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); delCampaign.mutate(c.id); }} className="text-xs text-red-500 hover:underline">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignForm({ onClose, queryClient, success, error }) {
  const [form, setForm] = useState({ name: '', platform: 'facebook', campaign_type: 'promotion', budget: '', spend: '', revenue: '', start_date: '', end_date: '', target_url: '', utm_campaign: '', notes: '', status: 'draft' });
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const createCampaign = useMutation({
    mutationFn: () => api.post('/api/social-media/campaigns', { ...form, budget: parseFloat(form.budget) || null, spend: parseFloat(form.spend) || null, revenue: parseFloat(form.revenue) || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-campaigns'] }); success('Campaign created'); onClose(); },
    onError: (err) => error(err?.response?.data?.error || 'Failed'),
  });
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="text-xs text-gray-600 block mb-0.5">Campaign Name</label><input type="text" value={form.name} onChange={e => u('name', e.target.value)} className="input text-sm w-full" /></div>
        <div><label className="text-xs text-gray-600 block mb-0.5">Platform</label><select value={form.platform} onChange={e => u('platform', e.target.value)} className="input text-sm w-full"><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="google">Google</option><option value="tiktok">TikTok</option></select></div>
        <div><label className="text-xs text-gray-600 block mb-0.5">Type</label><select value={form.campaign_type} onChange={e => u('campaign_type', e.target.value)} className="input text-sm w-full"><option value="promotion">Promotion</option><option value="awareness">Awareness</option><option value="retargeting">Retargeting</option><option value="event">Event</option></select></div>
        <div><label className="text-xs text-gray-600 block mb-0.5">Budget ($)</label><input type="number" value={form.budget} onChange={e => u('budget', e.target.value)} className="input text-sm w-full" /></div>
        <div><label className="text-xs text-gray-600 block mb-0.5">Actual Spend ($)</label><input type="number" value={form.spend} onChange={e => u('spend', e.target.value)} className="input text-sm w-full" /></div>
        <div><label className="text-xs text-gray-600 block mb-0.5">Revenue ($)</label><input type="number" value={form.revenue} onChange={e => u('revenue', e.target.value)} className="input text-sm w-full" /></div>
        <div><label className="text-xs text-gray-600 block mb-0.5">Status</label><select value={form.status} onChange={e => u('status', e.target.value)} className="input text-sm w-full"><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option></select></div>
        <div><label className="text-xs text-gray-600 block mb-0.5">Start Date</label><input type="date" value={form.start_date} onChange={e => u('start_date', e.target.value)} className="input text-sm w-full" /></div>
        <div><label className="text-xs text-gray-600 block mb-0.5">End Date</label><input type="date" value={form.end_date} onChange={e => u('end_date', e.target.value)} className="input text-sm w-full" /></div>
        <div className="col-span-2"><label className="text-xs text-gray-600 block mb-0.5">Target URL</label><input type="url" value={form.target_url} onChange={e => u('target_url', e.target.value)} className="input text-sm w-full" placeholder="https://..." /></div>
        <div className="col-span-2"><label className="text-xs text-gray-600 block mb-0.5">UTM Campaign <span className="text-gray-400">(used to track leads from this campaign)</span></label><input type="text" value={form.utm_campaign} onChange={e => u('utm_campaign', e.target.value)} className="input text-sm w-full" placeholder="e.g. summer_2024" /></div>
        <div className="col-span-2"><label className="text-xs text-gray-600 block mb-0.5">Notes</label><textarea value={form.notes} onChange={e => u('notes', e.target.value)} className="input text-sm w-full" rows={2} /></div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-outline text-xs">Cancel</button>
        <button onClick={createCampaign.mutate} disabled={!form.name.trim() || createCampaign.isPending} className="btn-primary text-xs">{createCampaign.isPending ? 'Creating...' : 'Create Campaign'}</button>
      </div>
    </div>
  );
}

function CampaignDetail({ campaign, onBack, onDelete }) {
  const { data: detail } = useQuery({ queryKey: ['campaign-detail', campaign.id], queryFn: () => api.get(`/api/social-media/campaigns/${campaign.id}`).then(r => r.data), enabled: !!campaign.id, staleTime: 10000 });
  const spend = detail?.campaign?.spend || detail?.analytics?.spend || 0;
  const leads = detail?.leads?.length || 0;
  const conversions = detail?.analytics?.conversions || 0;
  const revenue = detail?.campaign?.revenue || 0;
  const cpl = leads > 0 ? spend / leads : null;
  const cpc = conversions > 0 ? spend / conversions : null;
  const roas = spend > 0 ? revenue / spend : null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><button onClick={onBack} className="text-gray-400 hover:text-gray-600">&larr; Back</button><h3 className="text-lg font-semibold">{campaign.name}</h3><StatusBadge status={campaign.status} /></div>
        <button onClick={() => onDelete(campaign.id)} className="text-xs text-red-500 hover:underline">Delete</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><p className="text-gray-500">Platform</p><p className="font-medium capitalize">{campaign.platform}</p></div>
        <div><p className="text-gray-500">Type</p><p className="font-medium capitalize">{campaign.campaign_type}</p></div>
        <div><p className="text-gray-500">Budget</p><p className="font-medium">${campaign.budget?.toFixed(2) || 'N/A'}</p></div>
        <div><p className="text-gray-500">UTM</p><p className="font-medium font-mono text-xs">{campaign.utm_campaign || 'N/A'}</p></div>
        <div><p className="text-gray-500">Start</p><p className="font-medium">{campaign.start_date || 'N/A'}</p></div>
        <div><p className="text-gray-500">End</p><p className="font-medium">{campaign.end_date || 'N/A'}</p></div>
        {campaign.target_url && <div className="col-span-2"><p className="text-gray-500">URL</p><p className="font-medium text-blue-600 truncate">{campaign.target_url}</p></div>}
      </div>
      {/* ROI Metrics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">ROI Metrics</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div><p className="text-xs text-gray-500">Actual Spend</p><p className="text-sm font-bold text-gray-900">${spend.toFixed(2)}</p></div>
          <div><p className="text-xs text-gray-500">Leads Attributed</p><p className="text-sm font-bold text-gray-900">{leads}</p></div>
          <div><p className="text-xs text-gray-500">Cost per Lead</p><p className="text-sm font-bold text-gray-900">{cpl !== null ? `$${cpl.toFixed(2)}` : '—'}</p></div>
          <div><p className="text-xs text-gray-500">Cost per Conversion</p><p className="text-sm font-bold text-gray-900">{cpc !== null ? `$${cpc.toFixed(2)}` : '—'}</p></div>
          <div><p className="text-xs text-gray-500">ROAS</p><p className={`text-sm font-bold ${roas !== null && roas >= 1 ? 'text-green-600' : 'text-gray-900'}`}>{roas !== null ? `${roas.toFixed(2)}x` : '—'}</p></div>
        </div>
      </div>
      {/* Leads from this campaign */}
      <div><h4 className="text-sm font-semibold text-gray-700 mb-2">Leads Generated ({leads})</h4>
        {detail?.leads?.length > 0 ? <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
          {detail.leads.map(l => <div key={l.id} className="px-3 py-2 text-xs flex justify-between"><span>{l.first_name} {l.last_name}</span><span className="text-gray-400">{l.stage} · {new Date(l.created_at).toLocaleDateString()}</span></div>)}
        </div> : <p className="text-xs text-gray-400">No leads tracked yet. Leads with matching UTM campaign will appear here.</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { draft: 'bg-gray-100 text-gray-600', active: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700', completed: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700', published: 'bg-green-100 text-green-700', scheduled: 'bg-blue-100 text-blue-700' };
  return <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function PlatformsTab({ onSwitch, success, error }) {
  const queryClient = useQueryClient();

  const { data: platforms = [], isLoading } = useQuery({
    queryKey: ['social-platforms'],
    queryFn: () => api.get('/api/social-media/platforms').then(r => r.data?.platforms || []),
    staleTime: 300000,
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
      <TabBar activeTab="platforms" onTabChange={onSwitch} />
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {platforms.map(p => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.icon || { facebook: '📘', instagram: '📷', tiktok: '🎵', google: '🔍' }[p.platform_type] || '📱'}</span>
                <div><p className="font-medium text-gray-900">{p.display_name || p.name}</p><p className="text-xs text-gray-500">{p.connected ? 'Connected' : 'Not connected'}{p.connected ? ` — Page ID: ${p.page_id || 'N/A'}` : ''}</p></div>
              </div>
              {p.platform_type === 'tiktok' ? (
                <span className="text-xs text-gray-400">Coming Soon — requires separate TikTok Business API application. <button onClick={() => window.location.href='/settings?tab=integrations'} className="text-red-600 hover:underline ml-1">Learn More</button></span>
              ) : p.connected ? (
                <button onClick={() => handleConnect.mutate({ id: p.id, connected: true })}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">Disconnect</button>
              ) : (
                <button onClick={() => {
                  if (p.platform_type === 'instagram' || p.platform_type === 'facebook') {
                    const metaAppId = import.meta.env.VITE_META_APP_ID;
                    if (metaAppId) {
                      const redirect = encodeURIComponent(`${window.location.origin}/social?platform=${p.platform_type}`);
                      window.open(`https://www.facebook.com/v19.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${redirect}&scope=pages_manage_posts,pages_read_engagement&response_type=code`, '_blank', 'width=600,height=400');
                    } else {
                      error('META_APP_ID not configured in environment');
                    }
                  } else {
                    handleConnect.mutate({ id: p.id, connected: false });
                  }
                }} className="px-4 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700">Connect</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
