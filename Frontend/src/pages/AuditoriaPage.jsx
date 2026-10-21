import { Fragment, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '../services/apiService';

const renderJson = (value) => {
  if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) {
    return 'Sin datos';
  }

  return JSON.stringify(value, null, 2);
};

export const AuditoriaPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ modulo: '', accion: '' });
  const [appliedFilters, setAppliedFilters] = useState({ modulo: '', accion: '' });
  const [exporting, setExporting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const loadLogs = async (params = filters) => {
    try {
      const response = await apiService.getAuditLogs(params);
      setLogs(response.data.logs || []);
      setAppliedFilters({ ...params });
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar la bitácora de auditoría.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = async (event) => {
    event.preventDefault();
    setLoading(true);
    await loadLogs(filters);
  };

  const exportLogs = async () => {
    setExporting(true);
    try {
      const { data } = await apiService.exportAuditLogs(appliedFilters);
      const url = URL.createObjectURL(data); const link = document.createElement('a');
      link.href = url; link.download = 'auditoria.csv'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('No se pudo exportar la auditoría.'); } finally { setExporting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Auditoría del sistema</h1>
        <p className="text-gray-600 mt-1">Registro de acciones críticas por módulo, usuario y cambios sensibles.</p>
      </div>

      {error && <div className="card border border-red-200 text-red-700">{error}</div>}

      <form onSubmit={applyFilters} className="card grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Módulo</label>
          <input value={filters.modulo} onChange={(e) => setFilters((prev) => ({ ...prev, modulo: e.target.value }))} className="input-field" placeholder="sacramentos, finanzas, eventos..." />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Acción</label>
          <input value={filters.accion} onChange={(e) => setFilters((prev) => ({ ...prev, accion: e.target.value }))} className="input-field" placeholder="crear, editar, eliminar..." />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-secondary">Filtrar</button><button type="button" onClick={exportLogs} disabled={loading || exporting} className="btn-primary disabled:opacity-50">{exporting ? 'Exportando…' : 'Exportar CSV'}</button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-gray-600">Cargando auditoría...</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-600">No hay registros de auditoría.</p>
        ) : (
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="text-left border-b border-gray-200 text-sm text-gray-600">
                <th className="py-3 pr-3">Fecha</th>
                <th className="py-3 pr-3">Usuario</th>
                <th className="py-3 pr-3">Módulo</th>
                <th className="py-3 pr-3">Acción</th>
                <th className="py-3 pr-3">Descripción</th>
                <th className="py-3 pr-3">IP</th>
                <th className="py-3 pr-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <tr className="border-b border-gray-100 align-top">
                    <td className="py-3 pr-3 text-sm">{new Date(log.created_at).toLocaleString('es-EC')}</td>
                    <td className="py-3 pr-3 text-sm">
                      {log.user ? (
                        <>
                          <p className="font-medium">{log.user.name}</p>
                          <p className="text-xs text-gray-500">{log.user.email}</p>
                        </>
                      ) : (
                        'Sistema'
                      )}
                    </td>
                    <td className="py-3 pr-3 text-sm">{log.modulo}</td>
                    <td className="py-3 pr-3 text-sm">{log.accion}</td>
                    <td className="py-3 pr-3 text-sm">{log.descripcion || '-'}</td>
                    <td className="py-3 pr-3 text-sm">{log.ip || '-'}</td>
                    <td className="py-3 pr-3 text-sm">
                      <button type="button" className="inline-flex items-center gap-1 text-sage-700 hover:underline" onClick={() => setExpandedId((prev) => (prev === log.id ? null : log.id))}>
                        {expandedId === log.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {expandedId === log.id ? 'Ocultar' : 'Ver cambios'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td colSpan={7} className="p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 mb-2">Valores anteriores</p>
                            <pre className="text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{renderJson(log.valores_anteriores)}</pre>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 mb-2">Valores nuevos</p>
                            <pre className="text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{renderJson(log.valores_nuevos)}</pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
