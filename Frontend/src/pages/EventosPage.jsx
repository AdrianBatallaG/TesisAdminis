import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  MapPin,
  Plus,
  Trash2,
  User,
  Users,
} from 'lucide-react';

const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const eventTypeMeta = {
  otro: { label: 'Otro', code: 'OTR', dotClass: 'bg-pink-500', chipClass: 'bg-pink-50 text-pink-800 border-pink-200' },
  misa: {
    label: 'Misa',
    code: 'MSA',
    dotClass: 'bg-blue-500',
    chipClass: 'bg-blue-100 text-blue-800 border-blue-200',
    barClass: 'bg-blue-500',
  },
  catequesis: {
    label: 'Catequesis',
    code: 'CAT',
    dotClass: 'bg-green-500',
    chipClass: 'bg-green-100 text-green-800 border-green-200',
    barClass: 'bg-green-500',
  },
  retiro: {
    label: 'Retiro',
    code: 'RET',
    dotClass: 'bg-purple-500',
    chipClass: 'bg-purple-100 text-purple-800 border-purple-200',
    barClass: 'bg-purple-500',
  },
  actividad_social: {
    label: 'Actividad social',
    code: 'SOC',
    dotClass: 'bg-orange-500',
    chipClass: 'bg-orange-100 text-orange-800 border-orange-200',
    barClass: 'bg-orange-500',
  },
};

const eventTypeOptions = Object.entries(eventTypeMeta).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const toIso = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseIsoDate = (iso) => {
  const [y, m, d] = String(iso).split('-').map((value) => Number(value));
  return new Date(y, (m || 1) - 1, d || 1);
};

const addDays = (date, days) => {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
};

const startOfWeekMonday = (date) => {
  const clone = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (clone.getDay() + 6) % 7;
  clone.setDate(clone.getDate() - mondayOffset);
  return clone;
};

const monthGridCells = (referenceDate, eventsByDate) => {
  const firstOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const gridStart = startOfWeekMonday(firstOfMonth);

  return Array.from({ length: 42 }, (_, index) => {
    const currentDate = addDays(gridStart, index);
    const iso = toIso(currentDate);
    return {
      date: currentDate,
      iso,
      inCurrentMonth: currentDate.getMonth() === referenceDate.getMonth(),
      events: eventsByDate[iso] || [],
    };
  });
};

const eventDateTime = (eventItem) => new Date(`${eventItem.fecha}T${eventItem.hora || '00:00'}`);

const inRange = (dateIso, fromIso, toIsoValue) => dateIso >= fromIso && dateIso <= toIsoValue;

