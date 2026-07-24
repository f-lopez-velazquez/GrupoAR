import { createContext, useContext, useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "./AuthContext";

const SecurityContext = createContext();

export const useSecurity = () => useContext(SecurityContext);

export const SecurityProvider = ({ children }) => {
    const { profile, user } = useAuth(); // Add user to destructuring
    const [activeToken, setActiveToken] = useState("");

    // Auth Modal State (User entering token)
    const [authModal, setAuthModal] = useState({ isOpen: false, token: "", onConfirm: null });

    // Security Settings Modal State (Admin viewing/generating token)
    const [securityModal, setSecurityModal] = useState({ isOpen: false });

    // isSuperAdmin check
    const isSuperAdmin =
        profile?.role?.toUpperCase() === 'SUPERADMIN' ||
        profile?.role?.toUpperCase() === 'ADMIN' ||
        profile?.username === 'paco-gpoAR' ||
        profile?.username === 'paco-gpoGR';

    useEffect(() => {
        if (!user) return; // Wait for auth

        // Real-time listener for the token
        const unsub = onSnapshot(doc(db, "settings", "security"), (doc) => {
            if (doc.exists()) {
                setActiveToken(doc.data().token);
            }
        });
        return () => unsub();
    }, [user]);

    const generateToken = async () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        try {
            await setDoc(doc(db, "settings", "security"), { token: result }, { merge: true });
        } catch (e) {
            console.error("Error generating token:", e);
        }
    };

    /**
     * Protected Action Wrapper
     * Usage: validateAction(() => deleteItem(id));
     */
    // Generic Secure Action Executor
    const executeSecureAction = async (actionType, targetId, extraData = null, providedToken = null) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (isSuperAdmin) {
                    // Admin: Direct execution logic must be handled by caller OR we use the worker too for consistency?
                    // Ideally, use worker too for audit logs, BUT caller might have passed a function.
                    // This creates a divergence: 
                    // 1. Admin -> Runs Function Directly (Current Style)
                    // 2. Staff -> Runs Worker Request
                    // To support both, validateAction will take (callback, metadata)
                    // But wait, callback is client code. Metadata is for worker.
                    // We need to change the API of validateAction.
                    resolve(true);
                } else {
                    // Staff: Create Request
                    const docRef = await addDoc(collection(db, "secureActions"), {
                        action: actionType,
                        targetId: targetId,
                        extraData: extraData,
                        token: providedToken,
                        requestedBy: user.email,
                        status: "pending",
                        createdAt: serverTimestamp()
                    });

                    // Poll for completion
                    const unsub = onSnapshot(docRef, (snap) => {
                        const data = snap.data();
                        if (data?.status === 'completed') {
                            resolve(true);
                            unsub();
                        } else if (data?.status === 'error') {
                            reject(new Error(data.error));
                            unsub();
                        }
                    });
                }
            } catch (e) { reject(e); }
        });
    };

    /**
     * validateAction (Revised for Professional Security)
     * For Admin: Executes the callback immediately.
     * For Staff: Requires a token. Once entered, it executes the SECURE WORKER REQUEST.
     * 
     * Problem: The existing callbacks are client-side "deleteDoc" calls.
     * Solution: We must pass the ACTION METADATA to validateAction, not just a callback.
     * 
     * Usage: validateAction(
     *    async () => deleteDoc(...), // Admin Callback
     *    { type: 'delete_evaluation', id: '123' } // Worker Metadata
     * )
     */
    const validateAction = (actionCallback, workerMetadata = {}) => {
        if (isSuperAdmin) {
            actionCallback();
        } else {
            setAuthModal({
                isOpen: true,
                token: "",
                onConfirm: async (token) => {
                    if (token === activeToken) {
                        try {
                            // Execute the action first
                            await actionCallback();

                            // Then log it
                            await addDoc(collection(db, "secureActions"), {
                                action: workerMetadata.type || "unknown_action",
                                targetId: workerMetadata.id || "manual",
                                extraData: workerMetadata.extra || null,
                                token: token,
                                requestedBy: user.email,
                                status: "completed",
                                createdAt: serverTimestamp()
                            });
                        } catch (e) {
                            alert("Error al ejecutar acción: " + e.message);
                        }
                    } else {
                        alert("Token de seguridad incorrecto.");
                        // Log failed attempt
                        await addDoc(collection(db, "securityLogs"), {
                            action: workerMetadata.type || "failed_auth",
                            user: user.email,
                            attemptedToken: token,
                            timestamp: serverTimestamp()
                        });
                    }
                }
            });
        }
    };

    const openSecuritySettings = () => {
        if (isSuperAdmin) {
            setSecurityModal({ isOpen: true });
        }
    };

    return (
        <SecurityContext.Provider value={{
            activeToken,
            generateToken,
            validateAction,
            openSecuritySettings,
            isSuperAdmin
        }}>
            {children}

            {/* Global Auth Modal (Enter Token) */}
            {authModal.isOpen && (
                <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
                        <h3 className="text-lg font-bold mb-2 text-[#0B1B32]">Autorización Requerida</h3>
                        <p className="text-sm text-gray-500 mb-4">Esta acción requiere un token de seguridad.</p>
                        <input
                            type="password"
                            autoFocus
                            className="w-full border rounded-lg p-3 mb-4 font-mono text-center text-lg tracking-widest uppercase"
                            placeholder="TOKEN"
                            value={authModal.token}
                            onChange={e => setAuthModal({ ...authModal, token: e.target.value.toUpperCase() })}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    authModal.onConfirm(authModal.token);
                                    setAuthModal({ isOpen: false, token: "", onConfirm: null });
                                }
                            }}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setAuthModal({ isOpen: false, token: "", onConfirm: null })}
                                className="px-4 py-2 text-gray-500 font-bold text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    authModal.onConfirm(authModal.token);
                                    setAuthModal({ isOpen: false, token: "", onConfirm: null });
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Security Settings Modal (Admin View) */}
            {securityModal.isOpen && (
                <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-fade-in-up">
                        <div className="mb-4 flex flex-col items-center">
                            <div className="p-3 bg-blue-50 rounded-full mb-3">
                                <span className="material-symbols-outlined text-3xl text-blue-600">lock</span>
                            </div>
                            <h3 className="text-xl font-bold text-[#0B1B32]">Token de Seguridad</h3>
                            <p className="text-sm text-gray-500 mt-1">Comparte este token con el personal autorizado.</p>
                        </div>

                        <div className="bg-gray-100 rounded-xl p-6 mb-6 relative group cursor-pointer" onClick={() => navigator.clipboard.writeText(activeToken)}>
                            <p className="font-mono text-3xl font-black tracking-[0.5em] text-[#0B1B32] select-all">
                                {activeToken || "------"}
                            </p>
                            <span className="absolute bottom-2 right-2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Click para copiar</span>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={generateToken}
                                className="w-full py-3 bg-[#0B1B32] text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">refresh</span>
                                Generar Nuevo Token
                            </button>
                            <button
                                onClick={() => setSecurityModal({ isOpen: false })}
                                className="w-full py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SecurityContext.Provider>
    );
};
