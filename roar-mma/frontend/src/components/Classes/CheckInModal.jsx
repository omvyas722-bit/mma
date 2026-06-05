// Class Check-in Modal Component
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal, { ConfirmDialog } from '../Modal';
import api from '../../lib/api';
import { useDebounce } from '../../hooks/useCommon';
import { useNotifications } from '../../contexts/NotificationContext';

export default function CheckInModal({ isOpen, onClose, classInstance }) {
  const queryClient = useQueryClient();
  const { error } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [removeConfirmId, setRemoveConfirmId] = useState(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch members for search
  const { data: searchResults = [] } = useQuery({
    queryKey: ['members-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const response = await api.get('/api/members', {
        params: { query: debouncedSearch, status: 'active' }
      });
      return response.data.members || [];
    },
    enabled: isOpen && debouncedSearch.length >= 2,
  });

  // Fetch current attendees
  const { data: attendees = [], refetch: refetchAttendees } = useQuery({
    queryKey: ['class-attendees', classInstance?.id],
    queryFn: async () => {
      const response = await api.get(`/api/classes/${classInstance.id}/attendees`);
      return response.data;
    },
    enabled: isOpen && !!classInstance,
  });

  const checkInMutation = useMutation({
    mutationFn: async (memberIds) => {
      const response = await api.post(`/api/classes/${classInstance.id}/check-in`, {
        member_ids: memberIds,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['class-attendees', classInstance.id]);
      queryClient.invalidateQueries(['class-instances']);
      queryClient.invalidateQueries(['attendance']);
      refetchAttendees();
      setSelectedMembers([]);
      setSearchQuery('');
    },
    onError: (err) => {
      if (import.meta.env.DEV) console.error('Error checking in members:', err);
      error('Failed to check in members. Please try again.');
    }
  });

  const removeAttendeeMutation = useMutation({
    mutationFn: async (attendanceId) => {
      await api.delete(`/api/attendance/${attendanceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['class-attendees', classInstance.id]);
      queryClient.invalidateQueries(['class-instances']);
      queryClient.invalidateQueries(['attendance']);
      refetchAttendees();
    },
    onError: (err) => {
      if (import.meta.env.DEV) console.error('Error removing attendee:', err);
      error('Failed to remove attendee. Please try again.');
    }
  });

  const handleCheckIn = () => {
    if (selectedMembers.length > 0) {
      checkInMutation.mutate(selectedMembers.map(m => m.id));
    }
  };

  const handleRemoveAttendee = (attendanceId) => {
    setRemoveConfirmId(attendanceId);
  };

  const toggleMemberSelection = (member) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === member.id);
      if (isSelected) {
        return prev.filter(m => m.id !== member.id);
      } else {
        return [...prev, member];
      }
    });
  };

  const isAlreadyCheckedIn = (memberId) => {
    return attendees.some(a => a.member_id === memberId);
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchQuery('');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedMembers([]);
    }
  }, [isOpen]);

  if (!classInstance) return null;

  const confirmDelete = () => {
    if (removeConfirmId) {
      removeAttendeeMutation.mutate(removeConfirmId);
      setRemoveConfirmId(null);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Class Check-In" size="lg">
      <div className="space-y-6">
        {/* Class Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900">{classInstance.class_name}</h3>
          <p className="text-sm text-gray-600">
            {classInstance.start_time} - {classInstance.end_time}
          </p>
          <p className="text-sm text-gray-600">
            Capacity: {attendees.length}/{classInstance.capacity || 'Unlimited'}
          </p>
        </div>

        {/* Search Members */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Members to Check In
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            aria-label="Search members"
            className="input mb-2"
          />

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {searchResults.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No members found</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {searchResults.map((member) => {
                    const alreadyCheckedIn = isAlreadyCheckedIn(member.id);
                    const isSelected = selectedMembers.some(m => m.id === member.id);

                    return (
                      <div
                        key={member.id}
                        onClick={() => !alreadyCheckedIn && toggleMemberSelection(member)}
                        role="button"
                        tabIndex={alreadyCheckedIn ? -1 : 0}
                        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !alreadyCheckedIn) toggleMemberSelection(member); }}
                        className={`p-3 cursor-pointer hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50' : ''
                        } ${alreadyCheckedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                          {alreadyCheckedIn && (
                            <span className="badge badge-green text-xs" aria-label="Checked in">Checked In</span>
                          )}
                          {isSelected && !alreadyCheckedIn && (
                            <span className="badge badge-blue text-xs" aria-label="Selected for check-in">Selected</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Selected ({selectedMembers.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <span
                    key={member.id}
                    className="badge badge-blue flex items-center gap-1"
                  >
                    {member.first_name} {member.last_name}
                    <button type="button"
                      onClick={() => toggleMemberSelection(member)}
                      className="ml-1 hover:text-red-600"
                      aria-label={`Remove ${member.first_name} ${member.last_name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <button type="button"
                onClick={handleCheckIn}
                disabled={checkInMutation.isPending}
                className="btn btn-primary mt-3 w-full"
              >
                {checkInMutation.isPending ? 'Checking In...' : `Check In ${selectedMembers.length} Member${selectedMembers.length > 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>

        {/* Current Attendees */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Current Attendees ({attendees.length})
          </h3>
          <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
            {attendees.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No attendees yet</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {attendees.map((attendee) => (
                  <div key={attendee.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {attendee.member_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Checked in at {new Date(attendee.checked_in_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => handleRemoveAttendee(attendee.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </Modal>
      <ConfirmDialog
        isOpen={!!removeConfirmId}
        onClose={() => setRemoveConfirmId(null)}
        onConfirm={confirmDelete}
        title="Remove Attendee"
        message="Remove this member from the class?"
        confirmText="Remove"
        variant="danger"
      />
    </>
  );
}
