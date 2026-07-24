import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

/**
 * Modal Component - Sistema de notificaciones y diálogos custom
 * Reemplaza alert(), confirm(), y prompt() nativos del navegador
 */

// Gestor global de modales
class ModalManager {
    constructor() {
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    showAlert(message, type = 'info') {
        this.listeners.forEach(listener => listener({ type: 'alert', message, alertType: type }));
    }

    showConfirm(message, onConfirm, onCancel) {
        this.listeners.forEach(listener => listener({ type: 'confirm', message, onConfirm, onCancel }));
    }

    showPrompt(message, defaultValue, onConfirm, onCancel) {
        this.listeners.forEach(listener => listener({ type: 'prompt', message, defaultValue, onConfirm, onCancel }));
    }
}

export const modalManager = new ModalManager();

// Hook para usar el modal manager
export function useModal() {
    const [modal, setModal] = useState(null);

    useEffect(() => {
        const unsubscribe = modalManager.subscribe(setModal);
        return unsubscribe;
    }, []);

    const closeModal = () => setModal(null);

    return { modal, closeModal };
}

// Componente Modal
export function Modal({ modal, onClose }) {
    const [inputValue, setInputValue] = useState(modal?.defaultValue || '');

    useEffect(() => {
        if (modal) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
        return () => document.body.classList.remove('no-scroll');
    }, [modal]);

    if (!modal) return null;

    const handleConfirm = () => {
        if (modal.type === 'prompt') {
            modal.onConfirm?.(inputValue);
        } else {
            modal.onConfirm?.();
        }
        onClose();
    };

    const handleCancel = () => {
        modal.onCancel?.();
        onClose();
    };

    // Determinar icono y color según tipo
    const getIcon = () => {
        if (modal.type === 'confirm') return '❓';
        switch (modal.alertType) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    };

    const getColor = () => {
        if (modal.type === 'confirm') return 'blue';
        switch (modal.alertType) {
            case 'success': return 'green';
            case 'error': return 'red';
            case 'warning': return 'yellow';
            default: return 'blue';
        }
    };

    const colorClasses = {
        blue: 'bg-blue-50 text-blue-800 border-blue-200',
        green: 'bg-green-50 text-green-800 border-green-200',
        red: 'bg-red-50 text-red-800 border-red-200',
        yellow: 'bg-yellow-50 text-yellow-800 border-yellow-200'
    };

    const buttonClasses = {
        blue: 'bg-blue-600 hover:bg-blue-700',
        green: 'bg-green-600 hover:bg-green-700',
        red: 'bg-red-600 hover:bg-red-700',
        yellow: 'bg-yellow-600 hover:bg-yellow-700'
    };

    const color = getColor();

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center p-4 pt-20 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                {/* Header con icono */}
                <div className={`p-6 border-b ${colorClasses[color]} flex items-center gap-3`}>
                    <span className="text-3xl">{getIcon()}</span>
                    <h3 className="text-lg font-bold">
                        {modal.type === 'alert' ? 'Notificación' : modal.type === 'confirm' ? 'Confirmación' : 'Ingrese Valor'}
                    </h3>
                </div>

                {/* Cuerpo */}
                <div className="p-6">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">{modal.message}</p>

                    {/* Input para prompt */}
                    {modal.type === 'prompt' && (
                        <input
                            type="text"
                            className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                            autoFocus
                        />
                    )}
                </div>

                {/* Footer con botones */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    {modal.type === 'alert' ? (
                        <button
                            onClick={onClose}
                            className={`px-6 py-2.5 ${buttonClasses[color]} text-white rounded-lg font-bold text-sm transition-colors`}
                        >
                            Aceptar
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleCancel}
                                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`px-6 py-2.5 ${buttonClasses[color]} text-white rounded-lg font-bold text-sm transition-colors`}
                            >
                                {modal.type === 'confirm' ? 'Confirmar' : 'Aceptar'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// Funciones helper para usar en lugar de alert/confirm/prompt
export const showAlert = (message, type = 'info') => {
    modalManager.showAlert(message, type);
};

export const showConfirm = (message) => {
    return new Promise((resolve) => {
        modalManager.showConfirm(
            message,
            () => resolve(true),
            () => resolve(false)
        );
    });
};

export const showPrompt = (message, defaultValue = '') => {
    return new Promise((resolve) => {
        modalManager.showPrompt(
            message,
            defaultValue,
            (value) => resolve(value),
            () => resolve(null)
        );
    });
};
