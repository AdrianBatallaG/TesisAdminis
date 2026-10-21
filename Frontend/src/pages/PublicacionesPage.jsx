import { MediaUpload, MediaPlayback } from '../components/MediaUpload';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';

export const PublicacionesPage = () => {
  const { hasPermission } = useAuth();
  const canManageContent = hasPermission('editor');
  const canDeleteContent = hasPermission('admin');

  const [publicaciones, setPublicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    imagen_url: '',
  });

  useEffect(() => {
    loadPublicaciones();
  }, []);

  const loadPublicaciones = async () => {
    try {
      const response = await apiService.getPublicaciones();
      setPublicaciones(response.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar las publicaciones.');
      setPublicaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      titulo: formData.titulo,
      contenido: formData.contenido,
      imagen_url: formData.imagen_url || null,
    };

    try {
      if (editingId) {
        await apiService.updatePublicacion(editingId, payload);
      } else {
        await apiService.createPublicacion(payload);
      }

      await loadPublicaciones();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar la publicación.');
    }
  };

  const handleEdit = (publicacion) => {
    setEditingId(publicacion.id);
    setFormData({
      titulo: publicacion.titulo || '',
      contenido: publicacion.contenido || '',
      imagen_url: publicacion.imagen || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta publicación?')) {
      return;
    }

    try {
      await apiService.deletePublicacion(id);
      await loadPublicaciones();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar la publicación.');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ titulo: '', contenido: '', imagen_url: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Publicaciones</h1>
          <p className="text-gray-600 mt-1">Noticias y anuncios de la parroquia</p>
        </div>

        {canManageContent && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Nueva publicación
          </button>
        )}
      </div>

      {error && <div className="card border border-red-200 text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6">
        {publicaciones.map((pub) => (
          <div key={pub.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {pub.imagen ? (
                    <img src={pub.imagen} alt={pub.titulo} className="w-24 h-24 object-cover rounded-lg" />
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="text-gray-400" size={32} />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{pub.titulo}</h3>
                    <p className="text-sm text-gray-500">
                      Por {pub.autor || 'Equipo parroquial'} -{' '}
                      {pub.fecha ? new Date(pub.fecha).toLocaleDateString('es-ES') : 'Sin fecha'}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">{pub.contenido}</p>
              </div>

              {canManageContent && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(pub)}
                    className="text-primary-600 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={20} />
                  </button>
                  {canDeleteContent && (
                    <button
                      onClick={() => handleDelete(pub.id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{editingId ? 'Editar publicación' : 'Nueva publicación'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(event) => setFormData({ ...formData, titulo: event.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contenido *</label>
                <textarea
                  value={formData.contenido}
                  onChange={(event) => setFormData({ ...formData, contenido: event.target.value })}
                  className="input-field"
                  rows="6"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imagen (enlace o archivo, opcional)</label>
                <input
                  type="url"
                  value={formData.imagen_url}
                  onChange={(event) => setFormData({ ...formData, imagen_url: event.target.value })}
                  className="input-field"
                  placeholder="https://..."
                />
<MediaUpload kind="image" onUploaded={url => setFormData(prev => ({ ...prev, imagen_url: url }))} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingId ? 'Actualizar' : 'Publicar'}
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
