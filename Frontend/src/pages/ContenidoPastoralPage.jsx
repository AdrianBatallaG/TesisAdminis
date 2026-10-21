import { MediaUpload, MediaPlayback } from '../components/MediaUpload';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { BookOpen, Edit2, FileText, ImageIcon, Megaphone, Mic, Plus, Sparkles, Trash2 } from 'lucide-react';

const contentTypeMeta = {
  homilia: { label: 'Homilías', icon: Mic, color: 'text-blue-700 bg-blue-100' },
  reflexion: { label: 'Reflexiones diarias', icon: Sparkles, color: 'text-amber-700 bg-amber-100' },
  documento: { label: 'Documentos formativos', icon: FileText, color: 'text-green-700 bg-green-100' },
  galeria: { label: 'Galería de imágenes', icon: ImageIcon, color: 'text-purple-700 bg-purple-100' },
  anuncio: { label: 'Anuncios generales', icon: Megaphone, color: 'text-rose-700 bg-rose-100' },
};

const defaultFormData = {
  subtipo: 'homilia',
  titulo: '',
  contenido: '',
  url: '',
  imagen_url: '',
  audio_url: '',
  formato: 'pdf',
  album: '',
  fecha_evento: '',
  imagenes_texto: '',
};

const splitLines = (value = '') =>
  String(value)
    .split(/\r\n|\r|\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const buildPayload = (formData) => {
  const payload = {
    subtipo: formData.subtipo,
    titulo: formData.titulo,
    contenido: formData.contenido || null,
    url: formData.url || null,
    imagen_url: formData.imagen_url || null,
    datos_extra: {},
  };

  if (formData.subtipo === 'homilia') {
    payload.datos_extra = {
      audio_url: formData.audio_url || null,
    };
  }

  if (formData.subtipo === 'documento') {
    payload.datos_extra = {
      formato: formData.formato || 'pdf',
    };
  }

  if (formData.subtipo === 'galeria') {
    payload.datos_extra = {
      album: formData.album || null,
      fecha_evento: formData.fecha_evento || null,
      imagenes: splitLines(formData.imagenes_texto),
    };
  }

  return payload;
};

const mapItemToForm = (item) => {
  const extra = item.datos_extra || {};
  return {
    subtipo: item.tipo || 'homilia',
    titulo: item.titulo || '',
    contenido: item.contenido || '',
    url: item.url || '',
    imagen_url: item.imagen || '',
    audio_url: extra.audio_url || '',
    formato: extra.formato || 'pdf',
    album: extra.album || '',
    fecha_evento: extra.fecha_evento || '',
    imagenes_texto: Array.isArray(extra.imagenes) ? extra.imagenes.join('\n') : '',
  };
};

export const ContenidoPastoralPage = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('editor');
  const canDelete = hasPermission('admin');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState(defaultFormData);

  const loadItems = async (subtype = filterType) => {
    try {
      const params = subtype === 'all' ? {} : { subtipo: subtype };
      const response = await apiService.getContenidoPastoral(params);
      setItems(response.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar el contenido pastoral.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const key = item.tipo || 'anuncio';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  const openCreate = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setFormData(mapItemToForm(item));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const payload = buildPayload(formData);

      if (editingId) {
        await apiService.updateContenidoPastoral(editingId, payload);
      } else {
        await apiService.createContenidoPastoral(payload);
      }

      await loadItems();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el contenido pastoral.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este contenido pastoral?')) {
      return;
    }

    try {
      await apiService.deleteContenidoPastoral(id);
      await loadItems();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el contenido.');
    }
  };

  const renderPastoralCard = (item) => {
    const meta = contentTypeMeta[item.tipo] || contentTypeMeta.anuncio;
    const Icon = meta.icon;
    const extra = item.datos_extra || {};

    return (
      <div key={item.id} className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2">
              <span className={`inline-flex p-1.5 rounded ${meta.color}`}>
                <Icon size={16} />
              </span>
              <p className="text-sm text-gray-600">{meta.label}</p>
            </div>
            <h3 className="text-xl font-semibold mt-2">{item.titulo}</h3>
            <p className="text-xs text-gray-500 mt-1">
              Publicado: {item.fecha || '-'} | Autor: {item.autor || 'Equipo pastoral'}
            </p>
            {item.contenido && <p className="text-gray-700 mt-3 whitespace-pre-line">{item.contenido}</p>}

            {item.tipo === 'homilia' && extra.audio_url && (
              <a href={extra.audio_url} target="_blank" rel="noreferrer" className="inline-block mt-3 text-sage-700 hover:underline text-sm">
                Escuchar audio de homilía
              </a>
            )}

            {item.tipo === 'documento' && item.url && (
              <p className="text-sm mt-3">
                <a href={item.url} target="_blank" rel="noreferrer" className="text-sage-700 hover:underline">
                  Abrir documento formativo
                </a>{' '}
                ({extra.formato || 'documento'})
              </p>
            )}

            {item.tipo === 'galeria' && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-gray-600">
                  Álbum: {extra.album || item.titulo} | Fecha del evento: {extra.fecha_evento || 'No definida'}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(extra.imagenes || []).map((imageUrl) => (
                    <a key={imageUrl} href={imageUrl} target="_blank" rel="noreferrer" className="block">
                      <img src={imageUrl} alt={item.titulo} className="w-full h-24 object-cover rounded-md border" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {item.imagen && item.tipo !== 'galeria' && (
              <img src={item.imagen} alt={item.titulo} className="mt-3 w-full max-w-lg h-52 object-cover rounded-md border" />
            )}

            <MediaPlayback url={item.url} title={item.titulo}/><MediaPlayback url={extra.audio_url} title={item.titulo}/>
            {item.url && item.tipo !== 'documento' && (
              <a href={item.url} target="_blank" rel="noreferrer" className="inline-block mt-3 text-sage-700 hover:underline text-sm">
                Abrir recurso adjunto
              </a>
            )}
          </div>

          {canManage && (
            <div className="flex gap-2">
              <button type="button" onClick={() => openEdit(item)} className="text-blue-700 hover:bg-blue-50 p-2 rounded" title="Editar">
                <Edit2 size={16} />
              </button>
              {canDelete && (
                <button type="button" onClick={() => handleDelete(item.id)} className="text-red-700 hover:bg-red-50 p-2 rounded" title="Eliminar">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Contenido pastoral</h1>
            <p className="text-gray-600 mt-1">
              Homilías, reflexiones, documentos, galería y anuncios para la comunidad.
            </p>
          </div>

          {canManage && (
            <button type="button" className="btn-primary flex items-center gap-2" onClick={openCreate}>
              <Plus size={18} />
              Nuevo contenido
            </button>
          )}
        </div>
      </div>

      {error && <div className="card border border-red-200 text-red-700">{error}</div>}

      <div className="card">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              setFilterType('all');
              setLoading(true);
              await loadItems('all');
            }}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              filterType === 'all' ? 'bg-sage-700 text-white border-sage-700' : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            Todos
          </button>
          {Object.entries(contentTypeMeta).map(([type, meta]) => (
            <button
              key={type}
              type="button"
              onClick={async () => {
                setFilterType(type);
                setLoading(true);
                await loadItems(type);
              }}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                filterType === type ? 'bg-sage-700 text-white border-sage-700' : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card">Cargando contenido pastoral...</div>
      ) : items.length === 0 ? (
        <div className="card">
          <BookOpen size={18} className="inline mr-2 text-sage-700" />
          No hay contenido disponible para este filtro.
        </div>
      ) : filterType !== 'all' ? (
        <div className="space-y-4">{items.map((item) => renderPastoralCard(item))}</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(contentTypeMeta).map(([type, meta]) => {
            const sectionItems = groupedItems[type] || [];
            if (sectionItems.length === 0) {
              return null;
            }

            const Icon = meta.icon;

            return (
              <section key={type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex p-2 rounded ${meta.color}`}>
                    <Icon size={16} />
                  </span>
                  <h2 className="text-xl font-semibold">{meta.label}</h2>
                </div>
                {sectionItems.map((item) => renderPastoralCard(item))}
              </section>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{editingId ? 'Editar contenido pastoral' : 'Nuevo contenido pastoral'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo *</label>
                <select
                  className="input-field"
                  value={formData.subtipo}
                  onChange={(event) => setFormData((prev) => ({ ...prev, subtipo: event.target.value }))}
                  required
                >
                  {Object.entries(contentTypeMeta).map(([type, meta]) => (
                    <option key={type} value={type}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <input
                  className="input-field"
                  value={formData.titulo}
                  onChange={(event) => setFormData((prev) => ({ ...prev, titulo: event.target.value }))}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Contenido</label>
                <textarea
                  rows={5}
                  className="input-field"
                  value={formData.contenido}
                  onChange={(event) => setFormData((prev) => ({ ...prev, contenido: event.target.value }))}
                  placeholder="Texto principal del contenido pastoral"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Recurso adjunto (enlace o archivo)</label>
                <input
                  className="input-field"
                  value={formData.url}
                  onChange={(event) => setFormData((prev) => ({ ...prev, url: event.target.value }))}
                  placeholder="https://..."
                />
<MediaUpload kind="resource" onUploaded={url => setFormData(prev => ({ ...prev, url: url }))} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Imagen principal</label>
                <input
                  className="input-field"
                  value={formData.imagen_url}
                  onChange={(event) => setFormData((prev) => ({ ...prev, imagen_url: event.target.value }))}
                  placeholder="https://..."
                />
<MediaUpload kind="image" onUploaded={url => setFormData(prev => ({ ...prev, imagen_url: url }))} />
              </div>

              {formData.subtipo === 'homilia' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Audio de homilía (opcional)</label>
                  <input
                    className="input-field"
                    value={formData.audio_url}
                    onChange={(event) => setFormData((prev) => ({ ...prev, audio_url: event.target.value }))}
                    placeholder="https://...mp3"
                  />
<MediaUpload kind="audio" onUploaded={url => setFormData(prev => ({ ...prev, audio_url: url }))} />
                </div>
              )}

              {formData.subtipo === 'documento' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Formato</label>
                  <select
                    className="input-field"
                    value={formData.formato}
                    onChange={(event) => setFormData((prev) => ({ ...prev, formato: event.target.value }))}
                  >
                    <option value="pdf">PDF</option>
                    <option value="presentacion">Presentación</option>
                    <option value="guia">Guía</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              )}

              {formData.subtipo === 'galeria' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Álbum</label>
                    <input
                      className="input-field"
                      value={formData.album}
                      onChange={(event) => setFormData((prev) => ({ ...prev, album: event.target.value }))}
                      placeholder="Nombre del álbum"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha del evento</label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.fecha_evento}
                      onChange={(event) => setFormData((prev) => ({ ...prev, fecha_evento: event.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">URLs de imágenes (una por línea)</label>
                    <textarea
                      rows={5}
                      className="input-field"
                      value={formData.imagenes_texto}
                      onChange={(event) => setFormData((prev) => ({ ...prev, imagenes_texto: event.target.value }))}
                      placeholder={'https://imagen-1.jpg\nhttps://imagen-2.jpg'}
                    />
<MediaUpload kind="image" onUploaded={url => setFormData(prev => ({...prev, imagenes_texto: [prev.imagenes_texto, url].filter(Boolean).join('\n')}))} />
                  </div>
                </>
              )}

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

