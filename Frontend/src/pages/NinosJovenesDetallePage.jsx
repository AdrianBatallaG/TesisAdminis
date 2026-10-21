import { MediaPlayback } from '../components/MediaUpload';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiService } from '../services/apiService';

export const NinosJovenesDetallePage = () => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiService.getNinosJovenesDetalle(id);
        setItem(response.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'No se pudo cargar la actividad.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return <div className="card">Cargando actividad...</div>;
  }

  if (error || !item) {
    return (
      <div className="card border border-red-200 text-red-700">
        {error || 'Actividad no encontrada.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-sage-700 font-semibold uppercase">{item.subtipo}</p>
            <h1 className="text-3xl font-bold mt-1">{item.titulo}</h1>
            <p className="text-sm text-gray-500 mt-2">
              Publicado por {item.autor || 'Equipo parroquial'} el {item.fecha || 'sin fecha'}
            </p>
          </div>
          <Link to="/ninos-jovenes" className="btn-secondary">
            Volver
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          {item.imagen && (
            <img src={item.imagen} alt={item.titulo} className="w-full h-[420px] object-cover rounded-lg mb-4" />
          )}
          <div className="prose max-w-none">
            <p className="text-gray-800 whitespace-pre-line">{item.contenido}</p>
          </div>

          <MediaPlayback url={item.url} title={item.titulo}/>
          {item.url && (
            <div className="mt-6">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="btn-primary inline-flex items-center"
              >
                Abrir recurso externo
              </a>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Ficha de actividad</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Tipo:</span> {item.subtipo}
            </p>
            <p>
              <span className="font-medium">Edad recomendada:</span> {item.edad_min ?? '-'} a {item.edad_max ?? '-'} años
            </p>
            <p>
              <span className="font-medium">Duración:</span> {item.duracion_minutos ?? '-'} minutos
            </p>
            <p>
              <span className="font-medium">Fecha:</span> {item.fecha || '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
