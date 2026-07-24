/**
 * PWA Installation Manager
 * Handles installation prompts and detection
 */

let deferredPrompt = null;
let isInstalled = false;

// Check if app is already installed
export const checkIfInstalled = () => {
    // Check for standalone mode (iOS)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

    isInstalled = isStandalone;
    return isInstalled;
};

// Initialize installation manager
export const initInstallManager = () => {
    checkIfInstalled();

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('[Install] beforeinstallprompt event fired');
        e.preventDefault();
        deferredPrompt = e;

        // Dispatch custom event to notify components
        window.dispatchEvent(new CustomEvent('installpromptready'));
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
        console.log('[Install] App installed successfully');
        isInstalled = true;
        deferredPrompt = null;

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('appinstalled'));
    });

    // Check if running in standalone mode
    if (checkIfInstalled()) {
        console.log('[Install] App is running in standalone mode');
    }
};

// Get the deferred prompt
export const getDeferredPrompt = () => {
    return deferredPrompt;
};

// Show install prompt
export const showInstallPrompt = async () => {
    if (!deferredPrompt) {
        console.warn('[Install] No deferred prompt available');
        return { outcome: 'no-prompt', userChoice: null };
    }

    try {
        // Show the prompt
        await deferredPrompt.prompt();

        // Wait for user choice
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[Install] User choice: ${outcome}`);

        // Clear the deferred prompt
        deferredPrompt = null;

        return { outcome, userChoice: outcome };
    } catch (error) {
        console.error('[Install] Error showing prompt:', error);
        return { outcome: 'error', userChoice: null, error };
    }
};

// Check if install prompt is available
export const isInstallPromptAvailable = () => {
    return deferredPrompt !== null && !isInstalled;
};

// Check if app is installed
export const getIsInstalled = () => {
    return isInstalled;
};

// Save install preference to localStorage
export const saveInstallPreference = (dismissed = false) => {
    const data = {
        dismissed,
        timestamp: Date.now()
    };
    localStorage.setItem('pwa-install-preference', JSON.stringify(data));
};

// Check if user dismissed install prompt recently
export const wasRecentlyDismissed = (dayThreshold = 7) => {
    const pref = localStorage.getItem('pwa-install-preference');
    if (!pref) return false;

    try {
        const data = JSON.parse(pref);
        if (!data.dismissed) return false;

        const daysSince = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
        return daysSince < dayThreshold;
    } catch {
        return false;
    }
};

// Get install instructions for iOS
export const getIOSInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (!isIOS) return null;

    return {
        isIOS: true,
        steps: [
            'Toca el botón de compartir en Safari',
            'Desplázate hacia abajo y selecciona "Agregar a pantalla de inicio"',
            'Toca "Agregar" en la esquina superior derecha'
        ]
    };
};
