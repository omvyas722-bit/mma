import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';

export default function KioskPortal() {
  const [mode, setMode] = useState(null);
  const [signupForm, setSignupForm] = useState({ name: '', email: '', phone: '', plan: 'Unlimited MMA — $89/mo' });
  const [checkinId, setCheckinId] = useState('');
  const [signupMsg, setSignupMsg] = useState('');
  const [checkinMsg, setCheckinMsg] = useState('');

  const signupMutation = useMutation({
    mutationFn: (data) => {
      const [firstName, ...lastParts] = data.name.trim().split(' ');
      return api.post('/api/members', {
        first_name: firstName || 'Unknown',
        last_name: lastParts.join(' ') || 'Member',
        email: data.email,
        phone: data.phone,
        location: 'Perth CBD',
        joined_date: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      setSignupMsg('✓ Member created successfully!');
      setTimeout(() => { setSignupMsg(''); setMode(null); setSignupForm({ name: '', email: '', phone: '', plan: 'Unlimited MMA — $89/mo' }); }, 2000);
    },
    onError: () => {
      setSignupMsg('✗ Failed to create member. Try again.');
      setTimeout(() => setSignupMsg(''), 3000);
    },
  });

  const checkinMutation = useMutation({
    mutationFn: (memberId) => {
      const today = new Date().toISOString().split('T')[0];
      return api.get('/api/classes/instances', { params: { date: today } }).then(instances => {
        const list = Array.isArray(instances) ? instances : instances?.data || [];
        if (list.length > 0) {
          return api.post(`/api/classes/${list[0].id}/check-in`, { member_ids: [parseInt(memberId, 10)] });
        }
        throw new Error('No classes today');
      });
    },
    onSuccess: () => {
      setCheckinMsg('✓ Checked in successfully!');
      setTimeout(() => { setCheckinMsg(''); setMode(null); setCheckinId(''); }, 2000);
    },
    onError: () => {
      setCheckinMsg('✗ Check-in failed. Check member ID.');
      setTimeout(() => setCheckinMsg(''), 3000);
    },
  });

  if (mode === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">New Member Sign-up</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input className="input text-lg py-3" placeholder="Enter your name" value={signupForm.name}
                onChange={e => setSignupForm({ ...signupForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input className="input text-lg py-3" type="email" placeholder="your@email.com" value={signupForm.email}
                onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input text-lg py-3" type="tel" placeholder="0400 000 000" value={signupForm.phone}
                onChange={e => setSignupForm({ ...signupForm, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan</label>
              <select className="input text-lg py-3" value={signupForm.plan}
                onChange={e => setSignupForm({ ...signupForm, plan: e.target.value })}>
                <option>Unlimited MMA — $89/mo</option>
                <option>2x Week — $59/mo</option>
                <option>Casual — $15/visit</option>
              </select>
            </div>
            {signupMsg && (
              <div className={`text-center font-bold ${signupMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {signupMsg}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setMode(null)} className="btn btn-ghost flex-1 py-3 text-lg">Back</button>
              <button onClick={() => signupMutation.mutate(signupForm)} disabled={signupMutation.isPending || !signupForm.name || !signupForm.email}
                className="btn btn-primary flex-1 py-3 text-lg">{signupMutation.isPending ? 'Signing up...' : 'Sign Up'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'checkin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check In</h2>
          <p className="text-gray-500 mb-6">Tap your RFID card or enter your member ID</p>
          <input className="input text-lg py-3 text-center mb-4" placeholder="Member ID or scan card" value={checkinId}
            onChange={e => setCheckinId(e.target.value)} />
          {checkinMsg && (
            <div className={`text-center font-bold mb-2 ${checkinMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
              {checkinMsg}
            </div>
          )}
          <button onClick={() => checkinMutation.mutate(checkinId)} disabled={checkinMutation.isPending || !checkinId}
            className="btn btn-primary w-full py-3 text-lg mb-3">{checkinMutation.isPending ? 'Checking in...' : 'Check In'}</button>
          <button onClick={() => setMode(null)} className="btn btn-ghost w-full py-3 text-lg">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Self-Service Kiosk & Client Portal</h1>
          <p className="text-sm text-gray-500">Touch-optimised kiosk welcome screen</p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-white">🥊</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">ROAR MMA</h1>
            <p className="text-gray-400">Perth CBD</p>
          </div>

          <div className="space-y-4">
            <button onClick={() => setMode('signup')}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-xl font-bold py-6 rounded-2xl transition-colors shadow-lg"
            >
              New Member — Sign Up
            </button>
            <button onClick={() => setMode('checkin')}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 text-xl font-bold py-6 rounded-2xl transition-colors shadow-lg"
            >
              Existing Member — Check In
            </button>
          </div>

          <div className="text-center mt-6">
            <button className="text-gray-500 hover:text-gray-300 text-sm underline">Staff login</button>
          </div>
        </div>
      </div>
    </div>
  );
}
