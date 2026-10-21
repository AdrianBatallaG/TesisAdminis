import axios from 'axios';

const defaultApiUrl = 'http://localhost:8000/api';
const rawApiUrl = (import.meta.env.VITE_API_URL || defaultApiUrl).trim();

const baseURL = rawApiUrl.replace(/\/+$/, '');
const appBaseUrl = baseURL.replace(/\/api$/, '');
const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);

const readCookie = (name) => {
  if (typeof document === 'undefined') {
    return '';
  }

  const pattern = new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`);
  const match = document.cookie.match(pattern);

  return match ? decodeURIComponent(match[1]) : '';
};

const csrfClient = axios.create({
  baseURL: appBaseUrl,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

let csrfRequest = null;

const ensureCsrfCookie = async () => {
  if (!csrfRequest) {
    csrfRequest = csrfClient.get('/sanctum/csrf-cookie').finally(() => {
      csrfRequest = null;
    });
  }

  return csrfRequest;
};

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const method = String(config.method || 'get').toLowerCase();

    if (unsafeMethods.has(method)) {
      await ensureCsrfCookie();

      const csrfToken = readCookie('XSRF-TOKEN');

      if (csrfToken) {
        config.headers['X-XSRF-TOKEN'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export { appBaseUrl, baseURL as apiBaseUrl, ensureCsrfCookie };
