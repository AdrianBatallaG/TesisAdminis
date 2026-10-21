import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { CalendarClock, Edit2, Mail, MapPin, Plus, Trash2, User } from 'lucide-react';

const emptyForm = {
  titulo: '',
  descripcion: '',
  fecha: new Date().toISOString().slice(0, 10),
  hora: '10:00',
  lugar: '',
  responsable: '',
  contacto: '',
  estado: 'programada',
  publico: true,
  notas: '',
};

const statusLabels = {
  programada: 'Programada',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

const statusClasses = {
  programada: 'bg-blue-100 text-blue-800',
  completada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
};

export const VisitasPastoralesPage = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('editor');
  const canDelete = hasPermission('admin');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const loadItems = async () => {
    try {
      const response = await apiService.getVisitasPastorales();
      setItems(response.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar las visitas pastorales.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      titulo: item.titulo || '',
      descripcion: item.descripcion || '',
      fecha: item.fecha || new Date().toISOString().slice(0, 10),
      hora: item.hora || '',
      lugar: item.lugar || '',
      responsable: item.responsable || '',
      contacto: item.contacto || '',
      estado: item.estado || 'programada',
      publico: Boolean(item.publico),
      notas: item.notas || '',
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
        await apiService.updateVisitaPastoral(editingId, formData);
      } else {
        await apiService.createVisitaPastoral(formData);
      }
      await loadItems();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar la visita pastoral.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta visita pastoral?')) {
      return;
    }

    try {
      await apiService.deleteVisitaPastoral(id);
      await loadItems();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar la visita pastoral.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visitas pastorales</h1>
            <p className="text-gray-600 mt-1">Agenda, seguimiento y responsables de las visitas a la comunidad.</p>
          </div>
          {canManage && (
            <button type="button" className="btn-primary flex items-center gap-2" onClick={openCreate}>
              <Plus size={18} />
              Nueva visita
            </button>
          )}
        </div>
      </div>

      {error && <div className="card border border-red-200 text-red-700">{error}</div>}

      {loading ? (
        <div className="card">Cargando visitas pastorales...</div>
      ) : items.length === 0 ? (
        <div className="card">No hay visitas pastorales registradas.</div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[280px] flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarClock size={18} className="text-sage-700" />
                    <h2 className="text-xl font-semibold">{item.titulo}</h2>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusClasses[item.estado] || statusClasses.programada}`}>
                      {statusLabels[item.estado] || item.estado}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{item.descripcion || 'Sin descripción adicional.'}</p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-500">
                    <p className="flex items-center gap-2"><CalendarClock size={14} />{item.fecha} {item.hora ? `- ${item.hora}` : ''}</p>
                    <p className="flex items-center gap-2"><MapPin size={14} />{item.lugar}</p>
                    <p className="flex items-center gap-2"><User size={14} />{item.responsable}</p>
                    {item.contacto && <p className="flex items-center gap-2"><Mail size={14} />{item.contacto}</p>}
                  </div>
                  {item.notas && <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">{item.notas}</p>}
                </div>

                {canManage && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEdit(item)} className="text-blue-700 hover:bg-blue-50 p-2 rounded">
                      <Edit2 size={16} />
                    </button>
                    {canDelete && (
                      <button type="button" onClick={() => handleDelete(item.id)} className="text-red-700 hover:bg-red-50 p-2 rounded">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar visita pastoral' : 'Nueva visita pastoral'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Título</label>
                <input className="input-field" value={formData.titulo} onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha</label>
                <input type="date" className="input-field" value={formData.fecha} onChange={(e) => setFormData((prev) => ({ ...prev, fecha: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora</label>
                <input type="time" className="input-field" value={formData.hora} onChange={(e) => setFormData((prev) => ({ ...prev, hora: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lugar</label>
                <input className="input-field" value={formData.lugar} onChange={(e) => setFormData((prev) => ({ ...prev, lugar: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Responsable</label>
                <input className="input-field" value={formData.responsable} onChange={(e) => setFormData((prev) => ({ ...prev, responsable: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contacto</label>
                <input className="input-field" value={formData.contacto} onChange={(e) => setFormData((prev) => ({ ...prev, contacto: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select className="input-field" value={formData.estado} onChange={(e) => setFormData((prev) => ({ ...prev, estado: e.target.value }))}>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea rows={3} className="input-field" value={formData.descripcion} onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea rows={4} className="input-field" value={formData.notas} onChange={(e) => setFormData((prev) => ({ ...prev, notas: e.target.value }))} />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <input id="visita-publica" type="checkbox" checked={formData.publico} onChange={(e) => setFormData((prev) => ({ ...prev, publico: e.target.checked }))} />
                <label htmlFor="visita-publica" className="text-sm">Visible para el público</label>
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="btn-primary flex-1">{editingId ? 'Actualizar' : 'Guardar'}</button>
                <button type="button" className="btn-secondary flex-1" onClick={closeModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
