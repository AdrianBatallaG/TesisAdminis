import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, requiredRole, requiredPermission, requireAuth = true, verifiedRequester = false }) => {
  const { isAuthenticated, hasPermission, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!requireAuth) {
    return children;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (verifiedRequester && user?.role !== 'usuario') return <Navigate to="/dashboard" replace />;
  if (verifiedRequester && !user?.email_verified_at) return <div className="min-h-screen flex items-center justify-center p-4"><div className="card max-w-md"><h1 className="text-2xl mb-3">Verifica tu correo</h1><p className="text-sm text-gray-600 mb-4">Para solicitar documentos debes confirmar tu correo mediante el enlace que recibiste al registrarte.</p><Link to="/login" className="btn-primary inline-block">Ir a iniciar sesión</Link></div></div>;

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Acceso denegado</h2>
          <p className="text-gray-600">No tienes permisos para realizar esta acciÃƒÂ³n o acceder a esta secciÃƒÂ³n.</p>
        </div>
      </div>
    );
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Acceso denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta secciÃƒÂ³n.</p>
        </div>
      </div>
    );
  }

  return children;
};
