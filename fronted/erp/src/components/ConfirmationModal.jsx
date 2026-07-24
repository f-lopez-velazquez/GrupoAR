export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", type = "danger" }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-fade-in">
                <h3 className="text-lg font-bold mb-2 text-[#111518]">{title}</h3>
                <p className="text-[#60778a] mb-6 text-sm">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-[#60778a] font-medium hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`px-4 py-2 text-white font-bold rounded-lg shadow-sm transition-transform hover:scale-[1.02] ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-blue-700'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
