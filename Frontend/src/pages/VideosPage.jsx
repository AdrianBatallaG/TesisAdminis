import { MediaUpload, MediaPlayback } from '../components/MediaUpload';
import { useState, useEffect } from 'react';
import { HomeVideoLibrary } from '../components/HomeVideoLibrary';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { Plus, Trash2, Upload } from 'lucide-react';

export const VideosPage = () => {
  const { hasPermission, user } = useAuth();
  const canManageContent = hasPermission('editor');
  const canDeleteContent = hasPermission('admin');

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newVideo, setNewVideo] = useState({
    titulo: '',
    descripcion: '',
    url: '',
  });

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const response = await apiService.getVideos();
      setVideos(response.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los videos.');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await apiService.createVideo(newVideo);
      await loadVideos();
      setShowModal(false);
      setNewVideo({ titulo: '', descripcion: '', url: '' });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear el video.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este video?')) {
      return;
    }

    try {
      await apiService.deleteVideo(id);
      await loadVideos();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el video.');
    }
  };

  const getEmbedUrl = (url) => {
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    return url;
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
          <h1 className="text-3xl font-bold text-gray-900">Videos</h1>
          <p className="text-gray-600 mt-1">Contenido multimedia de la parroquia</p>
        </div>
        {canManageContent && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Agregar video
          </button>
        )}
      </div>

      {user?.role === 'admin' && <HomeVideoLibrary />}
      {error && <div className="card border border-red-200 text-red-700">{error}</div>}

      {videos.length === 0 ? (
        <div className="card text-center py-12">
          <Upload className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay videos disponibles</h3>
          <p className="text-gray-600">{canManageContent ? 'Comienza agregando tu primer video.' : 'Aún no se han publicado videos.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="card">
              <div className="aspect-video bg-gray-900 rounded-lg mb-4 overflow-hidden">
                {/\.(mp4|webm)(?:\?|$)/i.test(video.url) ? <MediaPlayback url={video.url} title={video.titulo}/> : <iframe src={getEmbedUrl(video.url)} title={video.titulo} className="w-full h-full" allowFullScreen></iframe>}
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{video.titulo}</h3>
                  <p className="text-sm text-gray-600 mb-3">{video.descripcion}</p>
                  {video.fecha && (
                    <p className="text-xs text-gray-500">Publicado: {new Date(video.fecha).toLocaleDateString('es-ES')}</p>
                  )}
                </div>
                {canDeleteContent && (
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Eliminar video"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Agregar video</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                <input
                  type="text"
                  value={newVideo.titulo}
                  onChange={(event) => setNewVideo({ ...newVideo, titulo: event.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={newVideo.descripcion}
                  onChange={(event) => setNewVideo({ ...newVideo, descripcion: event.target.value })}
                  className="input-field"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video (enlace o archivo) *</label>
                <input
                  type="url"
                  value={newVideo.url}
                  onChange={(event) => setNewVideo({ ...newVideo, url: event.target.value })}
                  className="input-field"
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
<MediaUpload kind="video" onUploaded={url => setNewVideo(prev => ({ ...prev, url: url }))} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Guardar
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
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
