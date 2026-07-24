import { useAuth } from "../state/AuthContext";
import { Navigate } from "react-router-dom";

export function RequirePermission({ permission, level = 1, children }) {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-slate-400">Cargando...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/portal/login" replace />;
    }

    // Superadmin logic
    const isSuperAdmin = profile?.role === "Admin" || profile?.username === "paco-gpoGR" || profile?.role === "SUPERADMIN";

    if (isSuperAdmin) {
        return children;
    }

    // Check specific permission level
    // profile.permissions is now an object { module: level }
    const userPermissions = profile?.permissions || {};
    const userLevel = userPermissions[permission] || 0;

    if (userLevel < level) {
        return (
            <div className="flex h-screen flex-col items-center justify-center text-center px-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500">
                    <span className="material-symbols-outlined text-3xl">lock</span>
                </div>
                <h1 className="mt-4 text-xl font-bold text-slate-800">Acceso Denegado</h1>
                <p className="mt-2 text-sm text-slate-500">
                    No tienes los privilegios necesarios ({level === 2 ? 'EDITAR' : 'VER'}) para esta sección.
                </p>
                <a href="/portal/dashboard" className="mt-4 text-sm text-sky-600 hover:underline">
                    Volver al inicio
                </a>
            </div>
        );
    }

    return children;
}
