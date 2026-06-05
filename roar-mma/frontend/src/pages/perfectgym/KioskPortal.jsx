import { useState } from 'react';

export default function KioskPortal() {
  const [mode, setMode] = useState(null);

  if (mode === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">New Member Sign-up</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input className="input text-lg py-3" placeholder="Enter your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input className="input text-lg py-3" type="email" placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input text-lg py-3" type="tel" placeholder="0400 000 000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan</label>
              <select className="input text-lg py-3">
                <option>Unlimited MMA — $89/mo</option>
                <option>2x Week — $59/mo</option>
                <option>Casual — $15/visit</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setMode(null)} className="btn btn-ghost flex-1 py-3 text-lg">Back</button>
              <button className="btn btn-primary flex-1 py-3 text-lg">Sign Up</button>
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
          <input className="input text-lg py-3 text-center mb-4" placeholder="Member ID or scan card" />
          <button className="btn btn-primary w-full py-3 text-lg mb-3">Check In</button>
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
