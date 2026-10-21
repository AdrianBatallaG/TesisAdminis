import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, Clock, Mail, MapPin, Phone, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { HomeVideo } from '../components/HomeVideo';

const todayIso = new Date().toISOString().slice(0, 10);
const dayLabels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const isStaff = ['admin', 'editor'].includes(user?.role);
  const [events, setEvents] = useState([]);
  const [massSchedules, setMassSchedules] = useState([]);

  useEffect(() => {
    const loadHome = async () => {
      try {
        const [eventsResponse, schedulesResponse] = await Promise.all([
          apiService.getEventos({ from: todayIso }),
          apiService.getHorarios({ tipo: 'misa' }),
        ]);

        setEvents((eventsResponse.data || []).slice(0, 3));
        setMassSchedules((schedulesResponse.data || []).slice(0, 4));
      } catch (error) {
        setEvents([]);
        setMassSchedules([]);
      }
    };

    loadHome();
  }, []);

  const publicServices = [
    { name: 'Videos', path: '/medios/videos', icon: Video, description: 'Mensajes y enseñanzas' },
    { name: 'Publicaciones', path: '/medios/publicaciones', icon: BookOpen, description: 'Noticias y anuncios' },
    { name: 'Eventos', path: '/calendarios/eventos', icon: Calendar, description: 'Próximas actividades' },
    { name: 'Horarios', path: '/horarios/misas', icon: Clock, description: 'Misas y atención' },
  ];

  return (
    <div className="space-y-12">
      <div className="home-hero gap-8 rounded-lg overflow-hidden shadow-md bg-white border border-gray-100">
        <HomeVideo />

        <div className="flex flex-col justify-center p-8 lg:p-12">
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-5xl font-serif text-sage-900 leading-tight">Bienvenidos a nuestra parroquia</h1>

            <p className="text-lg text-gray-700 leading-relaxed">
              Un lugar donde la fe, la esperanza y el amor se encuentran. Consulta el calendario, los horarios y el contenido pastoral desde un solo lugar.
            </p>

            {isStaff && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="border border-sage-100 rounded-lg p-4 bg-sage-50">
                <p className="text-sm text-gray-500">Eventos próximos</p>
                <p className="text-2xl font-bold text-sage-800 mt-1">{events.length}</p>
              </div>
              <div className="border border-sage-100 rounded-lg p-4 bg-sage-50">
                <p className="text-sm text-gray-500">Horarios de misa</p>
                <p className="text-2xl font-bold text-sage-800 mt-1">{massSchedules.length}</p>
              </div>
              <div className="border border-sage-100 rounded-lg p-4 bg-sage-50">
                <p className="text-sm text-gray-500">Portal del feligrés</p>
                <p className="text-2xl font-bold text-sage-800 mt-1">Activo</p>
              </div>
            </div>}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {!isAuthenticated ? (
                <>
                  <Link to="/register" className="btn-primary text-center">Únete a la comunidad</Link>
                  <Link to="/calendarios/eventos" className="btn-secondary text-center">Ver próximos eventos</Link>
                </>
              ) : (
                <>
                  <Link to={isStaff ? "/dashboard" : "/solicitudes"} className="btn-primary text-center">{isStaff ? "Ir al dashboard" : "Solicitar documentos"}</Link>
                  <Link to="/mi-cuenta" className="btn-secondary text-center">Ir a mi cuenta</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card">
          <h2 className="text-3xl font-serif text-sage-900 mb-6">Nuestra misión</h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              Somos una comunidad católica comprometida con el servicio a Dios y a nuestro prójimo. Compartimos la fe a través de la oración, la celebración de los sacramentos y el acompañamiento a las familias.
            </p>
            <p>
              Inspirados por San Francisco de Asís, buscamos vivir el Evangelio con sencillez, fraternidad y amor por la creación. Queremos ser una parroquia que acoge, escucha y sirve, especialmente a quienes más lo necesitan.
            </p>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-sage-50 to-white">
          <h3 className="text-2xl font-serif text-sage-900 mb-6">Contacto</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="text-sage-700 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-medium text-gray-900 text-sm">Dirección</p>
                <p className="text-sm text-gray-600 mt-1">Calle Principal #123</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="text-sage-700 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-medium text-gray-900 text-sm">Teléfono</p>
                <p className="text-sm text-gray-600 mt-1">+593 55 555 5555</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="text-sage-700 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-medium text-gray-900 text-sm">Correo</p>
                <p className="text-sm text-gray-600 mt-1">correo@parroquia.com</p>
              </div>
            </div>
            <div className="pt-4 border-t border-sage-200">
              <p className="font-medium text-gray-900 text-sm mb-2">Horario de atención</p>
              <p className="text-xs text-gray-600 leading-relaxed">Lunes a Viernes: 9:00 AM - 6:00 PM<br />Sábados: 9:00 AM - 1:00 PM</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif text-sage-900 mb-2">Nuestros servicios</h2>
          <div className="w-24 h-px bg-sage-300 mx-auto"></div>
        </div>

        <div className="home-services gap-6">
          {publicServices.map((service) => {
            const Icon = service.icon;
            return (
              <Link key={service.path} to={service.path} className="card text-center hover:shadow-lg transition-all group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-sage-100 rounded-full mb-4 group-hover:bg-sage-200 transition-colors">
                  <Icon className="text-sage-700" size={28} />
                </div>
                <h3 className="font-serif text-lg text-sage-900 mb-2">{service.name}</h3>
                <p className="text-sm text-gray-600">{service.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-serif text-sage-900">Próximos eventos</h2>
            <Link to="/calendarios/eventos" className="text-sm text-sage-700 hover:text-sage-900 font-medium">Ver todos</Link>
          </div>

          {events.length === 0 ? (
            <p className="text-sm text-gray-500">No hay eventos próximos publicados.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {events.map((eventItem) => (
                <div key={eventItem.id} className="p-5 bg-gradient-to-br from-sage-50 to-white rounded-lg border border-sage-100">
                  <Calendar className="text-sage-700 mb-3" size={24} />
                  <h3 className="font-serif text-lg text-sage-900 mb-2">{eventItem.titulo}</h3>
                  <p className="text-sm text-sage-700 mb-2">{eventItem.fecha} {eventItem.hora ? `- ${eventItem.hora}` : ''}</p>
                  <p className="text-sm text-gray-600">{eventItem.descripcion || eventItem.lugar || 'Actividad pastoral programada.'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-serif text-sage-900">Horarios de misa</h2>
            <Link to="/horarios/misas" className="text-sm text-sage-700 hover:text-sage-900 font-medium">Ver todos</Link>
          </div>

          {massSchedules.length === 0 ? (
            <p className="text-sm text-gray-500">No hay horarios publicados todavía.</p>
          ) : (
            <div className="space-y-3">
              {massSchedules.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{item.titulo}</p>
                    <p className="text-sm text-gray-600 mt-1">{dayLabels[item.dia_semana] || 'Horario'} · {item.hora_inicio}{item.hora_fin ? ` - ${item.hora_fin}` : ''}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-sage-100 text-sage-800 rounded-full">{item.lugar || 'Parroquia'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isAuthenticated && (
        <div className="bg-gradient-to-r from-sage-700 to-sage-800 rounded-lg p-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-serif text-white mb-2">¿Necesitas un documento?</h3>
              <p className="text-sage-100">Crea una cuenta para solicitar certificados y acceder a tu portal personal como feligrés.</p>
            </div>
            <Link to="/register" className="px-8 py-4 bg-white text-sage-800 rounded-md hover:bg-sage-50 transition-all shadow-md font-medium whitespace-nowrap">
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
