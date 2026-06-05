import { useState } from 'react';

const MOCK_STAFF = [
  {
    id: 1,
    name: 'Alex Reid',
    role: 'Trainer',
    skills: ['MMA', 'BJJ', 'Boxing'],
    schedule: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false },
  },
  {
    id: 2,
    name: 'Carlos Santos',
    role: 'Trainer',
    skills: ['BJJ', 'Wrestling'],
    schedule: { Mon: true, Tue: true, Wed: false, Thu: true, Fri: true, Sat: true, Sun: false },
  },
  {
    id: 3,
    name: 'Sakda Somchai',
    role: 'Trainer',
    skills: ['Muay Thai', 'Kickboxing'],
    schedule: { Mon: true, Tue: false, Wed: true, Thu: false, Fri: true, Sat: true, Sun: false },
  },
  {
    id: 4,
    name: 'Lena Park',
    role: 'Trainer',
    skills: ['Yoga', 'Flexibility', 'Recovery'],
    schedule: { Mon: false, Tue: true, Wed: true, Thu: true, Fri: false, Sat: true, Sun: true },
  },
  {
    id: 5,
    name: 'Sarah Mitchell',
    role: 'Manager',
    skills: ['Operations', 'Sales', 'Customer Service'],
    schedule: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false },
  },
  {
    id: 6,
    name: 'Jake Porter',
    role: 'Front Desk',
    skills: ['Reception', 'Sales', 'CRM'],
    schedule: { Mon: true, Tue: true, Wed: true, Thu: false, Fri: true, Sat: true, Sun: false },
  },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ROLE_COLORS = {
  Trainer: 'badge-blue',
  Manager: 'badge-green',
  'Front Desk': 'badge-yellow',
};

const INITIALS_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500',
];

export default function StaffManagement() {
  const [staff] = useState(MOCK_STAFF);

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500">Trainer schedules, skills, and role management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((person, idx) => (
          <div key={person.id} className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 ${INITIALS_COLORS[idx % INITIALS_COLORS.length]} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                {getInitials(person.name)}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{person.name}</h3>
                <span className={`badge ${ROLE_COLORS[person.role] || 'badge-gray'}`}>{person.role}</span>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Skills</p>
              <div className="flex flex-wrap gap-1">
                {person.skills.map(skill => (
                  <span key={skill} className="badge badge-gray bg-gray-100 text-gray-700">{skill}</span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Weekly Schedule</p>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map(day => (
                  <div key={day} className="text-center">
                    <p className="text-[10px] text-gray-400 mb-1">{day}</p>
                    <div className={`w-full h-8 rounded-md flex items-center justify-center text-xs font-medium ${
                      person.schedule[day]
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {person.schedule[day] ? '✓' : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
