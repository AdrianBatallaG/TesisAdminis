import { MediaUpload, MediaPlayback } from '../components/MediaUpload';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { Edit2, Gamepad2, Plus, Trash2 } from 'lucide-react';

const resourceTypes = [
  { value: 'juego', label: 'Juego' },
  { value: 'actividad', label: 'Actividad' },
  { value: 'lectura', label: 'Lectura' },
  { value: 'recurso', label: 'Recurso' },
  { value: 'otro', label: 'Otro' },
];

const emptyForm = {
  titulo: '',
  contenido: '',
  subtipo: 'actividad',
  url: '',
  imagen_url: '',
  edad_min: '',
  edad_max: '',
  duracion_minutos: '',
};

export const NinosJovenesPage = () => {
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
      const response = await apiService.getNinosJovenes();
      setItems(response.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los recursos.');
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
      contenido: item.contenido || '',
      subtipo: item.subtipo || 'actividad',
      url: item.url || '',
      imagen_url: item.imagen || '',
      edad_min: item.edad_min ?? '',
      edad_max: item.edad_max ?? '',
      duracion_minutos: item.duracion_minutos ?? '',
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

    const payload = {
      ...formData,
      edad_min: formData.edad_min === '' ? null : Number(formData.edad_min),
      edad_max: formData.edad_max === '' ? null : Number(formData.edad_max),
      duracion_minutos: formData.duracion_minutos === '' ? null : Number(formData.duracion_minutos),
    };

    try {
      if (editingId) {
        await apiService.updateNinosJovenes(editingId, payload);
      } else {
        await apiService.createNinosJovenes(payload);
      }
      await loadItems();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el recurso.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar este recurso?')) {
      return;
    }

    try {
      await apiService.deleteNinosJovenes(id);
      await loadItems();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el recurso.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Niños y jóvenes</h1>
          <p className="text-gray-600 mt-1">Juegos, actividades, lecturas y recursos para catequesis juvenil.</p>
        </div>
        {canManage && (
          <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={18} />
            Nuevo recurso
          </button>
        )}
      </div>

      {error && <div className="card border border-red-200 text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="card">Cargando recursos...</div>
        ) : items.length === 0 ? (
          <div className="card">
            <div className="flex items-center gap-2 text-gray-600">
              <Gamepad2 size={18} />
              No hay recursos publicados.
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card">
              {item.imagen && (
                <img src={item.imagen} alt={item.titulo} className="w-full h-44 object-cover rounded-md mb-3" />
              )}
              <p className="text-xs text-sage-700 font-medium uppercase">{item.subtipo}</p>
              <h3 className="text-lg font-semibold mt-1">{item.titulo}</h3>
              <p className="text-sm text-gray-600 mt-2">{item.contenido}</p>
              <div className="mt-3 text-sm text-gray-500 space-y-1">
                <p>
                  Edad: {item.edad_min ?? '-'} a {item.edad_max ?? '-'} años
                </p>
                <p>Duración: {item.duracion_minutos ?? '-'} min</p>
                <MediaPlayback url={item.url} title={item.titulo}/>
                {item.url && (
                  <a className="text-sage-700 hover:underline" href={item.url} target="_blank" rel="noreferrer">
                    Abrir recurso
                  </a>
                )}
              </div>
              <Link to={`/ninos-jovenes/${item.id}`} className="inline-block mt-3 text-sage-700 hover:underline text-sm font-medium">
                Ver actividad completa
              </Link>

              {canManage && (
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="text-blue-700 hover:bg-blue-50 p-2 rounded"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-700 hover:bg-red-50 p-2 rounded"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar recurso' : 'Nuevo recurso'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Título</label>
                <input
                  className="input-field"
                  value={formData.titulo}
                  onChange={(event) => setFormData((prev) => ({ ...prev, titulo: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  className="input-field"
                  value={formData.subtipo}
                  onChange={(event) => setFormData((prev) => ({ ...prev, subtipo: event.target.value }))}
                >
                  {resourceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duración (min)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={formData.duracion_minutos}
                  onChange={(event) => setFormData((prev) => ({ ...prev, duracion_minutos: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Edad mínima</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={formData.edad_min}
                  onChange={(event) => setFormData((prev) => ({ ...prev, edad_min: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Edad máxima</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={formData.edad_max}
                  onChange={(event) => setFormData((prev) => ({ ...prev, edad_max: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Recurso (enlace o archivo)</label>
                <input
                  className="input-field"
                  value={formData.url}
                  onChange={(event) => setFormData((prev) => ({ ...prev, url: event.target.value }))}
                  placeholder="https://..."
                />
<MediaUpload kind="resource" onUploaded={url => setFormData(prev => ({ ...prev, url: url }))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Imagen (enlace o archivo)</label>
                <input
                  className="input-field"
                  value={formData.imagen_url}
                  onChange={(event) => setFormData((prev) => ({ ...prev, imagen_url: event.target.value }))}
                  placeholder="https://..."
                />
<MediaUpload kind="image" onUploaded={url => setFormData(prev => ({ ...prev, imagen_url: url }))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  rows={4}
                  className="input-field"
                  value={formData.contenido}
                  onChange={(event) => setFormData((prev) => ({ ...prev, contenido: event.target.value }))}
                  required
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
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
