import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ArticulosPage } from './pages/ArticulosPage';
import { AuditoriaPage } from './pages/AuditoriaPage';
import { BibliaPage } from './pages/BibliaPage';
import { ContactoPage } from './pages/ContactoPage';
import { ContenidoPastoralPage } from './pages/ContenidoPastoralPage';
import { DashboardPage } from './pages/DashboardPage';
import { DonacionesPage } from './pages/DonacionesPage';
import { EventosPage } from './pages/EventosPage';
import { FinanzasPage } from './pages/FinanzasPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { HorariosPage } from './pages/HorariosPage';
import { LoginPage } from './pages/LoginPage';
import { MiembrosPage } from './pages/MiembrosPage';
import { MiCuentaPage } from './pages/MiCuentaPage';
import { NinosJovenesDetallePage } from './pages/NinosJovenesDetallePage';
import { NinosJovenesPage } from './pages/NinosJovenesPage';
import { PublicacionesPage } from './pages/PublicacionesPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReportesPage } from './pages/ReportesPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SacramentosPage } from './pages/SacramentosPage';
import { SocialAuthCallbackPage } from './pages/SocialAuthCallbackPage';
import { TicketsPage } from './pages/TicketsPage';
import { SolicitudesPage } from './pages/SolicitudesPage';
import { VerificarCertificadoPage } from './pages/VerificarCertificadoPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { VideosPage } from './pages/VideosPage';
import { VisitasPastoralesPage } from './pages/VisitasPastoralesPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/tickets" element={<ProtectedRoute requiredRole="editor"><Layout><TicketsPage /></Layout></ProtectedRoute>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/social/callback" element={<SocialAuthCallbackPage />} />
          <Route path="/certificados/verificar" element={<VerificarCertificadoPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredPermission="dashboard.view">
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/sacramentos"
            element={
              <ProtectedRoute requiredPermission="sacraments.view">
                <Layout>
                  <SacramentosPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/miembros"
            element={
              <ProtectedRoute requiredPermission="members.view">
                <Layout>
                  <MiembrosPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/finanzas"
            element={
              <ProtectedRoute requiredPermission="finance.view">
                <Layout>
                  <FinanzasPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reportes"
            element={
              <ProtectedRoute requiredPermission="reports.view">
                <Layout>
                  <ReportesPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/auditoria"
            element={
              <ProtectedRoute requiredPermission="audit.view">
                <Layout>
                  <AuditoriaPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute requiredPermission="users.view">
                <Layout>
                  <AdminUsersPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/solicitudes"
            element={
              <ProtectedRoute requiredPermission="sacraments.request_certificate" verifiedRequester>
                <Layout>
                  <SolicitudesPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/mi-cuenta"
            element={
              <ProtectedRoute requiredPermission="profile.view_own">
                <Layout>
                  <MiCuentaPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <HomePage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/medios/videos"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <VideosPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/medios/biblia"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <BibliaPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/medios/publicaciones"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <PublicacionesPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/contenido-pastoral"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <ContenidoPastoralPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/calendarios/eventos"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <EventosPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/calendarios/visitas"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <VisitasPastoralesPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/horarios/misas"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <HorariosPage tipo="misa" title="Horarios de misas" description="Consulta y administra los horarios regulares de celebraciones eucarísticas." />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/horarios/atencion"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <HorariosPage tipo="atencion" title="Atención de casa parroquial" description="Consulta y administra los horarios de atención, trámites y acompañamiento pastoral." />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/donaciones"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <DonacionesPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/articulos"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <ArticulosPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ninos-jovenes/:id"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <NinosJovenesDetallePage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ninos-jovenes"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <NinosJovenesPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/contacto"
            element={
              <ProtectedRoute requireAuth={false}>
                <Layout>
                  <ContactoPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
