import { useState } from 'react';

export default function BrandedMemberApp() {
  const [activeTab, setActiveTab] = useState('home');

  const checkins = [
    { date: '2026-06-04', location: 'Perth CBD', time: '06:30' },
    { date: '2026-06-03', location: 'Perth CBD', time: '07:00' },
    { date: '2026-06-01', location: 'Fremantle', time: '09:15' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branded Member App</h1>
          <p className="text-sm text-gray-500">Mobile app home screen mockup (375px)</p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="bg-gray-900 rounded-[2rem] p-3 shadow-2xl" style={{ width: 375 }}>
          <div className="bg-white rounded-[1.5rem] overflow-hidden" style={{ height: 740 }}>
            {/* Status Bar */}
            <div className="bg-red-600 text-white text-xs px-4 py-2 flex justify-between">
              <span>9:41</span>
              <span>🔋 94%</span>
            </div>

            {/* Header */}
            <div className="px-4 pt-3 pb-2 bg-gradient-to-b from-red-50 to-white">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-500">Good morning,</p>
                  <p className="text-lg font-bold text-gray-900">Alex</p>
                </div>
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  A
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-3">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Book a Class', icon: '📅' },
                  { label: 'QR Code', icon: '📱' },
                  { label: 'Payments', icon: '💳' },
                ].map(act => (
                  <button key={act.label}
                    className="flex flex-col items-center gap-1 bg-gray-50 rounded-xl py-3 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-xl">{act.icon}</span>
                    <span className="text-[10px] text-gray-600 text-center leading-tight">{act.label}</span>
                  </button>
                ))}
              </div>

              {/* Upcoming Class Card */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-4 text-white mb-4">
                <p className="text-xs opacity-80 mb-1">Up Next</p>
                <p className="font-bold text-base">Morning MMA</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm opacity-90">06:00 – 07:00</p>
                  <button className="text-xs underline">View booking</button>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Recent Activity</p>
                <div className="space-y-2">
                  {checkins.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs font-bold">
                        ✓
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-900">Checked in at {c.location}</p>
                        <p className="text-[10px] text-gray-500">{c.date} at {c.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Nav */}
            <div className="border-t border-gray-200 px-4 py-2 flex justify-around">
              {[
                { label: 'Home', icon: '🏠', key: 'home' },
                { label: 'Classes', icon: '🥋', key: 'classes' },
                { label: 'Profile', icon: '👤', key: 'profile' },
                { label: 'More', icon: '⋯', key: 'more' },
              ].map(item => (
                <button key={item.key} onClick={() => setActiveTab(item.key)}
                  className={`flex flex-col items-center gap-0.5 ${activeTab === item.key ? 'text-red-600' : 'text-gray-400'}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-[10px]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
