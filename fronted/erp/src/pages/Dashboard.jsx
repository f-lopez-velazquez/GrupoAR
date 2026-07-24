import { Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { Roles } from "../utils/roles";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/firebase";

export default function Dashboard() {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState({
    employees: 0, projects: 0, inventory: 0, pendingPayments: 0,
    lowStock: 0, activeLoans: 0
  });
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === Roles.ADMIN || profile?.username === "paco-gpoAR" || profile?.role === "SUPERADMIN";
  const permissions = profile?.permissions || {};
  const hasPermission = (perm) => {
    if (isAdmin) return true;
    if (Array.isArray(permissions)) return permissions.includes(perm);
    return (permissions[perm] || 0) > 0;
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [empSnap, projSnap, invSnap, salesSnap, loansSnap] = await Promise.all([
        getDocs(collection(db, "employees")),
        getDocs(query(collection(db, "projects"), where("status", "==", "active"))),
        getDocs(collection(db, "inventory")),
        getDocs(query(collection(db, "sales"), where("status", "==", "completed"), orderBy("createdAt", "desc"), limit(5))),
        getDocs(query(collection(db, "warehouseLoans"), where("status", "==", "active")))
      ]);

      const inv = invSnap.docs.map(d => d.data());
      const lowStock = inv.filter(p => (p.stock || 0) < (p.minStock || 5)).length;

      setStats({
        employees: empSnap.size,
        projects: projSnap.size,
        inventory: invSnap.size,
        lowStock,
        activeLoans: loansSnap.size
      });

      setRecentSales(salesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const modules = [
    { id: "frontend", label: "Gestor de Contenidos", icon: "web", path: "/portal/frontend", color: "bg-purple-500", desc: "Administra el contenido público" },
    { id: "hr", label: "Recursos Humanos", icon: "groups", path: "/portal/rrhh", color: "bg-blue-500", desc: "Gestión de empleados y gafetes" },
    { id: "evaluations", label: "Evaluaciones", icon: "assessment", path: "/portal/evaluaciones", color: "bg-indigo-500", desc: "Desempeño y nómina semanal" },
    { id: "projects", label: "Control de Obras", icon: "construction", path: "/portal/obras", color: "bg-orange-500", desc: "Proyectos y facturación" },
    { id: "pos", label: "Terminal POS", icon: "point_of_sale", path: "/portal/pos", color: "bg-green-500", desc: "Ventas y tickets" },
    { id: "inventory", label: "Inventario", icon: "inventory", path: "/portal/inventario", color: "bg-teal-500", desc: "Gestión de productos" },
    { id: "warehouse", label: "Almacén", icon: "warehouse", path: "/portal/almacen", color: "bg-amber-500", desc: "Préstamos de herramientas" },
    { id: "marketing", label: "Marketing", icon: "campaign", path: "/portal/marketing", color: "bg-pink-500", desc: "Publicaciones y prospección" },
    { id: "finance", label: "Finanzas", icon: "account_balance", path: "/portal/finanzas", color: "bg-emerald-500", desc: "Ingresos y gastos" },
    { id: "users", label: "Usuarios", icon: "manage_accounts", path: "/portal/usuarios", color: "bg-red-500", desc: "Permisos y accesos" }
  ];

  const visibleModules = modules.filter(m => hasPermission(m.id));

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">¡Bienvenido, {profile?.displayName || "Usuario"}!</h1>
        <p className="text-white/80">Sistema ERP de Grupo AR - Panel de Control</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Empleados" value={stats.employees} icon="badge" />
        <StatCard label="Obras Activas" value={stats.projects} icon="engineering" />
        <StatCard label="Productos" value={stats.inventory} icon="category" danger={stats.lowStock > 0} subtext={stats.lowStock > 0 ? `${stats.lowStock} stock bajo` : null} />
        <StatCard label="Préstamos Activos" value={stats.activeLoans} icon="handshake" />
      </div>

      {/* Quick Access Modules */}
      <div>
        <h2 className="text-lg font-bold text-[#111518] mb-4">Acceso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {visibleModules.map((mod) => (
            <Link
              key={mod.id}
              to={mod.path}
              className="group bg-white rounded-xl border border-[#e5e7eb] p-4 hover:shadow-lg hover:border-primary/30 transition-all"
            >
              <div className={`w-12 h-12 rounded-xl ${mod.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined text-white text-2xl">{mod.icon}</span>
              </div>
              <h3 className="font-bold text-sm text-[#111518] mb-1">{mod.label}</h3>
              <p className="text-xs text-[#60778a] line-clamp-2">{mod.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-[#111518]">Ventas Recientes</h3>
            <Link to="/portal/pos" className="text-xs text-primary font-medium">Ver más →</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentSales.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Sin ventas recientes</div>
            ) : recentSales.map((sale) => (
              <div key={sale.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">Ticket #{sale.folio || sale.id.slice(-6)}</p>
                  <p className="text-xs text-[#60778a]">{sale.items?.length || 0} productos</p>
                </div>
                <p className="font-bold text-green-600">${(sale.total || 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-[#111518]">Acciones Rápidas</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {hasPermission("pos") && (
              <Link to="/portal/pos" className="flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                <span className="material-symbols-outlined text-green-600">point_of_sale</span>
                <span className="text-sm font-medium text-green-700">Nueva Venta</span>
              </Link>
            )}
            {hasPermission("hr") && (
              <Link to="/portal/rrhh" className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                <span className="material-symbols-outlined text-blue-600">person_add</span>
                <span className="text-sm font-medium text-blue-700">Nuevo Empleado</span>
              </Link>
            )}
            {hasPermission("projects") && (
              <Link to="/portal/obras" className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
                <span className="material-symbols-outlined text-orange-600">add_home_work</span>
                <span className="text-sm font-medium text-orange-700">Nueva Obra</span>
              </Link>
            )}
            {hasPermission("evaluations") && (
              <Link to="/portal/evaluaciones" className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
                <span className="material-symbols-outlined text-purple-600">rate_review</span>
                <span className="text-sm font-medium text-purple-700">Evaluar Semana</span>
              </Link>
            )}
            {hasPermission("warehouse") && (
              <Link to="/portal/almacen" className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
                <span className="material-symbols-outlined text-amber-600">output</span>
                <span className="text-sm font-medium text-amber-700">Salida Almacén</span>
              </Link>
            )}
            {hasPermission("finance") && (
              <Link to="/portal/finanzas" className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors">
                <span className="material-symbols-outlined text-emerald-600">payments</span>
                <span className="text-sm font-medium text-emerald-700">Registrar Gasto</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, danger, subtext }) {
  return (
    <div className={`bg-white rounded-xl border border-[#e5e7eb] p-5 ${danger ? 'relative overflow-hidden' : ''}`}>
      {danger && <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[#60778a] text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold text-[#111518]">{value}</p>
          {subtext && <p className="text-xs text-red-500 mt-1">{subtext}</p>}
        </div>
        <span className={`material-symbols-outlined text-2xl ${danger ? 'text-red-400' : 'text-primary/40'}`}>{icon}</span>
      </div>
    </div>
  );
}
