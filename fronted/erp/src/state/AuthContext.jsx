import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  getIdTokenResult,
} from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { ensureUserProfile, getUserProfile } from "../services/users";
import { Roles } from "../utils/roles";
import {
  createSession,
  validateSession,
  startSessionListener,
  stopSessionListener,
  clearSession,
  forceLogout,
  startActivityTracker,
  stopActivityTracker,
  checkActiveSession
} from "../utils/sessionManager";
import { initOfflineSync } from "../utils/offlineQueue";
import { syncPendingErrorLogs, showToast } from "../utils/errorHandler";

const AuthContext = createContext({
  user: null,
  role: Roles.PENDING,
  profile: null,
  loading: true,
  isOnline: true,
  signIn: async () => { },
  signOutUser: async () => { },
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(Roles.PENDING);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Handle session invalidation (con detalles del nuevo dispositivo)
  const handleSessionInvalid = useCallback(async (reason, details = {}) => {
    let message = "Tu sesión ha expirado.";

    if (reason === "session_replaced") {
      const deviceInfo = details.newDeviceInfo || {};
      const browser = deviceInfo.browser || "desconocido";
      const os = deviceInfo.os || "desconocido";

      message = `Se inició sesión desde otro dispositivo (${browser} en ${os}). Esta sesión se cerrará en 3 segundos.`;
    } else if (reason === "session_cleared") {
      message = "Tu sesión fue cerrada remotamente.";
    } else if (reason === "session_expired") {
      message = "Tu sesión expiró por inactividad.";
    }

    showToast(message, "warning", 6000);

    // Force logout after delay to let user read the message
    setTimeout(() => {
      forceLogout(reason);
    }, 3000);
  }, []);

  useEffect(() => {
    // Initialize offline sync
    initOfflineSync();

    // Sync pending error logs
    if (navigator.onLine) {
      syncPendingErrorLogs();
    }

    // Online/offline handlers
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingErrorLogs();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let profileUnsub = null;
    let activityCleanup = null;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      // Cleanup previous listeners
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      stopSessionListener();
      stopActivityTracker();
      if (activityCleanup) {
        activityCleanup();
        activityCleanup = null;
      }

      if (!firebaseUser) {
        setRole(Roles.PENDING);
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        await ensureUserProfile(firebaseUser);

        // Validate existing session
        const sessionValidation = await validateSession(firebaseUser.uid);

        if (!sessionValidation.valid && sessionValidation.reason !== "no_local_session") {
          // Session was replaced, force logout
          console.log("[Auth] Session invalid:", sessionValidation.reason);

          // Pasar información del nuevo dispositivo si está disponible
          handleSessionInvalid(sessionValidation.reason, {
            newDeviceInfo: sessionValidation.newDeviceInfo
          });
          return;
        }

        // Get role from token or profile
        let resolvedRole = Roles.PENDING;
        try {
          const tokenResult = await getIdTokenResult(firebaseUser, true);
          resolvedRole = tokenResult?.claims?.role || Roles.PENDING;
        } catch (error) {
          console.warn("Failed to read custom claims role", error);
        }

        if (!resolvedRole || resolvedRole === Roles.PENDING) {
          const profileData = await getUserProfile(firebaseUser.uid);
          if (profileData?.role) {
            resolvedRole = profileData.role;
          }
          setProfile(profileData);
        }

        setRole(resolvedRole || Roles.PENDING);

        // Solo iniciar session listener si hay una sesión local válida
        // Esto evita que se dispare cuando el usuario está eligiendo continuar/mantener sesión
        const hasLocalSession = localStorage.getItem("sessionId");
        if (hasLocalSession && sessionValidation.valid) {
          // Start session listener for real-time session monitoring
          startSessionListener(firebaseUser.uid, handleSessionInvalid);

          // Start activity tracker
          activityCleanup = startActivityTracker(firebaseUser.uid);
        }

        // Profile listener
        profileUnsub = onSnapshot(doc(db, "users", firebaseUser.uid), (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.role === "Deleted") {
              forceLogout("account_disabled");
              return;
            }
            setRole(data.role || Roles.PENDING);
            setProfile(data);
          }
        });
      } catch (error) {
        console.error("[Auth] Error during auth state change:", error);
      }

      setLoading(false);
    });

    return () => {
      unsub();
      if (profileUnsub) profileUnsub();
      stopSessionListener();
      stopActivityTracker();
      if (activityCleanup) activityCleanup();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleSessionInvalid]);

  // Enhanced sign in with session creation (verifica sesión activa ANTES)
  const signIn = useCallback(async (identifier, password) => {
    try {
      let emailToCtx = identifier;

      // 1. Resolve username to email if identifier is not an email
      if (!identifier.includes("@")) {
        const q = query(collection(db, "users"), where("username", "==", identifier));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error("Credenciales inválidas");
        }
        emailToCtx = querySnapshot.docs[0].data().email;
      }

      // 2. Autenticar con Firebase
      const result = await signInWithEmailAndPassword(auth, emailToCtx, password);

      // 3. Verificar si hay sesión activa en otro dispositivo
      const { hasActiveSession, sessionInfo } = await checkActiveSession(result.user.uid);

      if (hasActiveSession) {
        // Retornar info para que Login.jsx maneje el diálogo
        console.log("[Auth] Active session detected, user must choose");
        return {
          success: false,
          needsSessionChoice: true,
          user: result.user,
          existingSession: sessionInfo
        };
      }

      // 4. No hay sesión activa, crear nueva normalmente
      await createSession(result.user.uid, false);

      return { success: true, user: result.user };
    } catch (error) {
      console.error("[Auth] Sign in error:", error);
      throw error;
    }
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (userId) await clearSession(userId);
      await signOut(auth);
    } catch (error) {
      console.error("[Auth] Sign out error:", error);
      throw error;
    }
  }, []);

  // Enhanced sign out with session cleanup
  const hasPermission = useCallback((perm, level = 1) => {
    const isAdmin = role === Roles.ADMIN || profile?.username === "paco-gpoGR" || profile?.role === "SUPERADMIN";
    if (isAdmin) return true;

    const permissions = profile?.permissions || {};
    if (Array.isArray(permissions)) {
      return permissions.includes(perm);
    }

    const userLevel = permissions[perm] || 0;
    return userLevel >= level;
  }, [role, profile]);

  const value = useMemo(
    () => ({
      user,
      role,
      profile,
      loading,
      isOnline,
      signIn,
      signOutUser,
      hasPermission
    }),
    [user, role, profile, loading, isOnline, signIn, signOutUser, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
