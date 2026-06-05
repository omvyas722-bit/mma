import { useState } from 'react';

const INITIAL_SCHEDULE = [
  { id: 1, name: 'Morning MMA', trainer: 'Alex Reid', time: '06:00', capacity: 20, booked: 18 },
  { id: 2, name: 'BJJ Fundamentals', trainer: 'Carlos Santos', time: '09:00', capacity: 15, booked: 15 },
  { id: 3, name: 'Muay Thai', trainer: 'Sakda Somchai', time: '12:00', capacity: 18, booked: 10 },
  { id: 4, name: 'Boxing Fitness', trainer: 'Mike Tyson Jr', time: '17:00', capacity: 25, booked: 25 },
  { id: 5, name: 'Evening MMA', trainer: 'Alex Reid', time: '18:30', capacity: 20, booked: 7 },
  { id: 6, name: 'Yoga for Fighters', trainer: 'Lena Park', time: '19:00', capacity: 12, booked: 12 },
];

export default function ClassBooking() {
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);
  const [booked, setBooked] = useState(new Set());
  const [waitlisted, setWaitlisted] = useState(new Set());

  const spotsLeft = (cls) => cls.capacity - cls.booked;
  const isFull = (cls) => spotsLeft(cls) <= 0;

  const handleBook = (id) => {
    if (booked.has(id)) return;
    setBooked(prev => new Set(prev).add(id));
    setSchedule(prev => prev.map(c => c.id === id ? { ...c, booked: c.booked + 1 } : c));
  };

  const handleWaitlist = (id) => {
    if (waitlisted.has(id)) return;
    setWaitlisted(prev => new Set(prev).add(id));
  };

  const handleCancel = (id) => {
    setBooked(prev => { const n = new Set(prev); n.delete(id); return n; });
    setWaitlisted(prev => { const n = new Set(prev); n.delete(id); return n; });
    setSchedule(prev => prev.map(c => c.id === id ? { ...c, booked: c.booked - 1 } : c));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Class & PT Booking</h1>
          <p className="text-sm text-gray-500">Book group classes or join the waitlist</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedule.map(cls => {
          const remaining = spotsLeft(cls);
          const isBooked = booked.has(cls.id);
          const isWaitlisted = waitlisted.has(cls.id);

          return (
            <div key={cls.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                <span className={`badge ${
                  remaining > 5 ? 'badge-green' : remaining > 0 ? 'badge-yellow' : 'badge-red'
                }`}>
                  {remaining > 0 ? `${remaining} spot${remaining > 1 ? 's' : ''} left` : 'Full'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <p>Trainer: <span className="font-medium text-gray-900">{cls.trainer}</span></p>
                <p>Time: <span className="font-medium text-gray-900">{cls.time}</span></p>
                <p>Capacity: <span className="font-medium text-gray-900">{cls.booked}/{cls.capacity}</span></p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className={`h-2 rounded-full transition-all ${
                    remaining > 5 ? 'bg-green-500' : remaining > 0 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(cls.booked / cls.capacity) * 100}%` }}
                />
              </div>
              {isBooked ? (
                <button onClick={() => handleCancel(cls.id)} className="btn btn-danger w-full">
                  Cancel Booking
                </button>
              ) : isWaitlisted ? (
                <div className="text-center">
                  <span className="badge badge-yellow mb-2 block">On Waitlist</span>
                  <button onClick={() => handleCancel(cls.id)} className="btn btn-ghost w-full text-sm">
                    Leave Waitlist
                  </button>
                </div>
              ) : isFull(cls) ? (
                <button onClick={() => handleWaitlist(cls.id)} className="btn btn-outline w-full">
                  Join Waitlist
                </button>
              ) : (
                <button onClick={() => handleBook(cls.id)} className="btn btn-primary w-full">
                  Book
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
