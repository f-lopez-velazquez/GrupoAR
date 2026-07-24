import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

const normalizeRole = (role) => (role || "").toLowerCase();

export const RequireRole = ({ allowed, children }) => {
  const { role, loading, user } = useAuth();

  if (loading) {
    return <div className="page"><p>Cargando sesión...</p></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowedSet = new Set((allowed || []).map((r) => normalizeRole(r)));
  if (allowedSet.size > 0 && !allowedSet.has(normalizeRole(role))) {
    return (
      <div className="page">
        <h2>Acceso restringido</h2>
        <p>No tienes permisos para ver este modulo.</p>
      </div>
    );
  }

  return children;
};
