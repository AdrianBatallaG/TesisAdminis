import { MediaUpload, MediaPlayback } from '../components/MediaUpload';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { Edit2, Plus, ShoppingBag, Trash2 } from 'lucide-react';

const emptyForm = {
  titulo: '',
  contenido: '',
  imagen_url: '',
  precio: '',
  stock: '',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

export const ArticulosPage = () => {
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
      const response = await apiService.getArticulos();
      setItems(response.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los artículos.');
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
      contenido: item.descripcion || '',
      imagen_url: item.imagen || '',
      precio: item.precio || '',
      stock: item.stock ?? '',
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
      precio: Number(formData.precio),
      stock: formData.stock === '' ? null : Number(formData.stock),
    };

    try {
      if (editingId) {
        await apiService.updateArticulo(editingId, payload);
      } else {
        await apiService.createArticulo(payload);
      }
      await loadItems();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el artículo.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este artículo?')) {
      return;
    }

    try {
      await apiService.deleteArticulo(id);
      await loadItems();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el artículo.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Artículos de venta</h1>
          <p className="text-gray-600 mt-1">Librería y productos para la comunidad parroquial.</p>
        </div>
        {canManage && (
          <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={18} />
            Nuevo artículo
          </button>
        )}
      </div>

      {error && <div className="card border border-red-200 text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="card">Cargando artículos...</div>
        ) : items.length === 0 ? (
          <div className="card">
            <div className="flex items-center gap-2 text-gray-600">
              <ShoppingBag size={18} />
              No hay artículos publicados.
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card">
              {item.imagen && (
                <img src={item.imagen} alt={item.titulo} className="w-full h-44 object-cover rounded-md mb-3" />
              )}
              <h3 className="text-lg font-semibold">{item.titulo}</h3>
              <p className="text-sm text-gray-600 mt-1">{item.descripcion || 'Sin descripción'}</p>
              <p className="text-lg font-bold text-sage-800 mt-3">{formatCurrency(item.precio)}</p>
              <p className="text-sm text-gray-500">Stock: {item.stock ?? 'No definido'}</p>

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
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar artículo' : 'Nuevo artículo'}</h2>
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
                <label className="block text-sm font-medium mb-1">Precio</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  value={formData.precio}
                  onChange={(event) => setFormData((prev) => ({ ...prev, precio: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={formData.stock}
                  onChange={(event) => setFormData((prev) => ({ ...prev, stock: event.target.value }))}
                />
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
