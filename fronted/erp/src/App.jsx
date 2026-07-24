import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RequireRole } from "./components/RequireRole";
import { RequirePermission } from "./components/RequirePermission";
import { useModal, Modal } from "./components/Modal";
import { SecurityProvider } from "./state/SecurityContext";

// Public Pages
import Landing from "./pages/public/Landing";
import Catalog from "./pages/public/Catalog";
import Services from "./pages/public/Services";
import Contact from "./pages/public/Contact";
import Verify from "./pages/public/Verify";
import VerifyEmployee from "./pages/public/VerifyEmployee";
import VerifyTicket from "./pages/public/VerifyTicket";
import Terms from "./pages/public/Terms";
import Privacy from "./pages/public/Privacy";
import EvaluationResponse from "./pages/public/EvaluationResponse";

// Auth
import Login from "./pages/Login";
import PublicTicket from "./pages/PublicTicket";

// Portal Pages
import Dashboard from "./pages/Dashboard";
import PosInterface from "./pages/PosInterface";

// New Portal Modules
import HR from "./pages/portal/HR";
import Projects from "./pages/portal/Projects";
import Finance from "./pages/portal/Finance";
import Marketing from "./pages/portal/Marketing";
import FrontendManager from "./pages/portal/FrontendManager";
import Inventory from "./pages/portal/Inventory";
import Warehouse from "./pages/portal/Warehouse";
import Evaluations from "./pages/portal/Evaluations";
import UserManagement from "./pages/portal/UserManagement";
import Quoter from "./pages/portal/Quoter";
import Summary from "./pages/portal/Summary";
import EvaluationForm from "./pages/evaluations/EvaluationForm";

import { Roles } from "./utils/roles";

const LayoutRoute = () => (
  <Layout>
    <Outlet />
  </Layout>
);

const App = () => {
  const { modal, closeModal } = useModal();

  return (
    <SecurityProvider>
      <Routes>
        {/* ============ PUBLIC ROUTES ============ */}
        <Route path="/" element={<Landing />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/servicios" element={<Services />} />
        <Route path="/contacto" element={<Contact />} />
        <Route path="/verificar/ticket/:saleId" element={<VerifyTicket />} />
        <Route path="/verificar/:type/:id" element={<Verify />} />
        <Route path="/verificar-empleado/:uid" element={<VerifyEmployee />} />
        <Route path="/consulta/:id" element={<PublicTicket />} />
        <Route path="/terminos" element={<Terms />} />
        <Route path="/privacidad" element={<Privacy />} />
        <Route path="/evaluar/:requestId" element={<EvaluationResponse />} />

        {/* ============ AUTH ============ */}
        <Route path="/portal/login" element={<Login />} />
        <Route path="/login" element={<Navigate to="/portal/login" replace />} />

        {/* ============ PORTAL (Protected) ============ */}
        <Route
          path="/portal"
          element={
            <RequireRole allowed={[Roles.ADMIN, Roles.STAFF, Roles.OBRA]}>
              <LayoutRoute />
            </RequireRole>
          }
        >
          <Route index element={<Navigate to="/portal/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Frontend/CMS Management */}
          <Route
            path="frontend"
            element={
              <RequirePermission permission="frontend">
                <FrontendManager />
              </RequirePermission>
            }
          />

          {/* RRHH - Human Resources */}
          <Route
            path="rrhh"
            element={
              <RequirePermission permission="hr">
                <HR />
              </RequirePermission>
            }
          />

          {/* Evaluaciones */}
          <Route
            path="evaluaciones"
            element={
              <RequirePermission permission="evaluations">
                <Evaluations />
              </RequirePermission>
            }
          />
          <Route
            path="evaluaciones/nueva"
            element={
              <RequirePermission permission="evaluations">
                <EvaluationForm />
              </RequirePermission>
            }
          />

          {/* Projects */}
          <Route
            path="obras"
            element={
              <RequirePermission permission="projects">
                <Projects />
              </RequirePermission>
            }
          />

          {/* Tools */}
          {/* Point of Sale */}
          <Route
            path="pos"
            element={
              <RequirePermission permission="pos">
                <PosInterface />
              </RequirePermission>
            }
          />

          {/* Inventory */}
          <Route
            path="inventario"
            element={
              <RequirePermission permission="inventory">
                <Inventory />
              </RequirePermission>
            }
          />

          {/* Warehouse */}
          <Route
            path="almacen"
            element={
              <RequirePermission permission="warehouse">
                <Warehouse />
              </RequirePermission>
            }
          />

          {/* Admin & Finance */}
          {/* Cotizador */}
          <Route
            path="cotizador"
            element={
              <RequirePermission permission="quotes">
                <Quoter />
              </RequirePermission>
            }
          />
          {/* Resumen Dashboard */}
          <Route
            path="resumen"
            element={
              <RequirePermission permission="quotes">
                <Summary />
              </RequirePermission>
            }
          />
          {/* Marketing & Promotions */}
          <Route
            path="marketing"
            element={
              <RequirePermission permission="marketing">
                <Marketing />
              </RequirePermission>
            }
          />
          {/* Finance */}
          <Route
            path="finanzas"
            element={
              <RequirePermission permission="finance">
                <Finance />
              </RequirePermission>
            }
          />

          {/* System */}
          {/* Administración de Usuarios */}
          <Route
            path="usuarios"
            element={
              <RequirePermission permission="users">
                <UserManagement />
              </RequirePermission>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Modal global para alertas, confirms y prompts */}
      <Modal modal={modal} onClose={closeModal} />
    </SecurityProvider>
  );
};

export default App;
