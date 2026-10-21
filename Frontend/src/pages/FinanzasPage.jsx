import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { Download, Edit2, Plus, Trash2 } from 'lucide-react';

const emptyForm = {
  nombre_donante: '',
  email_donante: '',
  tipo_movimiento: 'ingreso',
  categoria: 'donacion_general',
  monto: '',
  fecha: '',
  numero_comprobante: '',
  descripcion: '',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const FinanzasPage = () => {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('admin');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [proof, setProof] = useState(null);
  const [loadingProof, setLoadingProof] = useState(null);

  useEffect(() => {
    if (!proof) return;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setProof(null); };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      URL.revokeObjectURL(proof.url);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [proof]);

  const viewProof = async (row) => {
    if (loadingProof !== null) return;
    setLoadingProof(row.id);
    try {
      const { data } = await apiService.getFotoComprobanteDonacion(row.id);
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[data.type] || 'jpg';
      setProof({ url: URL.createObjectURL(data), name: row.nombre_donante, filename: `foto-comprobante-${row.id}.${extension}` });
      setError('');
    } catch {
      setError('No se pudo abrir la foto del comprobante. Revisa tu sesión e inténtalo de nuevo.');
    } finally {
      setLoadingProof(null);
    }
  };

  const loadRows = async () => {
    try {
      const response = await apiService.getDonaciones();
      setRows(response.data);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar movimientos financieros.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const totals = useMemo(() => {
    const ingresos = rows.filter((row) => row.tipo_movimiento === 'ingreso' && row.review_status === 'aprobado').reduce((acc, row) => acc + Number(row.monto), 0);
    const egresos = rows.filter((row) => row.tipo_movimiento === 'egreso' && row.review_status === 'aprobado').reduce((acc, row) => acc + Number(row.monto), 0);

    return {
      ingresos,
      egresos,
      balance: ingresos - egresos,
    };
  }, [rows]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...emptyForm, fecha: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setFormData({
      nombre_donante: row.nombre_donante || '',
      email_donante: row.email_donante || '',
      tipo_movimiento: row.tipo_movimiento || 'ingreso',
      categoria: row.categoria || 'donacion_general',
      monto: row.monto || '',
      fecha: row.fecha || '',
      numero_comprobante: row.numero_comprobante || '',
      descripcion: row.descripcion || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingId) {
        await apiService.updateDonacion(editingId, formData);
      } else {
        await apiService.createDonacion(formData);
      }
      await loadRows();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el movimiento.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar movimiento financiero?')) {
      return;
    }

    try {
      await apiService.deleteDonacion(id);
      await loadRows();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el movimiento.');
    }
  };

  const handleDownloadReceipt = async (row) => {
    try {
      const response = await apiService.downloadComprobanteDonacion(row.id);
      downloadBlob(response.data, `comprobante-donacion-${row.id}.pdf`);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo descargar el comprobante.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión financiera</h1>
          <p className="text-gray-600 mt-1">Donaciones, ofrendas, ingresos y egresos.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus size={18} />
          Nuevo movimiento
        </button>
      </div>

      {error && <div className="card border border-red-200 text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Ingresos</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totals.ingresos)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Egresos</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totals.egresos)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Balance</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totals.balance)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-gray-600">Cargando movimientos...</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-600">No hay movimientos registrados.</p>
        ) : (
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="text-left border-b border-gray-200 text-sm text-gray-600">
                <th className="py-3 pr-3">Fecha</th>
                <th className="py-3 pr-3">Donante</th>
                <th className="py-3 pr-3">Tipo</th>
                <th className="py-3 pr-3">Categoría</th>
                <th className="py-3 pr-3">Monto</th>
                <th className="py-3 pr-3">Comprobante</th>
                <th className="py-3 pr-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100">
                  <td className="py-3 pr-3">{row.fecha}</td>
                  <td className="py-3 pr-3">
                    <p>{row.nombre_donante}</p>
                    <p className="text-xs text-gray-500">{row.email_donante || '-'}</p>
                  </td>
                  <td className="py-3 pr-3 capitalize">{row.tipo_movimiento}</td>
                  <td className="py-3 pr-3">{row.categoria}</td>
                  <td className="py-3 pr-3 font-semibold">{formatCurrency(row.monto)}</td>
                  <td className="py-3 pr-3">
                    <p className="text-xs text-sage-700">{row.review_status?.replaceAll('_', ' ')}</p><p>{row.numero_comprobante || '-'}</p>
                    {row.tiene_comprobante ? (
                      <button type="button" onClick={() => viewProof(row)} disabled={loadingProof !== null}
                        className="text-sm text-sage-700 underline disabled:opacity-50">
                        {loadingProof === row.id ? 'Abriendo…' : 'Ver foto adjunta'}
                      </button>
                    ) : <span className="text-xs text-gray-500">Sin foto adjunta</span>}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(row)}
                        className="text-blue-700 hover:bg-blue-50 p-2 rounded"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        disabled={row.review_status !== 'aprobado'}
                        onClick={() => handleDownloadReceipt(row)}
                        className="text-sage-700 hover:bg-sage-50 p-2 rounded"
                        title="Descargar comprobante"
                      >
                        <Download size={16} />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="text-red-700 hover:bg-red-50 p-2 rounded"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {proof && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setProof(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="proof-title" onClick={(event) => event.stopPropagation()}
            className="bg-white rounded-xl max-w-3xl w-full p-5 max-h-[90dvh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="proof-title" className="text-xl font-bold">Foto del comprobante</h2><p className="text-sm text-gray-600 break-words">{proof.name}</p></div>
              <button type="button" autoFocus onClick={() => setProof(null)} className="btn-secondary">Cerrar</button>
            </div>
            <img src={proof.url} alt={`Comprobante adjunto de ${proof.name}`} className="max-h-[60dvh] max-w-full mx-auto object-contain" />
            <a href={proof.url} download={proof.filename} className="btn-primary inline-flex">Descargar foto</a>
          </section>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre del donante</label>
                <input
                  className="input-field"
                  value={formData.nombre_donante}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nombre_donante: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Correo</label>
                <input
                  type="email"
                  className="input-field"
                  value={formData.email_donante}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email_donante: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  className="input-field"
                  value={formData.tipo_movimiento}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tipo_movimiento: e.target.value }))}
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <input
                  className="input-field"
                  value={formData.categoria}
                  onChange={(e) => setFormData((prev) => ({ ...prev, categoria: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="input-field"
                  value={formData.monto}
                  onChange={(e) => setFormData((prev) => ({ ...prev, monto: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha</label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.fecha}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fecha: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número de comprobante</label>
                <input
                  className="input-field"
                  value={formData.numero_comprobante}
                  onChange={(e) => setFormData((prev) => ({ ...prev, numero_comprobante: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  rows={3}
                  className="input-field"
                  value={formData.descripcion}
                  onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={closeModal}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
