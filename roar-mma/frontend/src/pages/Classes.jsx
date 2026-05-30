// Classes page
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format, startOfWeek, addDays } from 'date-fns';
import { useNotifications } from '../contexts/NotificationContext';
import logger from '../lib/logger';
import AddClassModal from '../components/Classes/AddClassModal';
import EditClassModal from '../components/Classes/EditClassModal';
import CheckInModal from '../components/Classes/CheckInModal';
import ConfirmDialog from '../components/Shared/ConfirmDialog';

export default function Classes() {
  const queryClient = useQueryClient();
  const { error } = useNotifications();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deletingClass, setDeletingClass] = useState(null);
  const [checkInClass, setCheckInClass] = useState(null);
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 }); // Monday
  });

  const weekEnd = addDays(weekStart, 6);

  const deleteClass = useMutation({
    mutationFn: async (classId) => {
      await api.delete(`/api/classes/${classId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      setDeletingClass(null);
    },
    onError: (err) => {
      logger.error('Error deleting class:', err);
      error('Failed to delete class. Please try again.');
    }
  });

  const handleDeleteConfirm = () => {
    if (deletingClass) {
      deleteClass.mutate(deletingClass.id);
    }
  };

  const { data: instances, isLoading } = useQuery({
    queryKey: ['class-instances', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await api.get('/api/classes/instances', {
        params: {
          week_start: format(weekStart, 'yyyy-MM-dd'),
          week_end: format(weekEnd, 'yyyy-MM-dd'),
        },
      });
      return response.data;
    },
  });

  function previousWeek() {
    setWeekStart(addDays(weekStart, -7));
  }

  function nextWeek() {
    setWeekStart(addDays(weekStart, 7));
  }

  function thisWeek() {
    const today = new Date();
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
  }

  // Group instances by day
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const instancesByDay = useMemo(() => {
    const grouped = {};
    days.forEach((day, index) => {
      const date = addDays(weekStart, index);
      const dateStr = format(date, 'yyyy-MM-dd');
      grouped[day] = {
        date: dateStr,
        displayDate: format(date, 'MMM d'),
        instances: (instances || []).filter((inst) => inst.date === dateStr),
      };
    });
    return grouped;
  }, [instances, weekStart]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          Add Class
        </button>
      </div>

      <AddClassModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <EditClassModal
        isOpen={!!editingClass}
        onClose={() => setEditingClass(null)}
        classData={editingClass}
      />
      <CheckInModal
        isOpen={!!checkInClass}
        onClose={() => setCheckInClass(null)}
        classInstance={checkInClass}
      />
      <ConfirmDialog
        isOpen={!!deletingClass}
        onClose={() => setDeletingClass(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Class"
        message={`Are you sure you want to delete ${deletingClass?.name}? This will remove all scheduled instances of this class.`}
        confirmText="Delete"
        type="danger"
      />

      {/* Week navigation */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between">
          <button onClick={previousWeek} className="btn btn-secondary">
            ◀ Previous
          </button>
          <div className="text-center">
            <p className="text-lg font-semibold">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </p>
            <button onClick={thisWeek} className="text-sm text-blue-600 hover:underline">
              This Week
            </button>
          </div>
          <button onClick={nextWeek} className="btn btn-secondary">
            Next ▶
          </button>
        </div>
      </div>

      {/* Weekly timetable */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {days.map((day) => {
            const dayData = instancesByDay[day];
            return (
              <div key={day} className="bg-white rounded-lg shadow">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">{day}</h3>
                  <p className="text-sm text-gray-500">{dayData.displayDate}</p>
                </div>
                <div className="p-4 space-y-3">
                  {dayData.instances.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No classes</p>
                  ) : (
                    dayData.instances.map((instance) => (
                      <ClassInstanceCard
                        key={instance.id}
                        instance={instance}
                        onEdit={() => setEditingClass(instance)}
                        onDelete={() => setDeletingClass(instance)}
                        onCheckIn={() => setCheckInClass(instance)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClassInstanceCard({ instance, onEdit, onDelete, onCheckIn }) {
  const fillPercentage = instance.capacity ? (instance.booked_count / instance.capacity) * 100 : 0;
  const fillColor =
    fillPercentage >= 90
      ? 'bg-red-500'
      : fillPercentage >= 80
      ? 'bg-yellow-500'
      : fillPercentage >= 50
      ? 'bg-blue-500'
      : 'bg-green-500';

  const classTypeColors = {
    bjj: 'bg-blue-100 text-blue-800',
    muay_thai: 'bg-red-100 text-red-800',
    mma: 'bg-purple-100 text-purple-800',
    kids: 'bg-yellow-100 text-yellow-800',
    pt: 'bg-green-100 text-green-800',
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="text-blue-600 hover:text-blue-900 p-1"
          title="Edit class"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-600 hover:text-red-900 p-1"
          title="Delete class"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm">{instance.class_name}</p>
          <p className="text-xs text-gray-500">{instance.start_time}</p>
        </div>
        <span className={`badge text-xs ${classTypeColors[instance.class_type] || 'badge-gray'}`}>
          {instance.class_type?.toUpperCase()}
        </span>
      </div>

      {instance.coach_name && (
        <p className="text-xs text-gray-600 mb-2">Coach: {instance.coach_name}</p>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div
            className={`${fillColor} h-1.5 rounded-full transition-all`}
            style={{ width: `${fillPercentage}%` }}
          ></div>
        </div>
        <span className="text-xs text-gray-600 font-medium">
          {instance.booked_count}/{instance.capacity}
        </span>
      </div>

      {instance.status === 'cancelled' && (
        <div className="mt-2">
          <span className="badge badge-red text-xs">Cancelled</span>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onCheckIn();
        }}
        className="mt-3 w-full btn btn-primary text-xs py-1"
      >
        Check In
      </button>
    </div>
  );
}
