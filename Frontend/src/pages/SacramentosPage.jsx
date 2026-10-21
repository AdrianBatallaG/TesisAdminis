import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { Download, Edit2, Plus, Search, Trash2 } from 'lucide-react';

const sacramentTypes = [
  { value: 'bautismo', label: 'Bautismo' },
  { value: 'comunion', label: 'Primera comunión' },
  { value: 'confirmacion', label: 'Confirmación' },
  { value: 'matrimonio', label: 'Matrimonio' },
];

const emptyForm = {
  tipo: 'bautismo',
  nombre: '',
  apellido: '',
  email: '',
  cedula: '',
  fecha: '',
  lugar: '',
  numero_certificado: '',
  celebrante: '',
  libro: '',
  folio: '',
  tomo: '',
  pagina: '',
  numero_asiento: '',
  estado: 'registrado',
  notas: '',
  bautismo_padre: '',
  bautismo_madre: '',
  bautismo_padrinos: '',
  confirmacion_obispo: '',
  confirmacion_padrinos: '',
  matrimonio_conyuge_1: '',
  matrimonio_conyuge_2: '',
  matrimonio_testigos: '',
  matrimonio_genero_matrimonio: 'canonico',
  matrimonio_dispensa_matrimonial: '',
};

const emptyFilters = {
  tipo: '',
  q: '',
  nombre: '',
  apellido: '',
  numero_certificado: '',
  fecha: '',
  from: '',
  to: '',
};

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

const splitList = (value = '') =>
  String(value)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const buildPayload = (formData) => {
  const payload = {
    tipo: formData.tipo,
    nombre: formData.nombre,
    apellido: formData.apellido,
    email: formData.email || null,
    cedula: formData.cedula || null,
    fecha: formData.fecha,
    lugar: formData.lugar || null,
    numero_certificado: formData.numero_certificado,
    celebrante: formData.celebrante || null,
    libro: formData.libro || null,
    folio: formData.folio || null,
    tomo: formData.tomo || null,
    pagina: formData.pagina || null,
    numero_asiento: formData.numero_asiento || null,
    estado: formData.estado || 'registrado',
    notas: formData.notas || null,
    datos_adicionales: {},
  };

  if (formData.tipo === 'bautismo') {
    payload.datos_adicionales = {
      padres: {
        padre: formData.bautismo_padre || '',
        madre: formData.bautismo_madre || '',
      },
      padrinos: splitList(formData.bautismo_padrinos),
    };
  }

  if (formData.tipo === 'confirmacion') {
    payload.datos_adicionales = {
      obispo_o_delegado: formData.confirmacion_obispo || '',
      padrinos: splitList(formData.confirmacion_padrinos),
    };
  }

  if (formData.tipo === 'matrimonio') {
    payload.datos_adicionales = {
      conyuge_1: formData.matrimonio_conyuge_1 || '',
      conyuge_2: formData.matrimonio_conyuge_2 || '',
      testigos: splitList(formData.matrimonio_testigos),
      genero_matrimonio: formData.matrimonio_genero_matrimonio || 'canonico',
      dispensa_matrimonial: formData.matrimonio_dispensa_matrimonial || '',
    };
  }

  return payload;
};

const mapRecordToForm = (record) => {
  const details = record.datos_adicionales || {};
  const padres = details.padres || {};

  return {
    tipo: record.tipo || 'bautismo',
    nombre: record.nombre || '',
    apellido: record.apellido || '',
    email: record.email || '',
    cedula: record.cedula || '',
    fecha: record.fecha || '',
    lugar: record.lugar || '',
    numero_certificado: record.numero_certificado || '',
    celebrante: record.celebrante || '',
    libro: record.libro || '',
    folio: record.folio || '',
    tomo: record.tomo || '',
    pagina: record.pagina || '',
    numero_asiento: record.numero_asiento || '',
    estado: record.estado || 'registrado',
    notas: record.notas || '',
    bautismo_padre: padres.padre || '',
    bautismo_madre: padres.madre || '',
    bautismo_padrinos: Array.isArray(details.padrinos) ? details.padrinos.join(', ') : '',
    confirmacion_obispo: details.obispo_o_delegado || '',
    confirmacion_padrinos: Array.isArray(details.padrinos) ? details.padrinos.join(', ') : '',
    matrimonio_conyuge_1: details.conyuge_1 || '',
    matrimonio_conyuge_2: details.conyuge_2 || '',
    matrimonio_testigos: Array.isArray(details.testigos) ? details.testigos.join(', ') : '',
    matrimonio_genero_matrimonio: details.genero_matrimonio || 'canonico',
    matrimonio_dispensa_matrimonial: details.dispensa_matrimonial || '',
  };
};

