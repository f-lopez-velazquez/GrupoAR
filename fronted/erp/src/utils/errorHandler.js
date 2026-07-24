/**
 * Centralized error handling with logging and user notifications
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";

// Error types
export const ErrorTypes = {
    NETWORK: "network",
    AUTH: "auth",
    PERMISSION: "permission",
    VALIDATION: "validation",
    SERVER: "server",
    UNKNOWN: "unknown"
};

// Classify error type
export const classifyError = (error) => {
    const message = error?.message?.toLowerCase() || "";
    const code = error?.code?.toLowerCase() || "";

    if (message.includes("network") || message.includes("offline") || message.includes("failed to fetch")) {
        return ErrorTypes.NETWORK;
    }
    if (code.includes("auth") || message.includes("authentication") || message.includes("unauthorized")) {
        return ErrorTypes.AUTH;
    }
    if (code.includes("permission") || message.includes("permission") || message.includes("forbidden")) {
        return ErrorTypes.PERMISSION;
    }
    if (message.includes("validation") || message.includes("invalid")) {
        return ErrorTypes.VALIDATION;
    }
    if (code.includes("internal") || message.includes("server")) {
        return ErrorTypes.SERVER;
    }
    return ErrorTypes.UNKNOWN;
};

// User-friendly error messages
const errorMessages = {
    [ErrorTypes.NETWORK]: "Error de conexión. Verifica tu internet e intenta de nuevo.",
    [ErrorTypes.AUTH]: "Sesión expirada. Por favor inicia sesión nuevamente.",
    [ErrorTypes.PERMISSION]: "No tienes permisos para realizar esta acción.",
    [ErrorTypes.VALIDATION]: "Datos inválidos. Revisa la información e intenta de nuevo.",
    [ErrorTypes.SERVER]: "Error del servidor. Intenta de nuevo más tarde.",
    [ErrorTypes.UNKNOWN]: "Ocurrió un error inesperado. Intenta de nuevo."
};

// Get user-friendly message
export const getUserFriendlyMessage = (error) => {
    const type = classifyError(error);
    return errorMessages[type];
};

// Log error to Firebase (with fallback to console)
export const logError = async (error, context = {}) => {
    const errorData = {
        message: error?.message || "Unknown error",
        code: error?.code || null,
        stack: error?.stack || null,
        type: classifyError(error),
        context: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...context
        },
        userId: auth.currentUser?.uid || null,
        timestamp: serverTimestamp(),
        resolved: false
    };

    // Always log to console in development
    console.error("[Error]", errorData);

    // Try to log to Firebase
    try {
        if (navigator.onLine) {
            await addDoc(collection(db, "errorLogs"), errorData);
        } else {
            // Store in localStorage for later sync
            const pendingErrors = JSON.parse(localStorage.getItem("pendingErrorLogs") || "[]");
            pendingErrors.push({ ...errorData, timestamp: Date.now() });
            localStorage.setItem("pendingErrorLogs", JSON.stringify(pendingErrors));
        }
    } catch (e) {
        console.error("Failed to log error to Firebase:", e);
    }

    return errorData;
};

// Sync pending error logs when back online
export const syncPendingErrorLogs = async () => {
    const pendingErrors = JSON.parse(localStorage.getItem("pendingErrorLogs") || "[]");
    if (pendingErrors.length === 0) return;

    const remaining = [];
    for (const error of pendingErrors) {
        try {
            await addDoc(collection(db, "errorLogs"), {
                ...error,
                timestamp: serverTimestamp(),
                syncedAt: serverTimestamp(),
                wasOffline: true
            });
        } catch (e) {
            remaining.push(error);
        }
    }

    localStorage.setItem("pendingErrorLogs", JSON.stringify(remaining));
};

// Handle error with toast notification
let toastContainer = null;

const getToastContainer = () => {
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    `;
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
};

export const showToast = (message, type = "error", duration = 5000) => {
    const container = getToastContainer();

    const toast = document.createElement("div");
    const colors = {
        error: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c", icon: "error" },
        success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", icon: "check_circle" },
        warning: { bg: "#fffbeb", border: "#fde68a", text: "#b45309", icon: "warning" },
        info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", icon: "info" }
    };

    const color = colors[type] || colors.error;

    toast.style.cssText = `
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: ${color.bg};
    border: 1px solid ${color.border};
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    animation: slideIn 0.3s ease-out;
    font-family: 'Plus Jakarta Sans', sans-serif;
  `;

    toast.innerHTML = `
    <span class="material-symbols-outlined" style="color: ${color.text}; font-size: 20px;">${color.icon}</span>
    <div style="flex: 1;">
      <p style="margin: 0; color: ${color.text}; font-size: 14px; font-weight: 500;">${message}</p>
    </div>
    <button style="background: none; border: none; cursor: pointer; color: ${color.text}; padding: 0;" onclick="this.parentElement.remove()">
      <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
    </button>
  `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease-out forwards";
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

// Add animation styles
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Main error handler function
export const handleError = async (error, context = {}, options = {}) => {
    const { silent = false, showUserMessage = true, customMessage = null } = options;

    // Log the error
    await logError(error, context);

    // Show toast unless silent
    if (showUserMessage && !silent) {
        const message = customMessage || getUserFriendlyMessage(error);
        showToast(message, "error");
    }

    // Handle specific error types
    const errorType = classifyError(error);

    if (errorType === ErrorTypes.AUTH) {
        // Redirect to login after a delay
        setTimeout(() => {
            window.location.href = "/portal/login";
        }, 2000);
    }

    return { type: errorType, handled: true };
};

// Promise wrapper with error handling
export const safeAsync = async (asyncFn, context = {}, fallback = null) => {
    try {
        return await asyncFn();
    } catch (error) {
        await handleError(error, context);
        return fallback;
    }
};

// Retry mechanism for network operations
export const withRetry = async (fn, maxRetries = 3, delayMs = 1000) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const errorType = classifyError(error);

            // Don't retry permission or validation errors
            if (errorType === ErrorTypes.PERMISSION || errorType === ErrorTypes.VALIDATION) {
                throw error;
            }

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
            }
        }
    }

    throw lastError;
};
