import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import SessionChoiceDialog from "../components/SessionChoiceDialog";
import { createSession, startSessionListener, startActivityTracker } from "../utils/sessionManager";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

const Login = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para el diálogo de sesión
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn(identifier, password);

      // Verificar si necesita elegir sesión
      if (result.needsSessionChoice) {
        setPendingLogin(result);
        setShowSessionDialog(true);
        setLoading(false);
        return;
      }

      // Login exitoso
      navigate("/portal/dashboard");
    } catch (err) {
      // Specific errors for better UX
      console.error("Login error:", err);

      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Usuario o contraseña incorrectos");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Demasiados intentos fallidos. Intenta más tarde.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Error de conexión. Verifica tu internet.");
      } else if (err.message === "Credenciales inválidas") {
        setError("Usuario no encontrado");
      } else {
        setError("Error al iniciar sesión. Contacta al administrador.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Mantener sesión antigua (cancelar login nuevo)
  const handleKeepOldSession = async () => {
    try {
      // Cerrar sesión de Firebase del login nuevo
      await signOut(auth);

      setShowSessionDialog(false);
      setPendingLogin(null);
      setLoading(false);

      setError("Se mantuvo la sesión en el otro dispositivo. Cierra sesión allí primero.");
    } catch (error) {
      console.error("Error keeping old session:", error);
      setError("Error al procesar tu solicitud");
    }
  };

  // Usar sesión nueva (cerrar sesión antigua)
  const handleUseNewSession = async () => {
    try {
      const userId = pendingLogin.user.uid;

      // 1. Cerrar sesión antigua y crear nueva
      await createSession(userId, true);  // forceReplace = true

      // 2. Iniciar listeners manualmente (ya que AuthContext no lo hará automáticamente)
      // Esto es necesario porque el sessionListener no se inicia automáticamente
      // cuando no hay sesión local al momento del onAuthStateChanged
      startSessionListener(userId, (reason, details) => {
        // Si se detecta reemplazo de sesión, manejar
        console.log("[Login] Session invalidated:", reason);
        // Redirigir a login  
        window.location.href = "/portal/login";
      });

      startActivityTracker(userId);

      setShowSessionDialog(false);
      setPendingLogin(null);

      // 3. Continuar con el login
      navigate("/portal/dashboard");
    } catch (error) {
      console.error("Error switching session:", error);
      setError("Error al cambiar de sesión");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-gradient flex flex-col font-['Plus_Jakarta_Sans',sans-serif] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#0066cc]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#0066cc]/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 py-6">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="logo-circle w-12 h-12">
              <img src="/assets/logo.png" alt="Grupo AR" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-bold text-[#111518] text-lg">Grupo AR</span>
              <p className="text-xs text-[#60778a]">Portal Empresarial</p>
            </div>
          </Link>
          <Link to="/" className="text-sm text-[#60778a] hover:text-[#0066cc] transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Volver al Inicio
          </Link>
        </div>
      </header>

      {/* Form */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <form
            className="bg-white rounded-3xl border border-white/20 p-8 shadow-2xl space-y-6 animate-fade-in-up"
            onSubmit={handleSubmit}
          >
            <div className="text-center">
              <div className="logo-circle w-20 h-20 mx-auto mb-4 shadow-xl">
                <img src="/assets/logo.png" alt="Grupo AR" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-extrabold text-[#111518]">Acceso al Portal</h1>
              <p className="text-[#60778a] text-sm mt-2">
                Ingresa con tus credenciales corporativas
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#111518] mb-2">
                  Usuario o Correo
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="input-premium border-gray-300 focus:border-[#0066cc] focus:ring-[#0066cc]/20"
                  placeholder="usuario123"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#111518] mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-premium border-gray-300 focus:border-[#0066cc] focus:ring-[#0066cc]/20 pr-12"
                    placeholder="Tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0066cc] transition-colors"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <button
              className="w-full btn-primary justify-center text-base py-4"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Ingresando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">login</span>
                  Ingresar al Portal
                </>
              )}
            </button>

            <div className="text-center pt-4 border-t border-[#e5e7eb]">
              <p className="text-xs text-[#60778a]">
                ¿Problemas para acceder? Contacta al administrador.
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* Session Choice Dialog */}
      {showSessionDialog && (
        <SessionChoiceDialog
          existingSession={pendingLogin?.existingSession}
          onKeepOld={handleKeepOldSession}
          onUseNew={handleUseNewSession}
        />
      )}

      {/* Footer */}
      <footer className="relative z-10 py-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="logo-circle w-6 h-6">
              <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-semibold text-white">Grupo AR</span>
          </div>
          <p className="text-xs text-white">© {new Date().getFullYear()} Todos los derechos reservados</p>
        </div>
      </footer>
    </div>
  );
};

export default Login;
