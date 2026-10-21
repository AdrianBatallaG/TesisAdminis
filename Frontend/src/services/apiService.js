import apiClient from './apiClient';

const api = apiClient;

const buildMethodSpoofedFormData = (formData, method = 'PUT') => {
  const payload = new FormData();
  formData.forEach((value, key) => {
    payload.append(key, value);
  });
  payload.append('_method', method);
  return payload;
};

export const apiService = {
  getNotifications: () => api.get('/notificaciones'),
  readNotification: (id) => api.patch(`/notificaciones/${id}/leida`),
  getMyTickets: () => api.get('/tickets/mios'),
  getTickets: (params = {}) => api.get('/tickets', { params }),
  getTicketProof: (id) => api.get(`/tickets/${id}/comprobante`, { responseType: 'blob' }),
  getTicket: (id) => api.get(`/tickets/${id}`),
  updateTicket: (id, data) => api.patch(`/tickets/${id}`, data),
  downloadTicketDocument: (id) => api.get(`/tickets/${id}/documento`, { responseType: 'blob' }),
  getDonationStatus: (id, token) => api.get(`/finanzas/donaciones/public/${id}/estado`, { params: { token } }),
  getHomeVideo: () => api.get('/inicio/video'),
  updateHomeVideo: (data, onUploadProgress) => api.post('/inicio/video', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  }),
  getDashboardSummary: () => api.get('/dashboard/summary'),

  getVideos: () => api.get('/medios/videos'),
  createVideo: (data) => api.post('/medios/videos', data),
  deleteVideo: (id) => api.delete(`/medios/videos/${id}`),

  getPublicaciones: () => api.get('/medios/publicaciones'),
  createPublicacion: (data) => api.post('/medios/publicaciones', data),
  updatePublicacion: (id, data) => api.put(`/medios/publicaciones/${id}`, data),
  deletePublicacion: (id) => api.delete(`/medios/publicaciones/${id}`),

  getContenidoPastoral: (params = {}) => api.get('/contenido-pastoral', { params }),
  createContenidoPastoral: (data) => api.post('/contenido-pastoral', data),
  updateContenidoPastoral: (id, data) => api.put(`/contenido-pastoral/${id}`, data),
  deleteContenidoPastoral: (id) => api.delete(`/contenido-pastoral/${id}`),

  getEventos: (params = {}) => api.get('/calendarios/eventos', { params }),
  createEvento: (data) => api.post('/calendarios/eventos', data),
  updateEvento: (id, data) => api.put(`/calendarios/eventos/${id}`, data),
  deleteEvento: (id) => api.delete(`/calendarios/eventos/${id}`),
  getEventoAsistencias: (id) => api.get(`/calendarios/eventos/${id}/asistencias`),
  registrarAsistenciaEvento: (id, data) => api.post(`/calendarios/eventos/${id}/asistencias`, data),

  getVisitasPastorales: (params = {}) => api.get('/calendarios/visitas', { params }),
  createVisitaPastoral: (data) => api.post('/calendarios/visitas', data),
  updateVisitaPastoral: (id, data) => api.put(`/calendarios/visitas/${id}`, data),
  deleteVisitaPastoral: (id) => api.delete(`/calendarios/visitas/${id}`),

  getHorarios: (params = {}) => api.get('/horarios', { params }),
  createHorario: (data) => api.post('/horarios', data),
  updateHorario: (id, data) => api.put(`/horarios/${id}`, data),
  deleteHorario: (id) => api.delete(`/horarios/${id}`),

  getSacramentos: (params = {}) => api.get('/sacramentos', { params }),
  getMisSacramentos: () => api.get('/sacramentos/mis-registros'),
  createSacramento: (data) => api.post('/sacramentos', data),
  updateSacramento: (id, data) => api.put(`/sacramentos/${id}`, data),
  deleteSacramento: (id) => api.delete(`/sacramentos/${id}`),
  downloadCertificadoSacramento: (id) => api.get(`/sacramentos/${id}/certificado`, { responseType: 'blob' }),
  solicitarCertificadoSacramento: (data) => api.post('/sacramentos/solicitar-certificado', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  verifyCertificadoSacramento: ({ id, token }) => api.get(`/sacramentos/verificar/${id}`, { params: { token } }),

  getMiembros: (params = {}) => api.get('/miembros', { params }),
  createMiembro: (data) => api.post('/miembros', data),
  updateMiembro: (id, data) => api.put(`/miembros/${id}`, data),
  deleteMiembro: (id) => api.delete(`/miembros/${id}`),
  getMiPerfilMiembro: () => api.get('/miembros/me'),
  updateMiPerfilMiembro: (data) => {
    if (data instanceof FormData) {
      return api.post('/miembros/me', buildMethodSpoofedFormData(data), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }

    return api.put('/miembros/me', data);
  },

  getDonaciones: (params = {}) => api.get('/finanzas/donaciones', { params }),
  getMisDonaciones: () => api.get('/finanzas/donaciones/mias'),
  createDonacion: (data) => api.post('/finanzas/donaciones', data),
  updateDonacion: (id, data) => api.put(`/finanzas/donaciones/${id}`, data),
  deleteDonacion: (id) => api.delete(`/finanzas/donaciones/${id}`),
  downloadComprobanteDonacion: (id) => api.get(`/finanzas/donaciones/${id}/comprobante`, { responseType: 'blob' }),
  downloadMiComprobanteDonacion: (id) => api.get(`/finanzas/donaciones/${id}/mi-comprobante`, { responseType: 'blob' }),
  createDonacionPublica: (data) => api.post('/finanzas/donaciones/public', data, data instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  getFotoComprobanteDonacion: (id) => api.get(`/finanzas/donaciones/${id}/foto-comprobante`, { responseType: 'blob' }),

  getReportesSummary: (params = {}) => api.get('/reportes/summary', { params }),
  exportReportesSacramentos: (params = {}) => api.get('/reportes/export/sacramentos.csv', { params, responseType: 'blob' }),
  exportReportesFinanzas: (params = {}) => api.get('/reportes/export/finanzas.csv', { params, responseType: 'blob' }),
  exportReportesSacramentosXlsx: (params = {}) => api.get('/reportes/export/sacramentos.xlsx', { params, responseType: 'blob' }),
  exportReportesFinanzasXlsx: (params = {}) => api.get('/reportes/export/finanzas.xlsx', { params, responseType: 'blob' }),
  exportReportesSacramentosPdf: (params = {}) => api.get('/reportes/export/sacramentos.pdf', { params, responseType: 'blob' }),
  exportReportesFinanzasPdf: (params = {}) => api.get('/reportes/export/finanzas.pdf', { params, responseType: 'blob' }),

  getArticulos: () => api.get('/articulos'),
  createArticulo: (data) => api.post('/articulos', data),
  updateArticulo: (id, data) => api.put(`/articulos/${id}`, data),
  deleteArticulo: (id) => api.delete(`/articulos/${id}`),

  getNinosJovenes: () => api.get('/ninos-jovenes'),
  getNinosJovenesDetalle: (id) => api.get(`/ninos-jovenes/${id}`),
  createNinosJovenes: (data) => api.post('/ninos-jovenes', data),
  updateNinosJovenes: (id, data) => api.put(`/ninos-jovenes/${id}`, data),
  deleteNinosJovenes: (id) => api.delete(`/ninos-jovenes/${id}`),

  exportAuditLogs: (params = {}) => api.get('/admin/audit-logs/export', { params, responseType: 'blob' }),
  getAuditLogs: (params = {}) => api.get('/admin/audit-logs', { params }),
};

export default api;