export const SacramentosPage = () => {
  const { hasPermission } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [filters, setFilters] = useState(emptyFilters);

  const canEdit = hasPermission('editor');
  const canDelete = hasPermission('admin');

  const loadRecords = async (params = filters) => {
    try {
      const response = await apiService.getSacramentos(params);
      setRecords(response.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los sacramentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords(emptyFilters);
  }, []);

  const filteredRecords = useMemo(() => records, [records]);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditingId(record.id);
    setFormData(mapRecordToForm(record));
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
      const payload = buildPayload(formData);

      if (editingId) {
        await apiService.updateSacramento(editingId, payload);
      } else {
        await apiService.createSacramento(payload);
      }

      await loadRecords();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el registro sacramental.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar registro sacramental?')) {
      return;
    }

    try {
      await apiService.deleteSacramento(id);
      await loadRecords();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el registro.');
    }
  };

  const handleDownloadCertificate = async (record) => {
    try {
      const response = await apiService.downloadCertificadoSacramento(record.id);
      downloadBlob(response.data, `certificado-${record.numero_certificado || record.id}.pdf`);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo descargar el certificado.');
    }
  };

  const applyFilters = async (event) => {
    event.preventDefault();
    setLoading(true);
    await loadRecords(filters);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de sacramentos</h1>
          <p className="text-gray-600 mt-1">Registro, búsqueda avanzada y certificados con verificación.</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Nuevo registro
          </button>
        )}
      </div>

      {error && <div className="card border border-red-200 text-red-700">{error}</div>}

      <form onSubmit={applyFilters} className="card grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Búsqueda general</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              className="input-field pl-9"
              placeholder="Nombre, apellido o certificado"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            value={filters.nombre}
            onChange={(event) => setFilters((prev) => ({ ...prev, nombre: event.target.value }))}
            className="input-field"
            placeholder="Nombre"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Apellido</label>
          <input
            value={filters.apellido}
            onChange={(event) => setFilters((prev) => ({ ...prev, apellido: event.target.value }))}
            className="input-field"
            placeholder="Apellido"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">No. certificado</label>
          <input
            value={filters.numero_certificado}
            onChange={(event) => setFilters((prev) => ({ ...prev, numero_certificado: event.target.value }))}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tipo</label>
          <select
            value={filters.tipo}
            onChange={(event) => setFilters((prev) => ({ ...prev, tipo: event.target.value }))}
            className="input-field"
          >
            <option value="">Todos</option>
            {sacramentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Fecha exacta</label>
          <input
            type="date"
            value={filters.fecha}
            onChange={(event) => setFilters((prev) => ({ ...prev, fecha: event.target.value }))}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Desde</label>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Hasta</label>
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            className="input-field"
          />
        </div>

        <div className="flex items-end">
          <button type="submit" className="btn-secondary w-full">
            Buscar
          </button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-gray-600">Cargando registros...</p>
        ) : filteredRecords.length === 0 ? (
          <p className="text-gray-600">No hay registros para los filtros aplicados.</p>
        ) : (
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="text-left border-b border-gray-200 text-sm text-gray-600">
                <th className="py-3 pr-3">Tipo</th>
                <th className="py-3 pr-3">Nombre</th>
                <th className="py-3 pr-3">Apellido</th>
                <th className="py-3 pr-3">Fecha</th>
                <th className="py-3 pr-3">Certificado</th>
                <th className="py-3 pr-3">Estado</th>
                <th className="py-3 pr-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-gray-100">
                  <td className="py-3 pr-3 capitalize">{record.tipo}</td>
                  <td className="py-3 pr-3">{record.nombre}</td>
                  <td className="py-3 pr-3">{record.apellido}</td>
                  <td className="py-3 pr-3">{record.fecha}</td>
                  <td className="py-3 pr-3">{record.numero_certificado}</td>
                  <td className="py-3 pr-3">{record.estado}</td>
                  <td className="py-3 pr-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDownloadCertificate(record)}
                        className="text-sage-700 hover:bg-sage-50 p-2 rounded"
                        title="Descargar certificado"
                      >
                        <Download size={16} />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => openEdit(record)}
                          className="text-blue-700 hover:bg-blue-50 p-2 rounded"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(record.id)}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar sacramento' : 'Nuevo sacramento'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={formData.tipo}
                  onChange={(event) => setFormData((prev) => ({ ...prev, tipo: event.target.value }))}
                  className="input-field"
                  required
                >
                  {sacramentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">No. certificado</label>
                <input
                  value={formData.numero_certificado}
                  onChange={(event) => setFormData((prev) => ({ ...prev, numero_certificado: event.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  value={formData.nombre}
                  onChange={(event) => setFormData((prev) => ({ ...prev, nombre: event.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Apellido</label>
                <input
                  value={formData.apellido}
                  onChange={(event) => setFormData((prev) => ({ ...prev, apellido: event.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label htmlFor="sacrament-cedula" className="block text-sm font-medium mb-1">Cédula (opcional)</label>
                <input id="sacrament-cedula" inputMode="numeric" pattern="[0-9]{10}" maxLength={10}
                  value={formData.cedula} onChange={(event) => setFormData((prev) => ({ ...prev, cedula: event.target.value }))}
                  className="input-field" />
                <p className="text-xs text-gray-500 mt-1">10 dígitos. Permite localizar el certificado por cédula.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Correo</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha del sacramento</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(event) => setFormData((prev) => ({ ...prev, fecha: event.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Lugar</label>
                <input
                  value={formData.lugar}
                  onChange={(event) => setFormData((prev) => ({ ...prev, lugar: event.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Celebrante</label>
                <input
                  value={formData.celebrante}
                  onChange={(event) => setFormData((prev) => ({ ...prev, celebrante: event.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Libro</label>
                <input
                  value={formData.libro}
                  onChange={(event) => setFormData((prev) => ({ ...prev, libro: event.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Folio</label>
                <input
                  value={formData.folio}
                  onChange={(event) => setFormData((prev) => ({ ...prev, folio: event.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tomo</label>
                <input
                  value={formData.tomo}
                  onChange={(event) => setFormData((prev) => ({ ...prev, tomo: event.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Página</label>
                <input
                  value={formData.pagina}
                  onChange={(event) => setFormData((prev) => ({ ...prev, pagina: event.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Número de asiento</label>
                <input
                  value={formData.numero_asiento}
                  onChange={(event) => setFormData((prev) => ({ ...prev, numero_asiento: event.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <input
                  value={formData.estado}
                  onChange={(event) => setFormData((prev) => ({ ...prev, estado: event.target.value }))}
                  className="input-field"
                />
              </div>

              {formData.tipo === 'bautismo' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Padre</label>
                    <input
                      value={formData.bautismo_padre}
                      onChange={(event) => setFormData((prev) => ({ ...prev, bautismo_padre: event.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Madre</label>
                    <input
                      value={formData.bautismo_madre}
                      onChange={(event) => setFormData((prev) => ({ ...prev, bautismo_madre: event.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Padrinos (separados por coma)</label>
                    <input
                      value={formData.bautismo_padrinos}
                      onChange={(event) => setFormData((prev) => ({ ...prev, bautismo_padrinos: event.target.value }))}
                      className="input-field"
                    />
                  </div>
                </>
              )}

              {formData.tipo === 'confirmacion' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Obispo o delegado</label>
                    <input
                      value={formData.confirmacion_obispo}
                      onChange={(event) => setFormData((prev) => ({ ...prev, confirmacion_obispo: event.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Padrinos (separados por coma)</label>
                    <input
                      value={formData.confirmacion_padrinos}
                      onChange={(event) => setFormData((prev) => ({ ...prev, confirmacion_padrinos: event.target.value }))}
                      className="input-field"
                    />
                  </div>
                </>
              )}

              {formData.tipo === 'matrimonio' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cónyuge 1</label>
                    <input
                      value={formData.matrimonio_conyuge_1}
                      onChange={(event) => setFormData((prev) => ({ ...prev, matrimonio_conyuge_1: event.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cónyuge 2</label>
                    <input
                      value={formData.matrimonio_conyuge_2}
                      onChange={(event) => setFormData((prev) => ({ ...prev, matrimonio_conyuge_2: event.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Género de matrimonio</label>
                    <select
                      className="input-field"
                      value={formData.matrimonio_genero_matrimonio}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, matrimonio_genero_matrimonio: event.target.value }))
                      }
                    >
                      <option value="canonico">Canónico</option>
                      <option value="ecumenico">Ecuménico</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dispensa matrimonial</label>
                    <input
                      value={formData.matrimonio_dispensa_matrimonial}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, matrimonio_dispensa_matrimonial: event.target.value }))
                      }
                      className="input-field"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Testigos (separados por coma)</label>
                    <input
                      value={formData.matrimonio_testigos}
                      onChange={(event) => setFormData((prev) => ({ ...prev, matrimonio_testigos: event.target.value }))}
                      className="input-field"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={(event) => setFormData((prev) => ({ ...prev, notas: event.target.value }))}
                  className="input-field"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
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
