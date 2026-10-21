import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { Clock3, Edit2, MapPin, Plus, Trash2, User } from 'lucide-react';

const dayOptions = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const emptyForm = (tipo) => ({
  tipo,
  titulo: '',
  descripcion: '',
  dia_semana: 0,
  hora_inicio: '09:00',
  hora_fin: '',
  lugar: '',
  responsable: '',
  publico: true,
});

export const HorariosPage = ({ tipo = 'misa', title, description }) => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('editor');
  const canDelete = hasPermission('admin');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm(tipo));

  const loadItems = async () => {
    try {
      const response = await apiService.getHorarios({ tipo });
      setItems(response.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los horarios.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [tipo]);

  const groupedItems = useMemo(() => {
    return dayOptions.map((day) => ({
      ...day,
      items: items.filter((item) => Number(item.dia_semana) === day.value),
    }));
  }, [items]);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm(tipo));
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      tipo: item.tipo,
      titulo: item.titulo || '',
      descripcion: item.descripcion || '',
      dia_semana: Number(item.dia_semana ?? 0),
      hora_inicio: item.hora_inicio || '09:00',
      hora_fin: item.hora_fin || '',
      lugar: item.lugar || '',
      responsable: item.responsable || '',
      publico: Boolean(item.publico),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyForm(tipo));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingId) {
        await apiService.updateHorario(editingId, formData);
      } else {
        await apiService.createHorario(formData);
      }

      await loadItems();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el horario.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este horario?')) {
      return;
    }

    try {
      await apiService.deleteHorario(id);
      await loadItems();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el horario.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600 mt-1">{description}</p>
          </div>
          {canManage && (
            <button type="button" className="btn-primary flex items-center gap-2" onClick={openCreate}>
              <Plus size={18} />
              Nuevo horario
            </button>
          )}
        </div>
      </div>

      {error && <div className="card border border-red-200 text-red-700">{error}</div>}

      {loading ? (
        <div className="card">Cargando horarios...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {groupedItems.map((day) => (
            <div key={day.value} className="card">
              <div className="flex items-center gap-2 mb-4">
                <Clock3 size={18} className="text-sage-700" />
                <h2 className="text-xl font-semibold">{day.label}</h2>
              </div>

              {day.items.length === 0 ? (
                <p className="text-sm text-gray-500">Sin horarios registrados.</p>
              ) : (
                <div className="space-y-3">
                  {day.items.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{item.titulo}</p>
                          <p className="text-sm text-sage-700 mt-1">
                            {item.hora_inicio}
                            {item.hora_fin ? ` - ${item.hora_fin}` : ''}
                          </p>
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

                      {item.descripcion && <p className="text-sm text-gray-600 mt-2">{item.descripcion}</p>}

                      <div className="mt-3 text-sm text-gray-500 space-y-1">
                        {item.lugar && (
                          <p className="flex items-center gap-2">
                            <MapPin size={14} />
                            {item.lugar}
                          </p>
                        )}
                        {item.responsable && (
                          <p className="flex items-center gap-2">
                            <User size={14} />
                            {item.responsable}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar horario' : 'Nuevo horario'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Título</label>
                <input className="input-field" value={formData.titulo} onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Día</label>
                <select className="input-field" value={formData.dia_semana} onChange={(e) => setFormData((prev) => ({ ...prev, dia_semana: Number(e.target.value) }))}>
                  {dayOptions.map((day) => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <input className="input-field bg-gray-50" value={tipo === 'misa' ? 'Misa' : 'Atención'} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora de inicio</label>
                <input type="time" className="input-field" value={formData.hora_inicio} onChange={(e) => setFormData((prev) => ({ ...prev, hora_inicio: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora de fin</label>
                <input type="time" className="input-field" value={formData.hora_fin} onChange={(e) => setFormData((prev) => ({ ...prev, hora_fin: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lugar</label>
                <input className="input-field" value={formData.lugar} onChange={(e) => setFormData((prev) => ({ ...prev, lugar: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Responsable</label>
                <input className="input-field" value={formData.responsable} onChange={(e) => setFormData((prev) => ({ ...prev, responsable: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea rows={4} className="input-field" value={formData.descripcion} onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))} />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <input id={`publico-${tipo}`} type="checkbox" checked={formData.publico} onChange={(e) => setFormData((prev) => ({ ...prev, publico: e.target.checked }))} />
                <label htmlFor={`publico-${tipo}`} className="text-sm">Visible para el público</label>
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
