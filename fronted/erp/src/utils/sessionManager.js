/**
 * Session management for single-device login
 */

import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import { generateSessionId, getDeviceFingerprint } from "./security";

let currentSessionId = null;
let sessionListener = null;

// Create new session (con opción de forzar reemplazo de sesión anterior)
export const createSession = async (userId, forceReplace = false) => {
    const sessionId = generateSessionId();
    const deviceInfo = getDeviceFingerprint();

    try {
        const userRef = doc(db, "users", userId);

        let previousSession = null;

        // Solo verificar y reemplazar si forceReplace es true
        if (forceReplace) {
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                previousSession = userDoc.data()?.activeSession;
            }

            // Crear entrada de historial para sesión anterior (si existe)
            if (previousSession) {
                const sessionHistoryRef = doc(db, "users", userId, "sessions", previousSession.sessionId);
                await setDoc(sessionHistoryRef, {
                    ...previousSession,
                    endedAt: serverTimestamp(),
                    status: "replaced",
                    replacedBy: sessionId
                }, { merge: true });

                console.log("[Session] Previous session marked as replaced:", previousSession.sessionId);
            }
        }

        // Crear nueva sesión activa
        await updateDoc(userRef, {
            activeSession: {
                sessionId,
                deviceInfo,
                createdAt: serverTimestamp(),
                lastActive: serverTimestamp()
            }
        });

        // Crear entrada en historial para nueva sesión
        const newSessionRef = doc(db, "users", userId, "sessions", sessionId);
        await setDoc(newSessionRef, {
            sessionId,
            deviceInfo,
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp(),
            status: "active"
        });

        currentSessionId = sessionId;
        localStorage.setItem("sessionId", sessionId);

        console.log("[Session] Created new session:", sessionId);
        return sessionId;
    } catch (error) {
        console.error("[Session] Failed to create session:", error);
        throw error;
    }
};

// Validate current session (retorna info del nuevo dispositivo si fue reemplazada)
export const validateSession = async (userId) => {
    const storedSessionId = localStorage.getItem("sessionId");

    if (!storedSessionId) {
        return { valid: false, reason: "no_local_session" };
    }

    try {
        const userDoc = await getDoc(doc(db, "users", userId));

        if (!userDoc.exists()) {
            return { valid: false, reason: "user_not_found" };
        }

        const activeSession = userDoc.data()?.activeSession;

        if (!activeSession) {
            return { valid: false, reason: "no_active_session" };
        }

        if (activeSession.sessionId !== storedSessionId) {
            // Sesión reemplazada - retornar info del nuevo dispositivo
            return {
                valid: false,
                reason: "session_replaced",
                newDeviceInfo: activeSession.deviceInfo  // Info del nuevo dispositivo
            };
        }

        return { valid: true, session: activeSession };
    } catch (error) {
        console.error("[Session] Validation error:", error);
        return { valid: false, reason: "validation_error", error };
    }
};

/**
 * Verifica si un usuario tiene una sesión activa ANTES de crear una nueva
 * Útil para detectar sesiones en otros dispositivos antes del login
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} - { hasActiveSession: boolean, sessionInfo: object }
 */
export const checkActiveSession = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));

        if (!userDoc.exists()) {
            return { hasActiveSession: false, sessionInfo: null };
        }

        const activeSession = userDoc.data()?.activeSession;

        if (!activeSession || !activeSession.sessionId) {
            return { hasActiveSession: false, sessionInfo: null };
        }

        // Verificar que la sesión no sea de este mismo dispositivo (para evitar falsos positivos)
        const currentSessionId = localStorage.getItem("sessionId");
        if (currentSessionId && activeSession.sessionId === currentSessionId) {
            // Es la sesión de este dispositivo, no hay conflicto
            console.log("[Session] Current device session detected, no conflict");
            return { hasActiveSession: false, sessionInfo: activeSession };
        }

        // Hay una sesión activa en otro dispositivo
        console.log("[Session] Active session detected on another device:", activeSession.deviceInfo);
        return {
            hasActiveSession: true,
            sessionInfo: activeSession
        };
    } catch (error) {
        console.error("[Session] Error checking active session:", error);
        return { hasActiveSession: false, sessionInfo: null, error };
    }
};

