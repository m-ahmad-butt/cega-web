import { X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title = 'Confirm', message = 'Are you sure?', confirmText = 'Confirm', danger = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-md animate-in fade-in slide-in-from-bottom-2 rounded-notion-lg bg-white p-6 shadow-notion-lg">
        <button onClick={onClose} className="absolute right-4 top-4 text-notion-muted hover:text-notion-text">
          <X size={18} />
        </button>
        <h3 className="mb-2 text-lg font-semibold text-notion-text">{title}</h3>
        <p className="mb-6 text-sm text-notion-muted">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="n-btn-secondary">Cancel</button>
          <button onClick={onConfirm} className={danger ? 'n-btn-danger' : 'n-btn'}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