export const EventosPage = () => {
  const { hasPermission } = useAuth();
  const canManageEvents = hasPermission('editor');
  const canDeleteEvents = hasPermission('admin');

  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [attendanceEvent, setAttendanceEvent] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({ nombre: '', email: '' });

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    fecha: toIso(new Date()),
    hora: '19:00',
    lugar: '',
    tipo_evento: 'misa',
    tipo_evento_otro: '',
    encargado: '',
  });

  useEffect(() => {
    const loadEventos = async () => {
      try {
        const response = await apiService.getEventos();
        setEventos(response.data || []);
        setError('');
      } catch (err) {
        setError(err?.response?.data?.message || 'No se pudieron cargar los eventos.');
        setEventos([]);
      } finally {
        setLoading(false);
      }
    };

    loadEventos();
  }, []);

  const refreshEventos = async () => {
    const response = await apiService.getEventos();
    setEventos(response.data || []);
  };

  const normalizedEvents = useMemo(
    () =>
      [...eventos]
        .map((eventItem) => ({
          ...eventItem,
          tipo_evento: eventItem.tipo_evento || 'actividad_social',
      tipo_evento_otro: eventItem.tipo_evento_otro || '',
          encargado: eventItem.encargado || 'No asignado',
        }))
        .sort((a, b) => eventDateTime(a) - eventDateTime(b)),
    [eventos]
  );

  const eventsByDate = useMemo(() => {
    return normalizedEvents.reduce((acc, eventItem) => {
      if (!acc[eventItem.fecha]) {
        acc[eventItem.fecha] = [];
      }
      acc[eventItem.fecha].push(eventItem);
      return acc;
    }, {});
  }, [normalizedEvents]);

  const currentWeekStart = useMemo(() => startOfWeekMonday(selectedDate), [selectedDate]);

  const visibleRange = useMemo(() => {
    if (viewMode === 'day') {
      const iso = toIso(selectedDate);
      return { from: iso, to: iso };
    }

    if (viewMode === 'week') {
      const from = toIso(currentWeekStart);
      const to = toIso(addDays(currentWeekStart, 6));
      return { from, to };
    }

    const first = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const last = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    return { from: toIso(first), to: toIso(last) };
  }, [currentWeekStart, selectedDate, viewMode]);

  const visibleEvents = useMemo(
    () => normalizedEvents.filter((eventItem) => inRange(eventItem.fecha, visibleRange.from, visibleRange.to)),
    [normalizedEvents, visibleRange]
  );

  const calendarCells = useMemo(() => monthGridCells(selectedDate, eventsByDate), [eventsByDate, selectedDate]);

  const weekDaysDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index)),
    [currentWeekStart]
  );

  const headerTitle = useMemo(() => {
    if (viewMode === 'day') {
      return selectedDate.toLocaleDateString('es-EC', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }

    if (viewMode === 'week') {
      const weekEnd = addDays(currentWeekStart, 6);
      return `Semana: ${currentWeekStart.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'short',
      })} - ${weekEnd.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}`;
    }

    return selectedDate.toLocaleDateString('es-EC', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentWeekStart, selectedDate, viewMode]);

  const moveCalendar = (direction) => {
    if (viewMode === 'day') {
      setSelectedDate((prev) => addDays(prev, direction));
      return;
    }

    if (viewMode === 'week') {
      setSelectedDate((prev) => addDays(prev, direction * 7));
      return;
    }

    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      titulo: '',
      descripcion: '',
      fecha: toIso(selectedDate),
      hora: '19:00',
      lugar: '',
      tipo_evento: 'misa',
    tipo_evento_otro: '',
      encargado: '',
    });
    setShowModal(true);
  };

  const openEditModal = (eventItem) => {
    setEditingId(eventItem.id);
    setFormData({
      titulo: eventItem.titulo || '',
      descripcion: eventItem.descripcion || '',
      fecha: eventItem.fecha || toIso(new Date()),
      hora: eventItem.hora || '19:00',
      lugar: eventItem.lugar || '',
      tipo_evento: eventItem.tipo_evento || 'actividad_social',
      tipo_evento_otro: eventItem.tipo_evento_otro || '',
      encargado: eventItem.encargado || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      if (editingId) {
        await apiService.updateEvento(editingId, formData);
      } else {
        await apiService.createEvento(formData);
      }

      await refreshEventos();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar el evento.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este evento?')) {
      return;
    }

    try {
      await apiService.deleteEvento(id);
      await refreshEventos();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el evento.');
    }
  };

  const openAttendance = async (eventItem) => {
    setAttendanceEvent(eventItem);
    setAttendanceRows([]);
    setAttendanceForm({ nombre: '', email: '' });
    setAttendanceLoading(true);

    try {
      const response = await apiService.getEventoAsistencias(eventItem.id);
      setAttendanceRows(response.data?.attendances || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar la asistencia del evento.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const submitAttendance = async (event) => {
    event.preventDefault();

    if (!attendanceEvent) {
      return;
    }

    try {
      await apiService.registrarAsistenciaEvento(attendanceEvent.id, attendanceForm);
      const response = await apiService.getEventoAsistencias(attendanceEvent.id);
      setAttendanceRows(response.data?.attendances || []);
      setAttendanceForm({ nombre: '', email: '' });
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo registrar la asistencia.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card !p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendario Litúrgico y Pastoral</h1>
          </div>

          {canManageEvents && (
            <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              Nuevo evento
            </button>
          )}
        </div>
      </div>

      {error && <div className="card border border-red-200 text-red-700">{error}</div>}

      <div className="event-calendar-layout"><div className="min-w-0 space-y-3">
      <div className="card !p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">


          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary !px-3 !py-2 flex items-center gap-1" onClick={() => moveCalendar(-1)}>
              <ChevronLeft size={16} />
              Anterior
            </button>
            <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => setSelectedDate(new Date())}>
              Hoy
            </button>
            <button type="button" className="btn-secondary !px-3 !py-2 flex items-center gap-1" onClick={() => moveCalendar(1)}>
              Siguiente
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <h2 className="text-xl font-semibold capitalize">{headerTitle}</h2>
      </div>

      {viewMode === 'month' && (
        <div className="card !p-3 overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[490px]">
            {dayNames.map((dayName) => (
              <div key={dayName} className="text-center text-xs font-semibold text-sage-700 bg-sage-100 rounded py-2">
                {dayName}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 min-w-[490px]">
            {calendarCells.map((cell) => (
              <div
                key={cell.iso}
                className={`min-h-[54px] border rounded-lg p-2 ${cell.iso === toIso(new Date()) ? 'bg-sage-100 border-sage-400 ring-1 ring-sage-300' : cell.inCurrentMonth ? 'bg-sage-50/50' : 'bg-gray-50 text-gray-400'}`}
              >
                <div className="text-sm font-semibold">{cell.date.getDate()}</div>
                <div className="space-y-1 mt-2">
                  {cell.events.slice(0, 3).map((eventItem) => {
                    const baseMeta = eventTypeMeta[eventItem.tipo_evento] || eventTypeMeta.actividad_social;
                    const meta = { ...baseMeta, label: eventItem.tipo_evento === 'otro' ? eventItem.tipo_evento_otro || 'Otro' : baseMeta.label };
                    return (
                      <button
                        key={eventItem.id}
                        type="button"
                        onClick={() => setSelectedDate(parseIsoDate(eventItem.fecha))}
                        className={`w-full text-left text-[11px] rounded px-2 py-1 border ${meta.chipClass} truncate`}
                        title={`${meta.code} - ${eventItem.titulo}`}
                      >
                        [{meta.code}] {eventItem.titulo}
                      </button>
                    );
                  })}
                  {cell.events.length > 3 && (
                    <p className="text-[11px] text-gray-500">+{cell.events.length - 3} más</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {weekDaysDates.map((dateItem) => {
            const iso = toIso(dateItem);
            const dayEvents = (eventsByDate[iso] || []).sort((a, b) => eventDateTime(a) - eventDateTime(b));

            return (
              <div key={iso} className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">
                    {dateItem.toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: 'short' })}
                  </h3>
                  <button type="button" className="text-sm text-sage-700 hover:underline" onClick={() => setSelectedDate(dateItem)}>
                    Ver día
                  </button>
                </div>

                {dayEvents.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin eventos</p>
                ) : (
                  <div className="space-y-2">
                    {dayEvents.map((eventItem) => {
                      const baseMeta = eventTypeMeta[eventItem.tipo_evento] || eventTypeMeta.actividad_social;
                    const meta = { ...baseMeta, label: eventItem.tipo_evento === 'otro' ? eventItem.tipo_evento_otro || 'Otro' : baseMeta.label };
                      return (
                        <div key={eventItem.id} className="rounded-md border overflow-hidden">
                          <div className={`h-1 ${meta.barClass}`}></div>
                          <div className="p-2">
                            <p className="text-xs text-gray-500">{eventItem.hora}</p>
                            <p className="font-medium">{eventItem.titulo}</p>
                            <p className={`inline-block text-xs px-2 py-0.5 rounded border mt-1 ${meta.chipClass}`}>
                              [{meta.code}] {meta.label}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'day' && (
        <div className="card">
          <h3 className="font-semibold mb-4">
            {selectedDate.toLocaleDateString('es-EC', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </h3>

          {(eventsByDate[toIso(selectedDate)] || []).length === 0 ? (
            <p className="text-sm text-gray-500">No hay eventos para este día.</p>
          ) : (
            <div className="space-y-3">
              {(eventsByDate[toIso(selectedDate)] || [])
                .sort((a, b) => eventDateTime(a) - eventDateTime(b))
                .map((eventItem) => {
                  const baseMeta = eventTypeMeta[eventItem.tipo_evento] || eventTypeMeta.actividad_social;
                    const meta = { ...baseMeta, label: eventItem.tipo_evento === 'otro' ? eventItem.tipo_evento_otro || 'Otro' : baseMeta.label };
                  return (
                    <div key={eventItem.id} className="rounded-lg border overflow-hidden">
                      <div className={`h-1.5 ${meta.barClass}`}></div>
                      <div className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-gray-500">{eventItem.hora}</p>
                            <h4 className="text-lg font-semibold">{eventItem.titulo}</h4>
                            <p className={`inline-block text-xs px-2 py-0.5 rounded border mt-1 ${meta.chipClass}`}>
                              [{meta.code}] {meta.label}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mt-3">{eventItem.descripcion || 'Sin descripción'}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

</div><aside className="card !p-4 space-y-6 self-start" aria-label="Opciones del calendario">          <div className="flex items-center gap-2">
            {[
              { value: 'day', label: 'Día' },
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mes' },
            ].map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setViewMode(mode.value)}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  viewMode === mode.value
                    ? 'bg-sage-700 text-white border-sage-700'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>      <div className="space-y-4">

        <div className="grid grid-cols-1 gap-4">
          {Object.entries(eventTypeMeta).map(([type, meta]) => (
            <div key={type} className="flex items-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full ${meta.dotClass}`}></span>
              <span className="font-medium">{meta.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded border ${meta.chipClass}`}>{meta.code}</span>
            </div>
          ))}
        </div>
      </div>

</aside></div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Eventos del período seleccionado</h2>
        {visibleEvents.length === 0 ? (
          <div className="card text-gray-600">No hay eventos para este período.</div>
        ) : (
          visibleEvents.map((eventItem) => {
            const baseMeta = eventTypeMeta[eventItem.tipo_evento] || eventTypeMeta.actividad_social;
                    const meta = { ...baseMeta, label: eventItem.tipo_evento === 'otro' ? eventItem.tipo_evento_otro || 'Otro' : baseMeta.label };

            return (
              <div key={eventItem.id} className="card border-l-4" style={{ borderLeftColor: '#334155' }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{eventItem.titulo}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded border ${meta.chipClass}`}>
                        [{meta.code}] {meta.label}
                      </span>
                    </div>
                    <p className="text-gray-700">{eventItem.descripcion || 'Sin descripción'}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <CalendarIcon size={15} className="text-sage-700" />
                        {new Date(`${eventItem.fecha}T00:00`).toLocaleDateString('es-EC', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock size={15} className="text-sage-700" />
                        {eventItem.hora}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin size={15} className="text-sage-700" />
                        {eventItem.lugar}
                      </p>
                      <p className="flex items-center gap-2">
                        <User size={15} className="text-sage-700" />
                        Responsable: {eventItem.encargado}
                      </p>
                    </div>
                  </div>

                  {canManageEvents && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAttendance(eventItem)}
                        className="text-sage-700 hover:bg-sage-50 p-2 rounded-lg transition-colors"
                        title="Asistencia"
                      >
                        <Users size={20} />
                      </button>
                      <button
                        onClick={() => openEditModal(eventItem)}
                        className="text-primary-600 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={20} />
                      </button>
                      {canDeleteEvents && (
                        <button
                          onClick={() => handleDelete(eventItem.id)}
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
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{editingId ? 'Editar evento' : 'Nuevo evento'}</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(event) => setFormData({ ...formData, descripcion: event.target.value })}
                  className="input-field"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha *</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(event) => setFormData({ ...formData, fecha: event.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hora *</label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(event) => setFormData({ ...formData, hora: event.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de evento *</label>
                  <select
                    value={formData.tipo_evento}
                    onChange={(event) => setFormData({ ...formData, tipo_evento: event.target.value })}
                    className="input-field"
                    required
                  >
                    {eventTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                </div>
                  {formData.tipo_evento === 'otro' && <label className="block text-sm">Especifica el tipo de evento *<input required maxLength={80} className="input-field mt-2" value={formData.tipo_evento_otro} onChange={e=>setFormData(prev=>({...prev,tipo_evento_otro:e.target.value}))} placeholder="Ej. Encuentro de familias" /></label>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Responsable *</label>
                  <input
                    type="text"
                    value={formData.encargado}
                    onChange={(event) => setFormData({ ...formData, encargado: event.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Localización *</label>
                <input
                  type="text"
                  value={formData.lugar}
                  onChange={(event) => setFormData({ ...formData, lugar: event.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {attendanceEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Asistencia: {attendanceEvent.titulo}</h2>
              <button type="button" className="btn-secondary" onClick={() => setAttendanceEvent(null)}>
                Cerrar
              </button>
            </div>

            <form onSubmit={submitAttendance} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input
                className="input-field"
                placeholder="Nombre"
                value={attendanceForm.nombre}
                onChange={(event) => setAttendanceForm((prev) => ({ ...prev, nombre: event.target.value }))}
                required
              />
              <input
                type="email"
                className="input-field"
                placeholder="Correo (opcional)"
                value={attendanceForm.email}
                onChange={(event) => setAttendanceForm((prev) => ({ ...prev, email: event.target.value }))}
              />
              <button type="submit" className="btn-primary">
                Registrar asistencia
              </button>
            </form>

            {attendanceLoading ? (
              <p className="text-sm text-gray-600">Cargando asistencias...</p>
            ) : attendanceRows.length === 0 ? (
              <p className="text-sm text-gray-600">Aún no hay asistencias registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200">
                      <th className="py-2 pr-3">Nombre</th>
                      <th className="py-2 pr-3">Correo</th>
                      <th className="py-2 pr-3">Registrado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100">
                        <td className="py-2 pr-3">{row.nombre}</td>
                        <td className="py-2 pr-3">{row.email || '-'}</td>
                        <td className="py-2 pr-3">{new Date(row.registrado_en).toLocaleString('es-EC')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
