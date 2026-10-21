import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';

const emptyForm = {
  nombre: '',
  email: '',
  telefono: '',
  direccion: '',
  grupo_pastoral: '',
  historial_participacion: '',
  activo: true,
};

export const MiembrosPage = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('editor');
  const canDelete = hasPermission('admin');

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const loadMembers = async (search = query) => {
    try {
      const response = await apiService.getMiembros(search ? { q: search } : {});
      setMembers(response.data);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los miembros.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (member) => {
    setEditingId(member.id);
    setFormData({
      nombre: member.nombre || '',
      email: member.email || '',
      telefono: member.telefono || '',
      direccion: member.direccion || '',
      grupo_pastoral: member.grupo_pastoral || '',
      historial_participacion: member.historial_participacion || '',
      activo: Boolean(member.activo),
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
        await apiService.updateMiembro(editingId, formData);
      } else {
        await apiService.createMiembro(formData);
      }
      await loadMembers();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el miembro.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar miembro?')) {
      return;
    }

    try {
      await apiService.deleteMiembro(id);
      await loadMembers();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el miembro.');
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    await loadMembers(query);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Miembros y feligreses</h1>
          <p className="text-gray-600 mt-1">Registro, contacto y grupos pastorales.</p>
        </div>
        {canEdit && (
          <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={18} />
            Nuevo miembro
          </button>
        )}
      </div>

      {error && <div className="card border border-red-200 text-red-700">{error}</div>}

      <form onSubmit={handleSearch} className="card">
        <label className="block text-sm font-medium mb-1">Buscar miembro</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="input-field pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, email o teléfono"
            />
          </div>
          <button type="submit" className="btn-secondary">
            Buscar
          </button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-gray-600">Cargando miembros...</p>
        ) : members.length === 0 ? (
          <p className="text-gray-600">No se encontraron miembros.</p>
        ) : (
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-left border-b border-gray-200 text-sm text-gray-600">
                <th className="py-3 pr-3">Nombre</th>
                <th className="py-3 pr-3">Contacto</th>
                <th className="py-3 pr-3">Grupo pastoral</th>
                <th className="py-3 pr-3">Estado</th>
                <th className="py-3 pr-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-gray-100">
                  <td className="py-3 pr-3">{member.nombre}</td>
                  <td className="py-3 pr-3">
                    <p>{member.email || '-'}</p>
                    <p className="text-xs text-gray-500">{member.telefono || '-'}</p>
                  </td>
                  <td className="py-3 pr-3">{member.grupo_pastoral || '-'}</td>
                  <td className="py-3 pr-3">{member.activo ? 'Activo' : 'Inactivo'}</td>
                  <td className="py-3 pr-3">
                    <div className="flex justify-end gap-2">
                      {canEdit && (
                        <button
                          onClick={() => openEdit(member)}
                          className="text-blue-700 hover:bg-blue-50 p-2 rounded"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(member.id)}
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
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar miembro' : 'Nuevo miembro'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  className="input-field"
                  value={formData.nombre}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Correo</label>
                <input
                  type="email"
                  className="input-field"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input
                  className="input-field"
                  value={formData.telefono}
                  onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Grupo pastoral</label>
                <input
                  className="input-field"
                  value={formData.grupo_pastoral}
                  onChange={(e) => setFormData((prev) => ({ ...prev, grupo_pastoral: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Dirección</label>
                <input
                  className="input-field"
                  value={formData.direccion}
                  onChange={(e) => setFormData((prev) => ({ ...prev, direccion: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Historial de participacion</label>
                <textarea
                  rows={3}
                  className="input-field"
                  value={formData.historial_participacion}
                  onChange={(e) => setFormData((prev) => ({ ...prev, historial_participacion: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  id="activo"
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, activo: e.target.checked }))}
                />
                <label htmlFor="activo" className="text-sm">
                  Miembro activo
                </label>
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
