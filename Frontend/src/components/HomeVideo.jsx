import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';

const defaultVideo = '/videos/iglesia.mp4';
const maxSize = 50 * 1024 * 1024;

export const HomeVideo = ({ manage = false }) => {
  const { user } = useAuth();
  const canEdit = manage && user?.role === 'admin' && !user?.activity_blocked;
  const [videoUrl, setVideoUrl] = useState(defaultVideo);
  const [editing, setEditing] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    apiService.getHomeVideo().then(({ data }) => {
      if (active) setVideoUrl(data.url || defaultVideo);
    }).catch(() => {
      if (active) setError('No se pudo consultar el video guardado. Recarga la página para reintentar.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selectFile = (event) => {
    const selected = event.target.files?.[0];
    setFile(null);
    setError('');
    setMessage('');
    if (!selected) return;
    if (!/\.(mp4|webm)$/i.test(selected.name) || selected.size > maxSize) {
      setError('Selecciona un archivo MP4 o WebM de hasta 50 MB.');
      event.target.value = '';
      return;
    }
    setFile(selected);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!file || saving) return;
    setSaving(true);
    setProgress(0);
    setError('');
    setMessage('');
    const payload = new FormData();
    payload.append('video', file);
    try {
      const { data } = await apiService.updateHomeVideo(payload, ({ loaded, total }) => {
        if (total) setProgress(Math.round(loaded / total * 100));
      });
      setVideoUrl(data.url || defaultVideo);
      setFile(null);
      setEditing(false);
      setMessage('Video actualizado. Ya está disponible para todos los visitantes.');
    } catch (failure) {
      setError(failure.response?.data?.errors?.video?.[0]
        || (failure.response?.status === 413 ? 'El servidor rechazó el tamaño del video.' : failure.response?.data?.message)
        || 'No se pudo guardar el video. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0">
      <div className={`${manage ? 'h-48 sm:h-64' : 'home-video'} relative overflow-hidden bg-gradient-to-br from-sage-900 to-sage-950 flex items-center justify-center`}>
        <video key={preview || videoUrl} src={preview || videoUrl} autoPlay={!manage} loop={!manage} muted playsInline preload={manage ? 'metadata' : 'auto'}
          controls={manage || Boolean(preview)} className="h-full w-full object-contain" aria-label="Video de bienvenida" />
        {preview && <span className="absolute left-3 top-3 rounded bg-white/95 px-3 py-1 text-sm">Vista previa sin guardar</span>}
      </div>
      {canEdit && (
        <div className="p-4 bg-white border-t border-gray-100 space-y-3">
          {!editing ? (
            <button type="button" className="btn-secondary flex items-center gap-2" onClick={() => { setEditing(true); setMessage(''); }}>
              <Upload size={18} /> Cambiar video de inicio
            </button>
          ) : (
            <form onSubmit={save} className="space-y-3" aria-label="Cambiar video de inicio">
              <label htmlFor="home-video-file" className="block text-sm font-medium">Nuevo video</label>
              <input id="home-video-file" type="file" accept="video/mp4,video/webm,.mp4,.webm"
                onChange={selectFile} disabled={saving} className="block w-full min-w-0 text-sm" aria-describedby="home-video-help" />
              <p id="home-video-help" className="text-sm text-gray-600">MP4 o WebM, hasta 50 MB. Revisa la vista previa y guarda para publicarlo.</p>
              {saving && <p role="status" className="text-sm">{progress < 100 ? `Subiendo video: ${progress}%` : 'Guardando video…'}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={!file || saving} className="btn-primary disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar video'}</button>
                <button type="button" disabled={saving} className="btn-secondary disabled:opacity-50"
                  onClick={() => { setEditing(false); setFile(null); setError(''); }}>Cancelar</button>
              </div>
            </form>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700">{message}</p>}
        </div>
      )}
    </div>
  );
};
