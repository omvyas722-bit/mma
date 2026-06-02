import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { formatDate, formatCurrency } from '../lib/formatters';

const TABS = ['Home', 'Schedule', 'Bookings', 'Payments', 'Profile'];

export default function MemberPortal() {
  const [tab, setTab] = useState('Home');
  const [showRegister, setShowRegister] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', first_name: '', last_name: '', phone: '' });
  const [token, setToken] = useState(localStorage.getItem('member_token'));
  const [member, setMember] = useState(() => { try { return JSON.parse(localStorage.getItem('member_data')); } catch { return null; } });

  const setAuth = (t, m) => { setToken(t); setMember(m); localStorage.setItem('member_token', t); localStorage.setItem('member_data', JSON.stringify(m)); };
  const logout = () => { setToken(null); setMember(null); localStorage.removeItem('member_token'); localStorage.removeItem('member_data'); };

  const apiGet = (url) => api.get(url, { headers: { Authorization: `Bearer ${token}` } });
  const apiPost = (url, data) => api.post(url, data, { headers: { Authorization: `Bearer ${token}` } });

  const login = useMutation({
    mutationFn: (d) => api.post('/api/portal/login', d).then(r => r.data),
    onSuccess: (d) => setAuth(d.token, d.member),
  });

  const register = useMutation({
    mutationFn: (d) => api.post('/api/portal/register', d).then(r => r.data),
    onSuccess: (d) => setAuth(d.token, d.member),
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-2">ROAR MMA</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Member Portal</p>
          {showRegister ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Set Up Portal</h2>
              <p className="text-xs text-gray-500">Use the email you registered with at the gym.</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="First name" value={registerForm.first_name} onChange={e => setRegisterForm(f => ({ ...f, first_name: e.target.value }))} className="input text-sm" />
                <input type="text" placeholder="Last name" value={registerForm.last_name} onChange={e => setRegisterForm(f => ({ ...f, last_name: e.target.value }))} className="input text-sm" />
              </div>
              <input type="email" placeholder="Email" value={registerForm.email} onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))} className="input text-sm" />
              <input type="tel" placeholder="Phone (optional)" value={registerForm.phone} onChange={e => setRegisterForm(f => ({ ...f, phone: e.target.value }))} className="input text-sm" />
              <input type="password" placeholder="Password (min 8 chars)" value={registerForm.password} onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))} className="input text-sm" />
              <button onClick={() => register.mutate(registerForm)} disabled={register.isPending || registerForm.password.length < 8} className="btn-primary w-full text-sm">{register.isPending ? 'Setting up...' : 'Set Up Portal'}</button>
              <p className="text-xs text-center text-gray-500">Already set up? <button type="button" onClick={() => setShowRegister(false)} className="text-red-600 hover:underline">Log in</button></p>
            </div>
          ) : (
            <div className="space-y-3">
              <input type="email" placeholder="Email" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} className="input text-sm" />
              <input type="password" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} className="input text-sm" />
              <button onClick={() => login.mutate(loginForm)} disabled={login.isPending} className="btn-primary w-full text-sm">{login.isPending ? 'Logging in...' : 'Log In'}</button>
              <p className="text-xs text-center text-gray-500">First time? <button type="button" onClick={() => setShowRegister(true)} className="text-red-600 hover:underline">Set up portal</button></p>
            </div>
          )}
          {login.isError && <p className="text-xs text-red-500 text-center mt-2">{login.error?.response?.data?.error || 'Login failed'}</p>}
          {register.isError && <p className="text-xs text-red-500 text-center mt-2">{register.error?.response?.data?.error || 'Setup failed'}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-red-700 text-white p-4 flex items-center justify-between">
        <div><h1 className="text-lg font-bold">ROAR MMA</h1><p className="text-xs opacity-80">{member?.first_name} {member?.last_name}</p></div>
        <button onClick={logout} className="text-sm bg-white/20 px-3 py-1 rounded hover:bg-white/30">Logout</button>
      </header>
      <nav className="bg-white shadow flex overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${tab === t ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </nav>
      <main className="p-4 max-w-4xl mx-auto">
        {tab === 'Home' && <PortalHome member={member} apiGet={apiGet} />}
        {tab === 'Schedule' && <PortalSchedule apiGet={apiGet} apiPost={apiPost} />}
        {tab === 'Bookings' && <PortalBookings apiGet={apiGet} apiPost={apiPost} />}
        {tab === 'Payments' && <PortalPayments apiGet={apiGet} />}
        {tab === 'Profile' && <PortalProfile member={member} apiGet={apiGet} apiPost={apiPost} />}
      </main>
    </div>
  );
}

