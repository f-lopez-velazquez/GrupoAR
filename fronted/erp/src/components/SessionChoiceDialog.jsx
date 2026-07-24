import { useState } from 'react';

/**
 * Diálogo para que usuario elija dónde mantener su sesión activa
 * cuando se detecta una sesión en otro dispositivo
 */
export default function SessionChoiceDialog({
    existingSession,
    onKeepOld,
    onUseNew
}) {
    const [loading, setLoading] = useState(false);

    const deviceInfo = existingSession?.deviceInfo || {};
    const browser = deviceInfo.browser || 'Navegador desconocido';
    const os = deviceInfo.os || 'Sistema desconocido';

    const handleKeepOld = async () => {
        setLoading(true);
        try {
            await onKeepOld();
        } finally {
            setLoading(false);
        }
    };

    const handleUseNew = async () => {
        setLoading(true);
        try {
            await onUseNew();
        } catch (error) {
            console.error("Error switching session:", error);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
                {/* Icono de alerta */}
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-4xl text-orange-600">devices</span>
                </div>

                {/* Título */}
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                    Sesión Activa Detectada
                </h2>

                {/* Mensaje */}
                <p className="text-gray-600 text-center mb-6">
                    Ya tienes una sesión activa en otro dispositivo:
                </p>

                {/* Info del dispositivo */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="material-symbols-outlined text-blue-600">computer</span>
                        <span className="font-semibold text-gray-900">{browser}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-600">dns</span>
                        <span className="text-gray-700">{os}</span>
                    </div>
                </div>

                {/* Pregunta */}
                <p className="text-gray-800 font-medium text-center mb-6">
                    ¿Dónde quieres mantener tu sesión activa?
                </p>

                {/* Botones */}
                <div className="space-y-3">
                    <button
                        onClick={handleUseNew}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Cerrando sesión anterior...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-xl">login</span>
                                Continuar aquí (cerrar sesión anterior)
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleKeepOld}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-xl">block</span>
                        Mantener sesión anterior
                    </button>
                </div>

                {/* Nota de seguridad */}
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-yellow-600 text-sm mt-0.5">info</span>
                        <p className="text-xs text-yellow-800">
                            Por seguridad, solo puedes tener una sesión activa a la vez en todo el sistema.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
