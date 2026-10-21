import apiClient, { ensureCsrfCookie } from './apiClient';

class ApiError extends Error {
  constructor(message, code = null, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.errors = errors;
  }
}

const getApiError = (error, fallbackMessage) => {
  const responseData = error.response?.data || {};

  if (typeof responseData?.message === 'string' && responseData.message.trim()) {
    return {
      message: responseData.message,
      code: responseData.code || null,
      errors: responseData.errors || null,
    };
  }

  const validationErrors = responseData?.errors;

  if (validationErrors && typeof validationErrors === 'object') {
    const firstFieldErrors = Object.values(validationErrors).find(
      (messages) => Array.isArray(messages) && messages.length > 0
    );

    if (firstFieldErrors) {
      return {
        message: firstFieldErrors[0],
        code: responseData.code || null,
        errors: validationErrors,
      };
    }
  }

  return {
    message: fallbackMessage,
    code: responseData.code || null,
    errors: responseData.errors || null,
  };
};

const buildApiError = (error, fallbackMessage) => {
  const parsedError = getApiError(error, fallbackMessage);

  return new ApiError(parsedError.message, parsedError.code, parsedError.errors);
};

const performStatefulRequest = async (callback) => {
  await ensureCsrfCookie();
  return callback();
};

export const authService = {
  login: async (email, password) => {
    try {
      const response = await performStatefulRequest(() => apiClient.post('/login', { email, password }));
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'Error al iniciar sesion');
    }
  },

  completeSocialLogin: async (provider, ticket) => {
    try {
      const response = await performStatefulRequest(() =>
        apiClient.post('/auth/social/complete', { provider, ticket })
      );
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'No se pudo finalizar el acceso social');
    }
  },

  logout: async () => {
    try {
      await performStatefulRequest(() => apiClient.post('/logout'));
    } catch (error) {
      console.error('Error al cerrar sesion:', error);
    }
  },

  register: async (userData) => {
    try {
      const response = await performStatefulRequest(() => apiClient.post('/register', userData));
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'Error al registrar usuario');
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await performStatefulRequest(() => apiClient.post('/forgot-password', { email }));
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'No se pudo enviar el enlace de recuperacion');
    }
  },

  resetPassword: async (payload) => {
    try {
      const response = await performStatefulRequest(() => apiClient.post('/reset-password', payload));
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'No se pudo restablecer la contrasena');
    }
  },

  resendVerificationEmail: async (email) => {
    try {
      const payload = email ? { email } : {};
      const response = await performStatefulRequest(() => apiClient.post('/email/verification-notification', payload));
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'No se pudo reenviar el correo de verificacion');
    }
  },

  verifyEmail: async ({ id, hash, expires, signature }) => {
    try {
      const response = await apiClient.get(`/email/verify/${id}/${hash}`, {
        params: { expires, signature },
      });
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'No se pudo verificar el correo');
    }
  },

  getProfile: async () => {
    try {
      const response = await apiClient.get('/me');
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'Error al obtener perfil');
    }
  },

  getAdminUsers: async () => {
    try {
      const response = await apiClient.get('/admin/users');
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'Error al obtener usuarios');
    }
  },

  getRoles: async () => {
    try {
      const response = await apiClient.get('/admin/roles');
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'Error al obtener roles');
    }
  },

  updateUserRole: async (userId, role) => {
    try {
      const response = await apiClient.patch(`/admin/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'Error al actualizar rol');
    }
  },

  updateUserStatus: async (userId, isActive) => {
    try {
      const response = await apiClient.patch(`/admin/users/${userId}/status`, { is_active: isActive });
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'Error al actualizar estado de usuario');
    }
  },

  updateUserActivityBlock: async (userId, activityBlocked) => {
    try {
      const response = await apiClient.patch(`/admin/users/${userId}/activity-block`, {
        activity_blocked: activityBlocked,
      });
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'Error al actualizar el bloqueo de actividad');
    }
  },

  deleteUser: async (userId) => {
    try {
      const response = await apiClient.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw buildApiError(error, 'Error al eliminar usuario');
    }
  },
};
