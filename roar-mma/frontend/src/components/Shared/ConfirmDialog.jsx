export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', type = 'warning' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        {message && <p className="text-gray-600 mb-6">{message}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={onConfirm} className={`px-4 py-2 text-sm rounded-lg text-white ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
