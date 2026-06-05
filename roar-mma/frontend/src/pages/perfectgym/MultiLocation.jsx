import { useState } from 'react';

const LOCATIONS = [
  { id: 1, name: 'ROAR MMA Perth CBD', city: 'Perth', members: 847, open: true },
  { id: 2, name: 'ROAR MMA Fremantle', city: 'Fremantle', members: 423, open: true },
  { id: 3, name: 'ROAR MMA Joondalup', city: 'Joondalup', members: 312, open: true },
  { id: 4, name: 'ROAR MMA Rockingham', city: 'Rockingham', members: 198, open: false },
  { id: 5, name: 'ROAR MMA Midland', city: 'Midland', members: 256, open: true },
];

export default function MultiLocation() {
  const [selectedId, setSelectedId] = useState(1);
  const selected = LOCATIONS.find(l => l.id === selectedId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Multi-Location Management</h1>
          <p className="text-sm text-gray-500">Manage all gym locations from a single dashboard</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Location Sidebar */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase">Locations</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {LOCATIONS.map(loc => (
                <button key={loc.id} onClick={() => setSelectedId(loc.id)}
                  className={`w-full text-left p-3 transition-colors ${
                    selectedId === loc.id
                      ? 'bg-red-50 border-l-4 border-red-600'
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{loc.name}</p>
                      <p className="text-xs text-gray-500">{loc.city}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-gray-500">{loc.members}</span>
                      <span className={`w-2 h-2 rounded-full ${loc.open ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location Detail */}
        {selected && (
          <div className="flex-1">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-3 h-3 rounded-full ${selected.open ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                  </div>
                  <p className="text-sm text-gray-500">{selected.city} · {selected.members} active members</p>
                </div>
                <span className={`badge ${selected.open ? 'badge-green' : 'badge-gray'}`}>
                  {selected.open ? 'Open' : 'Closed'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">Active Members</p>
                  <p className="text-2xl font-bold text-blue-900">{selected.members}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${(selected.members * 72).toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium">Classes / Week</p>
                  <p className="text-2xl font-bold text-purple-900">{selected.id * 12 + 15}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary btn-sm">View Members</button>
                  <button className="btn btn-outline btn-sm">View Schedule</button>
                  <button className="btn btn-outline btn-sm">Location Settings</button>
                  <button className="btn btn-outline btn-sm">Staff Roster</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
