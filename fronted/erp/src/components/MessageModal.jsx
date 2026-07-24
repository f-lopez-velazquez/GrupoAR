export default function MessageModal({ isOpen, onClose, title, message, buttonText = "Entendido", type = "info" }) {
    if (!isOpen) return null;

    const colors = {
        info: "text-blue-600",
        success: "text-green-600",
        error: "text-red-600",
        warning: "text-yellow-600"
    };

    const icons = {
        info: "info",
        success: "check_circle",
        error: "error",
        warning: "warning"
    };

    return (
        <div className="fixed inset-0 z-[75] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-fade-in text-center">
                <span className={`material-symbols-outlined text-4xl mb-4 ${colors[type]}`}>
                    {icons[type]}
                </span>
                <h3 className="text-xl font-bold mb-2 text-[#111518]">{title}</h3>
                <p className="text-[#60778a] mb-6 text-sm">{message}</p>
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-[#e7edf3] text-[#111518] font-bold rounded-xl hover:bg-[#dbe1e6] transition-colors"
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
}
