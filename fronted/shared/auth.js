import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { recordLoginEvent } from "./audit.js";

const buildOverlay = () => {
  const overlay = document.createElement("div");
  overlay.id = "authOverlay";
  overlay.className =
    "fixed inset-0 z-[100] hidden items-center justify-center bg-[#0b0f1f]/80 p-6";

  overlay.innerHTML = `
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <div class="mb-6 text-center">
        <h2 class="text-xl font-bold text-slate-900">Acceso seguro</h2>
        <p class="mt-1 text-sm text-slate-500">Inicia sesión con tu cuenta de Grupo AR</p>
      </div>
      <form class="flex flex-col gap-4" id="authForm">
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Usuario (sin correo)
          <input
            id="authEmail"
            type="text"
            required
            autocomplete="username"
            class="h-11 rounded-lg border border-slate-200 px-3 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/30"
            placeholder="paco-GPOAR"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Contraseña
          <input
            id="authPassword"
            type="password"
            required
            autocomplete="current-password"
            class="h-11 rounded-lg border border-slate-200 px-3 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/30"
            placeholder="********"
          />
        </label>
        <button
          id="authSubmit"
          type="submit"
          class="h-11 rounded-lg bg-primary text-white font-bold hover:bg-blue-700 transition-colors"
        >
          Entrar
        </button>
      </form>
      <div class="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span id="authStatus">Solo personal autorizado.</span>
        <button id="authSignOut" class="hidden text-primary hover:underline">Salir</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  return overlay;
};

const ensureUserDoc = async (user) => {
  if (!user) return null;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email || null,
      displayName: user.displayName || null,
      role: "Pending",
      createdAt: serverTimestamp(),
    });
    return { id: user.uid, role: "Pending", email: user.email || null };
  }
  return { id: snap.id, ...snap.data() };
};

export const ensureAuth = ({ allowRoles = [], allowPermissions = [] } = {}) =>
  new Promise((resolve) => {
    const overlay = document.getElementById("authOverlay") || buildOverlay();
    const form = overlay.querySelector("#authForm");
    const emailInput = overlay.querySelector("#authEmail");
    const passwordInput = overlay.querySelector("#authPassword");
    const status = overlay.querySelector("#authStatus");
    const signOutBtn = overlay.querySelector("#authSignOut");

    const showOverlay = (message) => {
      if (message) status.textContent = message;
      overlay.classList.remove("hidden");
      overlay.classList.add("flex");
    };

    const hideOverlay = () => {
      overlay.classList.add("hidden");
      overlay.classList.remove("flex");
    };

    const handleUser = async (user) => {
      if (!user) {
        signOutBtn.classList.add("hidden");
        showOverlay("Inicia sesión para continuar.");
        return;
      }
      const profile = await ensureUserDoc(user);
      const role = profile?.role || "Pending";
      const permissions = Array.isArray(profile?.permissions) ? profile.permissions : [];
      const hasRole = allowRoles.length === 0 || allowRoles.includes(role);
      const hasPermission =
        allowPermissions.length === 0 ||
        permissions.some((permission) => allowPermissions.includes(permission));

      if (role === "Admin") {
        hideOverlay();
        recordLoginEvent();
        resolve({ user, role, profile });
        return;
      }

      if ((allowRoles.length > 0 || allowPermissions.length > 0) && !(hasRole || hasPermission)) {
        signOutBtn.classList.remove("hidden");
        showOverlay("Acceso restringido para este rol.");
        return;
      }
      hideOverlay();
      recordLoginEvent();
      resolve({ user, role, profile });
    };

    onAuthStateChanged(auth, handleUser);

    const DEFAULT_LOGIN_DOMAIN = "grupoar.com";
    const normalizeLogin = (value) => {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "";
      if (trimmed.includes("@")) return trimmed;
      return `${trimmed}@${DEFAULT_LOGIN_DOMAIN}`;
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "Verificando...";
      try {
        const email = normalizeLogin(emailInput.value);
        if (!email || !passwordInput.value) {
          status.textContent = "Completa usuario y contraseña.";
          return;
        }
        await signInWithEmailAndPassword(auth, email, passwordInput.value);
      } catch (error) {
        status.textContent = error.message || "No se pudo iniciar sesión.";
      }
    });

    signOutBtn.addEventListener("click", async () => {
      await signOut(auth);
    });
  });
