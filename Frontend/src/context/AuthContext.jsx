import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

const USE_MOCK_AUTH =
  !import.meta.env.PROD && String(import.meta.env.VITE_USE_MOCK_AUTH || 'false').toLowerCase() === 'true';

const normalizeRole = (role) => {
  const normalized = String(role || '').toLowerCase();

  if (normalized === 'user' || normalized === 'usuario') {
    return 'usuario';
  }

  if (normalized === 'admin') {
    return 'admin';
  }

  if (normalized === 'editor') {
    return 'editor';
  }

  return 'usuario';
};

const normalizeUser = (user) => {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const permissions = Array.isArray(user.permissions)
    ? user.permissions
        .map((permission) => String(permission || '').trim())
        .filter((permission) => permission.length > 0)
    : [];

  return {
    ...user,
    role: normalizeRole(user.role),
    permissions,
  };
};

const roleHierarchy = {
  usuario: 1,
  editor: 2,
  admin: 3,
};

const clearMockAuth = () => {
  localStorage.removeItem('mock-user');
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }

  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        if (USE_MOCK_AUTH) {
          const storedUser = localStorage.getItem('mock-user');

          if (storedUser) {
            const normalizedUser = normalizeUser(JSON.parse(storedUser));

            if (normalizedUser) {
              setUser(normalizedUser);
            }
          }

          return;
        }

        const profile = await authService.getProfile();
        const normalizedUser = normalizeUser(profile?.user);

        setUser(normalizedUser);
      } catch (error) {
        clearMockAuth();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    const handleUnauthorized = () => {
      clearMockAuth();
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    restoreSession();

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const setAuthenticatedUser = (userData) => {
    const normalizedUser = normalizeUser(userData);

    if (!normalizedUser) {
      return;
    }

    setUser(normalizedUser);

    if (USE_MOCK_AUTH) {
      localStorage.setItem('mock-user', JSON.stringify(normalizedUser));
    }
  };

  const refreshProfile = async () => {
    if (USE_MOCK_AUTH) {
      return null;
    }

    const profile = await authService.getProfile();

    if (profile?.user) {
      setAuthenticatedUser(profile.user);
    }

    return profile;
  };

  const login = async (email, password) => {
    if (USE_MOCK_AUTH) {
      const usuarios = {
        'admin@parroquia.com': {
          id: 1,
          name: 'Administrador',
          email: 'admin@parroquia.com',
          role: 'admin',
          password: 'admin123',
        },
        'editor@parroquia.com': {
          id: 2,
          name: 'Editor',
          email: 'editor@parroquia.com',
          role: 'editor',
          password: 'editor123',
        },
        'usuario@parroquia.com': {
          id: 3,
          name: 'Usuario',
          email: 'usuario@parroquia.com',
          role: 'usuario',
          password: 'usuario123',
        },
      };

      const usuario = usuarios[email];

      if (usuario && usuario.password === password) {
        const normalizedRole = normalizeRole(usuario.role);

        setAuthenticatedUser({
          id: usuario.id,
          name: usuario.name,
          email: usuario.email,
          role: normalizedRole,
        });

        return { success: true, role: normalizedRole };
      }

      return { success: false, error: 'Credenciales incorrectas' };
    }

    try {
      const data = await authService.login(email, password);
      setAuthenticatedUser(data.user);
      const normalizedRole = normalizeRole(data?.user?.role);

      return { success: true, role: normalizedRole };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code || null,
      };
    }
  };

  const completeSocialLogin = async (provider, ticket) => {
    try {
      const data = await authService.completeSocialLogin(provider, ticket);
      setAuthenticatedUser(data.user);
      const normalizedRole = normalizeRole(data?.user?.role);

      return { success: true, role: normalizedRole };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code || null,
      };
    }
  };

  const register = async (userData) => {
    if (USE_MOCK_AUTH) {
      return {
        success: true,
        requiresVerification: false,
        message: 'Usuario registrado en modo mock.',
      };
    }

    try {
      const payload = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        password_confirmation: userData.password_confirmation || userData.confirmPassword,
      };

      const data = await authService.register(payload);

      return {
        success: true,
        requiresVerification: Boolean(data.requires_verification),
        message: data.message,
      };
    } catch (error) {
      return { success: false, error: error.message, code: error.code || null };
    }
  };

  const resendVerificationEmail = async (email) => {
    if (USE_MOCK_AUTH) {
      return { success: true, message: 'Correo de verificacion simulado.' };
    }

    try {
      const data = await authService.resendVerificationEmail(email || user?.email);

      return { success: true, message: data.message };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code || null,
      };
    }
  };

  const logout = async () => {
    setUser(null);
    clearMockAuth();

    if (!USE_MOCK_AUTH) {
      await authService.logout();
    }
  };

  const hasPermission = (requiredRole) => {
    if (!user) {
      return false;
    }

    if (typeof requiredRole === 'string' && requiredRole.includes('.')) {
      if (user.role === 'admin') {
        return true;
      }

      return (user.permissions || []).includes(requiredRole);
    }

    const userLevel = roleHierarchy[normalizeRole(user.role)] || 0;
    const requiredLevel = roleHierarchy[normalizeRole(requiredRole)] || 0;

    return userLevel >= requiredLevel;
  };

  const hasAnyPermission = (permissions = []) => {
    if (!user || !Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }

    return permissions.some((permission) => hasPermission(permission));
  };

  const value = {
    user,
    login,
    completeSocialLogin,
    register,
    logout,
    hasPermission,
    hasAnyPermission,
    isAuthenticated: !!user,
    loading,
    resendVerificationEmail,
    refreshProfile,
    setAuthenticatedUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
