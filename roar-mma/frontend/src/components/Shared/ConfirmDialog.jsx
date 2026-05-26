// Confirmation Dialog Component
import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) {
  const types = {
    danger: 'btn bg-red-600 text-white hover:bg-red-700',
    warning: 'btn bg-yellow-600 text-white hover:bg-yellow-700',
    info: 'btn bg-blue-600 text-white hover:bg-blue-700',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-gray-700">{message}</p>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={types[type]}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
