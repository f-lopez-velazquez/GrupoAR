import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { useSecurity } from "../state/SecurityContext";
import { RoleLabels, Roles } from "../utils/roles";
import { useState, useEffect } from "react";
import InstallPrompt from "./InstallPrompt";
import { GlobalHelp } from "./GlobalHelp";

const NavItem = ({ to, children, icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 " +
      (isActive
        ? "bg-gradient-to-r from-[#0066cc] to-[#0099ff] text-white shadow-md"
        : "text-[#60778a] hover:bg-[#f8fafc] hover:text-[#111518]")
    }
  >
    {icon && <span className="material-symbols-outlined text-[20px]">{icon}</span>}
    {children}
  </NavLink>
);

const SidebarSection = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="px-3 text-[10px] uppercase tracking-wider text-[#60778a]/60 font-bold mb-2">{title}</h3>
    <div className="space-y-1">{children}</div>
  </div>
);

export const Layout = ({ children }) => {
  const { role, user, profile, signOutUser } = useAuth();
  const { openSecuritySettings, isSuperAdmin } = useSecurity();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isAdmin = role === Roles.ADMIN || profile?.username === "paco-gpoAR" || profile?.role === "SUPERADMIN";
  const permissions = profile?.permissions || {};

  const hasPermission = (perm) => {
    if (isAdmin) return true;
    if (Array.isArray(permissions)) return permissions.includes(perm);
    return (permissions[perm] || 0) > 0;
  };

  const getPageTitle = (path) => {
    const titles = {
      "dashboard": "Panel Principal",
      "frontend": "Gestor de Contenidos",
      "rrhh": "Recursos Humanos",
      "obras": "Control de Obras",
      "evaluaciones": "Evaluaciones & Nómina",
      "pos": "Terminal POS",
      "inventario": "Inventario",
      "almacen": "Control de Almacén",
      "marketing": "Marketing & Prospección",
      "finanzas": "Resumen Financiero",
      "resumen": "Resumen General",
      "usuarios": "Gestión de Usuarios"
    };
    for (const [key, value] of Object.entries(titles)) {
      if (path.includes(key)) return value;
    }
    return "ERP Operativo";
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-['Plus_Jakarta_Sans',sans-serif] overflow-x-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-[#e5e7eb] transform transition-transform duration-500 ease-out lg:translate-x-0 shadow-xl lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-[#e5e7eb]">
            <Link to="/portal/dashboard" className="flex items-center gap-4 group">
              <div className="logo-circle w-12 h-12 group-hover:scale-110 transition-transform duration-300">
                <img src="/assets/logo.png" alt="Grupo AR" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-bold text-[#111518] text-lg">Grupo AR</p>
                <p className="text-[10px] text-[#60778a] uppercase tracking-widest">ERP System</p>
              </div>
            </Link>
          </div>

          {/* User Quick Info */}
          <div className="px-5 py-4 border-b border-[#e5e7eb] bg-gradient-to-r from-[#f8fafc] to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066cc] to-[#0099ff] flex items-center justify-center text-white font-bold shadow-md">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#111518] truncate">{user?.displayName || user?.email}</p>
                <span className="inline-block mt-0.5 text-[10px] bg-[#0066cc]/10 text-[#0066cc] px-2 py-0.5 rounded-full font-bold uppercase">
                  {RoleLabels[role] || role}
                </span>
              </div>
            </div>
          </div>
          {isSuperAdmin && (
            <button
              onClick={openSecuritySettings}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#0B1B32] text-white text-xs font-bold rounded-lg hover:bg-black transition-all shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">vpn_key</span>
              Gestionar Token de Seguridad
            </button>
          )}


          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 no-scrollbar">
            <SidebarSection title="Principal">
              <NavItem to="/portal/dashboard" icon="dashboard">Panel</NavItem>
            </SidebarSection>

            {hasPermission("frontend") && (
              <SidebarSection title="Contenido">
                <NavItem to="/portal/frontend" icon="web">Gestor Frontend</NavItem>
              </SidebarSection>
            )}

            {(hasPermission("hr") || hasPermission("evaluations")) && (
              <SidebarSection title="Personal">
                {hasPermission("hr") && <NavItem to="/portal/rrhh" icon="groups">Empleados</NavItem>}
                {hasPermission("evaluations") && <NavItem to="/portal/evaluaciones" icon="assessment">Evaluaciones</NavItem>}
              </SidebarSection>
            )}

            {hasPermission("projects") && (
              <SidebarSection title="Construcción">
                <NavItem to="/portal/obras" icon="construction">Obras</NavItem>
              </SidebarSection>
            )}

            {(hasPermission("pos") || hasPermission("inventory") || hasPermission("warehouse")) && (
              <SidebarSection title="Ferretería">
                {hasPermission("pos") && <NavItem to="/portal/pos" icon="point_of_sale">Terminal POS</NavItem>}
                {hasPermission("inventory") && <NavItem to="/portal/inventario" icon="inventory">Inventario</NavItem>}
                {hasPermission("warehouse") && <NavItem to="/portal/almacen" icon="warehouse">Almacén</NavItem>}
              </SidebarSection>
            )}

            {(hasPermission("marketing") || hasPermission("finance") || hasPermission("quotes")) && (
              <SidebarSection title="Administración">
                {hasPermission("quotes") && <NavItem to="/portal/cotizador" icon="request_quote">Cotizador</NavItem>}
                {hasPermission("quotes") && <NavItem to="/portal/resumen" icon="summarize">Resumen</NavItem>}
                {hasPermission("marketing") && <NavItem to="/portal/marketing" icon="campaign">Marketing</NavItem>}
                {hasPermission("finance") && <NavItem to="/portal/finanzas" icon="account_balance">Finanzas</NavItem>}
              </SidebarSection>
            )}

            {hasPermission("users") && (
              <SidebarSection title="Sistema">
                <NavItem to="/portal/usuarios" icon="manage_accounts">Usuarios</NavItem>
              </SidebarSection>
            )}
          </nav>

          {/* Logout Section */}
          <div className="p-4 border-t border-[#e5e7eb]">
            <button
              onClick={signOutUser}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-all duration-300 hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Cerrar Sesión
            </button>
            <Link to="/" className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs text-[#60778a] hover:text-[#0066cc] transition-colors">
              <span className="material-symbols-outlined text-[14px]">home</span>
              Ver Sitio Público
            </Link>
          </div>
        </div>
      </aside >

      {/* Mobile Overlay */}
      {
        isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )
      }

      {/* Main Content */}
      <div className="flex-1 lg:ml-72 min-h-screen flex flex-col w-full relative">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[#e5e7eb] shadow-sm">
          <div className="flex items-center justify-between px-4 md:px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-xl text-[#60778a] hover:bg-[#f8fafc] hover:text-[#111518] transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">menu</span>
              </button>
              <div>
                <h1 className="text-xl font-bold text-[#111518]">{getPageTitle(location.pathname)}</h1>
                <p className="text-xs text-[#60778a] hidden sm:block">
                  {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Offline Indicator */}
              {!isOnline && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-medium">
                  <span className="material-symbols-outlined text-[16px]">cloud_off</span>
                  <span className="hidden sm:inline">Sin conexión</span>
                </div>
              )}


              {/* Help Button */}
              <GlobalHelp />

              {/* Quick Actions */}
              <Link to="/portal/pos" className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0066cc] to-[#0099ff] text-white text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                POS
              </Link>
              {/* Logo circular small */}
              <div className="logo-circle w-10 h-10 hidden sm:block">
                <img src="/assets/logo.png" alt="Grupo AR" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 w-full max-w-full overflow-hidden">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#e5e7eb] bg-white py-4 px-6 md:px-8">
          <div className="flex flex-col md:flex-row gap-2 items-center justify-between text-xs text-[#60778a]">
            <p>© 2026 Grupo AR · ERP System</p>
            <div className="flex items-center gap-1">
              <div className="logo-circle w-5 h-5">
                <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-medium">v2.2 Mobile Optimized</span>
            </div>
          </div>
        </footer>
      </div>

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div >
  );
};
