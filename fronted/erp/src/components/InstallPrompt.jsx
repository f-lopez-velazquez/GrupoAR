import { useState, useEffect } from "react";
import {
    initInstallManager,
    showInstallPrompt,
    isInstallPromptAvailable,
    getIsInstalled,
    saveInstallPreference,
    wasRecentlyDismissed,
    getIOSInstallInstructions
} from "../utils/installManager";

const InstallPrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    useEffect(() => {
        // Initialize the install manager
        initInstallManager();

        // Check if we should show the prompt
        const checkPrompt = () => {
            const available = isInstallPromptAvailable();
            const installed = getIsInstalled();
            const dismissed = wasRecentlyDismissed();

            // Show prompt if available, not installed, and not recently dismissed
            if (available && !installed && !dismissed) {
                // Delay showing the prompt a bit for better UX
                setTimeout(() => setShowPrompt(true), 3000);
            }
        };

        // Listen for install prompt ready
        const handlePromptReady = () => {
            checkPrompt();
        };

        // Listen for app installed
        const handleAppInstalled = () => {
            setShowPrompt(false);
            setIsInstalling(false);
        };

        window.addEventListener('installpromptready', handlePromptReady);
        window.addEventListener('appinstalled', handleAppInstalled);

        checkPrompt();

        return () => {
            window.removeEventListener('installpromptready', handlePromptReady);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstall = async () => {
        setIsInstalling(true);
        const result = await showInstallPrompt();

        if (result.outcome === 'accepted') {
            console.log('User accepted the install prompt');
            setShowPrompt(false);
        } else if (result.outcome === 'dismissed') {
            console.log('User dismissed the install prompt');
            handleDismiss();
        }

        setIsInstalling(false);
    };

    const handleDismiss = () => {
        saveInstallPreference(true);
        setShowPrompt(false);
    };

    const handleShowIOSInstructions = () => {
        const iosInfo = getIOSInstallInstructions();
        if (iosInfo) {
            setShowIOSInstructions(true);
        }
    };

    // Don't render if prompt shouldn't be shown
    if (!showPrompt && !showIOSInstructions) {
        return null;
    }

    // iOS Instructions Modal
    if (showIOSInstructions) {
        const iosInfo = getIOSInstallInstructions();
        return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-blue-600 text-2xl">install_mobile</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Instalar en iOS</h3>
                            <p className="text-sm text-gray-600">Sigue estos pasos para instalar la app:</p>
                        </div>
                        <button
                            onClick={() => setShowIOSInstructions(false)}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined text-gray-500">close</span>
                        </button>
                    </div>

                    <ol className="space-y-3 mb-6">
                        {iosInfo.steps.map((step, index) => (
                            <li key={index} className="flex gap-3 text-sm">
                                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                </span>
                                <span className="text-gray-700 pt-0.5">{step}</span>
                            </li>
                        ))}
                    </ol>

                    <button
                        onClick={() => setShowIOSInstructions(false)}
                        className="btn-primary w-full justify-center"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        );
    }

    // Android/Desktop Install Prompt
    return (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-40 animate-slide-up">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-2xl p-5 text-white">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-2xl">install_desktop</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1">Instalar Grupo AR ERP</h3>
                        <p className="text-sm text-blue-100 mb-4">
                            Instala nuestra app para acceso rápido y uso sin conexión
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={handleInstall}
                                disabled={isInstalling}
                                className="flex-1 bg-white text-blue-600 font-semibold py-2.5 px-4 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {isInstalling ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                        Instalando...
                                    </span>
                                ) : (
                                    'Instalar ahora'
                                )}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2.5 text-sm font-medium hover:bg-white/10 rounded-xl transition-colors"
                            >
                                Ahora no
                            </button>
                        </div>

                        {/* iOS fallback button */}
                        {getIOSInstallInstructions() && (
                            <button
                                onClick={handleShowIOSInstructions}
                                className="mt-3 w-full text-xs text-blue-100 hover:text-white underline text-left"
                            >
                                ¿Estás en iOS? Ver instrucciones
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
