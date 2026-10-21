import { appBaseUrl } from '../services/apiClient';

const SOCIAL_ERRORS = {
  GOOGLE_NOT_CONFIGURED: 'El acceso con Google todavia no esta configurado en el servidor.',
  GOOGLE_AUTH_FAILED: 'No se pudo completar la autenticacion con Google. Intenta nuevamente.',
  GOOGLE_EMAIL_REQUIRED: 'Google no devolvio un correo valido para completar el acceso.',
  ACCOUNT_INACTIVE: 'Tu cuenta esta inactiva o tiene el acceso restringido.',
};

export const getSocialErrorMessage = (code) => {
  if (!code) {
    return '';
  }

  return SOCIAL_ERRORS[code] || 'No se pudo completar el acceso con tu cuenta externa.';
};

export const getGoogleLoginUrl = () => `${appBaseUrl}/auth/google/redirect`;
