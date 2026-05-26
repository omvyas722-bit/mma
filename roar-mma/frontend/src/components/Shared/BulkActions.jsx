// Bulk Actions Component for Managing Multiple Records
import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

export default function BulkActions({
  selectedItems = [],
  onClearSelection,
  actions = [],
  itemLabel = 'items',
}) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const handleActionClick = (action) => {
    if (action.requiresConfirmation) {
      setPendingAction(action);
      setShowConfirmDialog(true);
    } else {
      action.handler(selectedItems);
      onClearSelection();
    }
  };

  const handleConfirm = () => {
    if (pendingAction) {
      pendingAction.handler(selectedItems);
      onClearSelection();
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  if (selectedItems.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-40 animate-slide-up">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {selectedItems.length} {itemLabel} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300"></div>

          <div className="flex gap-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                disabled={action.disabled}
                className={`btn ${action.variant || 'btn-secondary'} ${
                  action.disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setPendingAction(null);
        }}
        onConfirm={handleConfirm}
        title={pendingAction?.confirmTitle || 'Confirm Action'}
        message={
          pendingAction?.confirmMessage ||
          `Are you sure you want to perform this action on ${selectedItems.length} ${itemLabel}?`
        }
        confirmText={pendingAction?.confirmText || 'Confirm'}
        type={pendingAction?.confirmType || 'warning'}
      />
    </>
  );
}

// Checkbox component for selecting items
export function SelectCheckbox({ checked, onChange, disabled = false }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// Hook for managing bulk selection
export function useBulkSelection(items = []) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleItem = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const isSelected = (id) => selectedIds.has(id);

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;

  const selectedItems = items.filter(item => selectedIds.has(item.id));

  return {
    selectedIds,
    selectedItems,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
  };
}

// Usage example:
/*
import BulkActions, { SelectCheckbox, useBulkSelection } from './components/Shared/BulkActions';

function MembersPage() {
  const { data: members = [] } = useQuery(['members']);
  const {
    selectedItems,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
  } = useBulkSelection(members);

  const bulkActions = [
    {
      label: 'Export',
      icon: '📥',
      handler: (items) => {
        exportMembersToCSV(items);
      },
    },
    {
      label: 'Send Email',
      icon: '✉️',
      handler: (items) => {
        // Open email compose modal with selected members
      },
    },
    {
      label: 'Change Status',
      icon: '🔄',
      handler: (items) => {
        // Open status change modal
      },
    },
    {
      label: 'Delete',
      icon: '🗑️',
      variant: 'bg-red-600 text-white hover:bg-red-700',
      requiresConfirmation: true,
      confirmTitle: 'Delete Members',
      confirmMessage: `Are you sure you want to delete ${selectedItems.length} members? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmType: 'danger',
      handler: async (items) => {
        await Promise.all(items.map(item => api.delete(`/api/members/${item.id}`)));
        queryClient.invalidateQueries(['members']);
      },
    },
  ];

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>
              <SelectCheckbox
                checked={isAllSelected}
                onChange={toggleAll}
              />
            </th>
            <th>Name</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.id}>
              <td>
                <SelectCheckbox
                  checked={isSelected(member.id)}
                  onChange={() => toggleItem(member.id)}
                />
              </td>
              <td>{member.name}</td>
              <td>{member.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <BulkActions
        selectedItems={selectedItems}
        onClearSelection={clearSelection}
        actions={bulkActions}
        itemLabel="members"
      />
    </div>
  );
}
*/
