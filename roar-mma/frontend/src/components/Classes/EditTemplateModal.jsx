import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../Modal';
import api from '../../lib/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { ClassFormFields, initialClassForm, validateClassForm } from './ClassFormFields';

export default function EditTemplateModal({ isOpen, onClose, classId: initialClassId }) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [formData, setFormData] = useState(initialClassForm);
  const [errors, setErrors] = useState({});
  const [propagate, setPropagate] = useState(true);
  const [selectedId, setSelectedId] = useState(initialClassId || null);

  const { data: templatesList } = useQuery({
    queryKey: ['class-templates'],
    queryFn: async () => { const r = await api.get('/api/classes/templates'); return r.data?.templates || []; },
    enabled: isOpen && !selectedId,
  });

  const { data: templateData } = useQuery({
    queryKey: ['class-template', selectedId],
    queryFn: async () => { const r = await api.get('/api/classes/' + selectedId); return r.data; },
    enabled: !!selectedId && isOpen,
  });

  useEffect(() => {
    if (templateData) {
      setFormData({
        name: templateData.name || '',
        description: templateData.description || '',
        instructor: templateData.coach_name || templateData.instructor || '',
        location: templateData.location || '',
        day_of_week: (templateData.day_of_week ?? '').toString(),
        start_time: templateData.start_time || '',
        end_time: templateData.end_time || '',
        max_capacity: (templateData.capacity ?? '').toString(),
        class_type: templateData.class_type || '',
        min_belt: templateData.min_belt || '',
        fighter_only: templateData.fighter_only || false,
      });
    }
  }, [templateData]);

  const propagateMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        day_of_week: data.day_of_week ? parseInt(data.day_of_week, 10) : null,
        max_capacity: data.max_capacity ? parseInt(data.max_capacity, 10) : null,
      };
      const r = await api.put('/api/classes/' + selectedId + '/propagate', payload);
      return r.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['class-instances'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['class-template'] });
      success('Template updated - ' + (result.instances_updated || 0) + ' future instances updated');
      onClose();
    },
    onError: (err) => {
      error(err.response?.data?.error || 'Failed to update template');
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateClassForm(formData);
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      propagateMutation.mutate(formData);
    }
  };

  const hasChanges = templateData && Object.keys(formData).some(k => {
    const orig = templateData[k === 'instructor' ? 'coach_name' : k === 'max_capacity' ? 'capacity' : k];
    return String(formData[k]) !== String(orig ?? '');
  });

  if (!selectedId) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Class Template" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Select a class template to edit:</p>
          {(!templatesList || templatesList.length === 0) ? (
            <p className="text-sm text-gray-400">No templates found.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {templatesList.map(t => (
                <button key={t.id} type="button" onClick={() => setSelectedId(t.id)}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{t.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][t.day_of_week]} {t.start_time}</span>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t.location}</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={onClose} className="btn btn-secondary w-full">Cancel</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={'Edit Template: ' + (templateData?.name || '')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <button type="button" onClick={() => setSelectedId(null)} className="text-xs text-gray-500 hover:underline">&larr; Back to template list</button>
        {hasChanges && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
              <span>⚠</span> This changes all future instances - are you sure?
            </p>
            <p className="text-xs text-amber-600 mt-1">One-off changes for a specific week use instance-level editing which does NOT affect the template.</p>
          </div>
        )}

        <label className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
          <input type="checkbox" checked={propagate} onChange={e => setPropagate(e.target.checked)}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
          <div>
            <span className="text-sm font-medium text-gray-800">Apply to all future instances</span>
            <p className="text-xs text-gray-500">Changes propagate to all scheduled instances from today onward</p>
          </div>
        </label>

        <ClassFormFields formData={formData} errors={errors} handleChange={handleChange} />

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-gray-500">Editing template - changes affect the weekly schedule</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={propagateMutation.isPending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={propagateMutation.isPending}>
              {propagateMutation.isPending ? 'Updating...' : propagate ? 'Update Template & Propagate' : 'Update Template Only'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