function PortalHome({ member, apiGet }) {
  const { data: schedule } = useQuery({ queryKey: ['portal-schedule'], queryFn: () => apiGet('/api/portal/schedule').then(r => r.data), enabled: !!member, staleTime: 30000 });
  const nextClasses = schedule?.filter(s => s.booked).slice(0, 3) || [];
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-2xl font-bold">Welcome back, {member?.first_name}!</p>
        <p className="text-sm text-gray-500 mt-1">Status: <span className="font-medium capitalize">{member?.status}</span></p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">Your Next Classes</h3>
        {nextClasses.length === 0 ? <p className="text-sm text-gray-400">No upcoming bookings</p> : nextClasses.map(s => (
          <div key={s.id} className="flex justify-between items-center py-2 border-b last:border-0">
            <div><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-gray-500">{formatDate(s.date)} {s.start_time}</p></div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Booked</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortalSchedule({ apiGet, apiPost }) {
  const { data: schedule, refetch } = useQuery({ queryKey: ['portal-schedule'], queryFn: () => apiGet('/api/portal/schedule').then(r => r.data), staleTime: 15000 });
  const book = useMutation({ mutationFn: (d) => apiPost('/api/portal/book', d), onSuccess: () => refetch() });
  const cancel = useMutation({ mutationFn: (id) => apiPost(`/api/portal/cancel-booking/${id}`), onSuccess: () => refetch() });
  if (!schedule) return <p className="text-sm text-gray-400">Loading...</p>;
  const grouped = {};
  schedule.forEach(s => { const d = s.date; if (!grouped[d]) grouped[d] = []; grouped[d].push(s); });
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Class Schedule</h2>
      {Object.entries(grouped).map(([date, classes]) => (
        <div key={date} className="bg-white rounded-lg shadow">
          <div className="bg-gray-50 px-4 py-2 font-medium text-sm text-gray-700 border-b">{formatDate(date)}</div>
          {classes.map(s => (
            <div key={`${s.class_id}-${s.date}`} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
              <div><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-gray-500">{s.start_time} — {s.end_time} · {s.discipline}</p></div>
              {s.booked ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Booked</span>
                  <button onClick={() => cancel.mutate(s.booking_id)} disabled={cancel.isPending} className="text-xs text-red-500 hover:underline">Cancel</button>
                </div>
              ) : (
                <button onClick={() => book.mutate({ class_id: s.class_id, date: s.date })} disabled={book.isPending} className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Book</button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PortalBookings({ apiGet, apiPost }) {
  const { data: bookings, refetch } = useQuery({ queryKey: ['portal-bookings'], queryFn: () => apiGet('/api/portal/bookings').then(r => r.data), staleTime: 15000 });
  const cancel = useMutation({ mutationFn: (id) => apiPost(`/api/portal/cancel-booking/${id}`), onSuccess: () => refetch() });
  if (!bookings) return <p className="text-sm text-gray-400">Loading...</p>;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">My Bookings</h2>
      {bookings.length === 0 ? <p className="text-sm text-gray-400">No bookings</p> : bookings.map(b => (
        <div key={b.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
          <div><p className="text-sm font-medium">{b.class_name}</p><p className="text-xs text-gray-500">{formatDate(b.booking_date)} · {b.discipline}</p></div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.status}</span>
            {b.status !== 'cancelled' && <button onClick={() => cancel.mutate(b.id)} className="text-xs text-red-500 hover:underline">Cancel</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PortalPayments({ apiGet }) {
  const { data: payments } = useQuery({ queryKey: ['portal-payments'], queryFn: () => apiGet('/api/portal/payments').then(r => r.data), staleTime: 60000 });
  if (!payments) return <p className="text-sm text-gray-400">Loading...</p>;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Payment History</h2>
      {payments.length === 0 ? <p className="text-sm text-gray-400">No payments</p> : payments.map(p => (
        <div key={p.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
          <div><p className="text-sm font-medium capitalize">{p.type?.replace(/_/g, ' ')}</p><p className="text-xs text-gray-500">{formatDate(p.created_at)}</p></div>
          <div className="text-right"><p className="text-sm font-bold">{formatCurrency(p.amount)}</p><p className={`text-xs ${p.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>{p.status}</p></div>
        </div>
      ))}
    </div>
  );
}

function PortalProfile({ member, apiGet, apiPost }) {
  const { data: profile, refetch } = useQuery({ queryKey: ['portal-profile'], queryFn: () => apiGet('/api/portal/profile').then(r => r.data), staleTime: 60000, enabled: !!member });
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ phone: '', emergency_contact_name: '', emergency_contact_phone: '' });
  const save = useMutation({ mutationFn: () => apiPost('/api/portal/profile', form), onSuccess: () => { setEdit(false); refetch(); } });
  const p = profile || member || {};
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3"><h2 className="text-lg font-semibold">My Profile</h2><button onClick={() => { setEdit(!edit); if (!edit) setForm({ phone: p.phone || '', emergency_contact_name: p.emergency_contact_name || '', emergency_contact_phone: p.emergency_contact_phone || '' }); }} className="text-xs text-red-600 hover:underline">{edit ? 'Cancel' : 'Edit'}</button></div>
        {edit ? (
          <div className="space-y-2">
            <div><label className="text-xs text-gray-500">Phone</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input text-sm w-full" /></div>
            <div><label className="text-xs text-gray-500">Emergency Contact</label><input type="text" value={form.emergency_contact_name} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} className="input text-sm w-full" placeholder="Name" /></div>
            <div><label className="text-xs text-gray-500">Emergency Phone</label><input type="tel" value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} className="input text-sm w-full" placeholder="Phone" /></div>
            <button onClick={save.mutate} disabled={save.isPending} className="btn-primary text-sm">Save</button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Name:</span> {p.first_name} {p.last_name}</p>
            <p><span className="text-gray-500">Email:</span> {p.email}</p>
            <p><span className="text-gray-500">Phone:</span> {p.phone || '—'}</p>
            <p><span className="text-gray-500">Plan:</span> {p.plan || '—'}</p>
            <p><span className="text-gray-500">Status:</span> <span className="capitalize">{p.status}</span></p>
            <p><span className="text-gray-500">Joined:</span> {p.joined_date ? formatDate(p.joined_date) : '—'}</p>
            <p><span className="text-gray-500">Health Score:</span> {p.health_score != null ? `${p.health_score}/100` : '—'}</p>
          </div>
        )}
      </div>
    </div>
  );
}