// Update last active timestamp
export const updateSessionActivity = async (userId) => {
    if (!currentSessionId) return;

    try {
        await updateDoc(doc(db, "users", userId), {
            "activeSession.lastActive": serverTimestamp()
        });
    } catch (error) {
        console.error("[Session] Failed to update activity:", error);
    }
};

// Start listening for session changes
export const startSessionListener = (userId, onSessionInvalid) => {
    if (sessionListener) {
        sessionListener();
    }

    sessionListener = onSnapshot(doc(db, "users", userId), (snapshot) => {
        if (!snapshot.exists()) return;

        const activeSession = snapshot.data()?.activeSession;
        const storedSessionId = localStorage.getItem("sessionId");

        // Session was replaced by another login
        if (activeSession && activeSession.sessionId !== storedSessionId) {
            console.log("[Session] Session replaced by another device");
            onSessionInvalid("session_replaced");
        }

        // Session was cleared (logged out elsewhere)
        if (!activeSession && storedSessionId) {
            console.log("[Session] Session was cleared");
            onSessionInvalid("session_cleared");
        }
    });

    return sessionListener;
};

// Stop session listener
export const stopSessionListener = () => {
    if (sessionListener) {
        sessionListener();
        sessionListener = null;
    }
};

// Clear session (con motivo para historial)
export const clearSession = async (userId, reason = "manual_logout") => {
    stopSessionListener();
    const sessionId = currentSessionId || localStorage.getItem("sessionId");

    currentSessionId = null;
    localStorage.removeItem("sessionId");

    if (userId && sessionId) {
        try {
            // Marcar sesión como terminada en historial
            const sessionHistoryRef = doc(db, "users", userId, "sessions", sessionId);
            const sessionDoc = await getDoc(sessionHistoryRef);

            if (sessionDoc.exists()) {
                await updateDoc(sessionHistoryRef, {
                    endedAt: serverTimestamp(),
                    status: reason
                });
            }

            // Limpiar sesión activa
            await updateDoc(doc(db, "users", userId), {
                activeSession: null
            });

            console.log("[Session] Cleared session:", sessionId, "reason:", reason);
        } catch (error) {
            console.error("[Session] Failed to clear session:", error);
        }
    }
};

// Force logout with message
export const forceLogout = async (reason = "session_invalid") => {
    const user = auth.currentUser;

    if (user) {
        await clearSession(user.uid);
    }

    localStorage.setItem("logoutReason", reason);

    // Import signOut to avoid circular dependency
    const { signOut } = await import("firebase/auth");
    await signOut(auth);

    window.location.href = "/portal/login";
};

// Get logout reason (for displaying message after redirect)
export const getLogoutReason = () => {
    const reason = localStorage.getItem("logoutReason");
    localStorage.removeItem("logoutReason");
    return reason;
};

/**
 * Obtiene historial de sesiones de un usuario
 * @param {string} userId - ID del usuario
 * @param {number} limitCount - Número máximo de sesiones a retornar
 * @returns {Promise<Array>} - Historial de sesiones ordenadas por fecha
 */
export const getSessionHistory = async (userId, limitCount = 10) => {
    try {
        const sessionsRef = collection(db, "users", userId, "sessions");
        const q = query(sessionsRef, orderBy("createdAt", "desc"), limit(limitCount));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("[Session] Failed to get session history:", error);
        return [];
    }
};

// Session activity tracker
let activityInterval = null;

export const startActivityTracker = (userId) => {
    // Update activity every 5 minutes
    activityInterval = setInterval(() => {
        if (navigator.onLine) {
            updateSessionActivity(userId);
        }
    }, 5 * 60 * 1000);

    // Update on user interaction
    const updateOnActivity = () => {
        if (navigator.onLine) {
            updateSessionActivity(userId);
        }
    };

    document.addEventListener("click", updateOnActivity, { passive: true });
    document.addEventListener("keydown", updateOnActivity, { passive: true });

    return () => {
        clearInterval(activityInterval);
        document.removeEventListener("click", updateOnActivity);
        document.removeEventListener("keydown", updateOnActivity);
    };
};

export const stopActivityTracker = () => {
    if (activityInterval) {
        clearInterval(activityInterval);
        activityInterval = null;
    }
};
