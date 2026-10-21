import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BellRing,
  CalendarClock,
  Camera,
  CheckCircle2,
  Circle,
  Edit2,
  FileText,
  HeartHandshake,
  MapPin,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';

const todayIso = new Date().toISOString().slice(0, 10);
const maxProfilePhotoBytes = 4 * 1024 * 1024;
const profilePhotoInputId = 'mi-cuenta-foto-perfil';

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const initialSacramentalStatus = {
  bautismo: { completed: false, fecha: null, parroquia: null },
  confirmacion: { completed: false, fecha: null, parroquia: null },
  matrimonio: { completed: false, fecha: null, parroquia: null },
};

const buildProfileFormState = (member = null) => ({
  telefono: member?.telefono || '',
  direccion: member?.direccion || '',
  fecha_nacimiento: member?.fecha_nacimiento || '',
  estado_civil: member?.estado_civil || '',
  numero_identificacion: member?.numero_identificacion || '',
  grupo_pastoral: member?.grupo_pastoral || '',
  foto_perfil: null,
});

export const MiCuentaPage = () => {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [memberProfile, setMemberProfile] = useState(null);
  const [mySacraments, setMySacraments] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [sacramentalStatus, setSacramentalStatus] = useState(initialSacramentalStatus);
  const [downloadingDonationId, setDownloadingDonationId] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [formData, setFormData] = useState(buildProfileFormState());

  useEffect(() => {
    const loadPage = async () => {
      try {
        const requests = [apiService.getMiPerfilMiembro(), apiService.getEventos({ from: todayIso })];

        if (hasPermission('sacraments.view_own')) {
          requests.push(apiService.getMisSacramentos());
        }

        if (hasPermission('finance.receipt_own')) {
          requests.push(apiService.getMisDonaciones());
        }

        const responses = await Promise.allSettled(requests);
        const [profileResponse, eventsResponse, sacramentsResponse, donationsResponse] = responses;

        if (profileResponse?.status === 'fulfilled') {
          const member = profileResponse.value.data?.member || null;
          setMemberProfile(member);
          setSacramentalStatus(profileResponse.value.data?.sacramental_status || initialSacramentalStatus);
          setFormData(buildProfileFormState(member));
        } else if (profileResponse) {
          setError(profileResponse.reason?.response?.data?.message || 'No se pudo cargar tu perfil.');
        }

        if (eventsResponse?.status === 'fulfilled') {
          setUpcomingEvents((eventsResponse.value.data || []).slice(0, 5));
        }

        if (sacramentsResponse?.status === 'fulfilled') {
          setMySacraments(sacramentsResponse.value.data || []);
        }

        if (donationsResponse?.status === 'fulfilled') {
          setMyDonations(donationsResponse.value.data || []);
        }
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [hasPermission]);

  const quickActions = useMemo(
    () => [
      { label: 'Solicitar certificado', path: '/solicitudes', icon: FileText },
      { label: 'Ver eventos', path: '/calendarios/eventos', icon: CalendarClock },
      { label: 'Realizar donacion', path: '/donaciones', icon: HeartHandshake },
    ],
    []
  );

  const groupTags = useMemo(() => {
    return String(memberProfile?.grupo_pastoral || formData.grupo_pastoral || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }, [formData.grupo_pastoral, memberProfile?.grupo_pastoral]);

  const hasPersonalData = useMemo(
    () =>
      Boolean(
        memberProfile?.telefono ||
          memberProfile?.direccion ||
          memberProfile?.fecha_nacimiento ||
          memberProfile?.estado_civil ||
          memberProfile?.numero_identificacion ||
          memberProfile?.grupo_pastoral
      ),
    [memberProfile]
  );

  const profilePhotoUrl = photoPreview || memberProfile?.foto_perfil_url || '';

  const resetProfileEditor = () => {
    setFormData(buildProfileFormState(memberProfile));
    setPhotoPreview('');
  };

  const openProfileModal = () => {
    setError('');
    setSuccess('');
    setFormData(buildProfileFormState(memberProfile));
    setPhotoPreview('');
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    if (saving) {
      return;
    }

    resetProfileEditor();
    setShowProfileModal(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      return;
    }

    if (file.size > maxProfilePhotoBytes) {
      setError('La foto de perfil no puede superar los 4 MB.');
      event.target.value = '';
      return;
    }

    setError('');
    setFormData((prev) => ({ ...prev, foto_perfil: file }));
    setPhotoPreview(URL.createObjectURL(file));
    setShowProfileModal(true);
    event.target.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = new FormData();
      payload.append('telefono', formData.telefono || '');
      payload.append('direccion', formData.direccion || '');
      payload.append('fecha_nacimiento', formData.fecha_nacimiento || '');
      payload.append('estado_civil', formData.estado_civil || '');
      payload.append('numero_identificacion', formData.numero_identificacion || '');
      payload.append('grupo_pastoral', formData.grupo_pastoral || '');

      if (formData.foto_perfil) {
        payload.append('foto_perfil', formData.foto_perfil);
      }

      const response = await apiService.updateMiPerfilMiembro(payload);
      const member = response.data?.member || null;

      setMemberProfile(member);
      setSacramentalStatus(response.data?.sacramental_status || initialSacramentalStatus);
      setSuccess(response.data?.message || 'Perfil actualizado correctamente.');
      setFormData(buildProfileFormState(member));
      setPhotoPreview('');
      setShowProfileModal(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar tu perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDonation = async (donation) => {
    try {
      setDownloadingDonationId(donation.id);
      const response = await apiService.downloadMiComprobanteDonacion(donation.id);
      downloadBlob(response.data, `comprobante-donacion-${donation.id}.pdf`);
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo descargar el comprobante.');
    } finally {
      setDownloadingDonationId(null);
    }
  };

  if (loading) {
    return <div className="card">Cargando tu cuenta...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <div className="card space-y-5">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt={user?.name} className="h-40 w-40 rounded-full object-cover border-4 border-sage-100 shadow-sm" />
              ) : (
                <div className="h-40 w-40 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center border-4 border-sage-100 shadow-sm">
                  <User size={54} />
                </div>
              )}

              <label
                htmlFor={profilePhotoInputId}
                className={`absolute bottom-2 right-2 h-11 w-11 rounded-full bg-sage-700 text-white flex items-center justify-center shadow-md transition-colors ${
                  user?.activity_blocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-sage-800'
                }`}
                title={user?.activity_blocked ? 'Tu cuenta no puede realizar cambios ahora mismo.' : 'Cambiar foto de perfil'}
              >
                <Camera size={18} />
              </label>
              <input
                id={profilePhotoInputId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={user?.activity_blocked}
              />
            </div>

            <h1 className="text-2xl font-bold mt-4">{user?.name}</h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="font-medium">Rol</span>
              <span className="capitalize">{user?.role}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="font-medium">Actividad</span>
              <span>{user?.activity_blocked ? 'Bloqueada' : 'Habilitada'}</span>
            </div>
            <div className="flex items-center justify-between pb-1">
              <span className="font-medium">Perfil parroquial</span>
              <span>{memberProfile ? 'Listo para editar' : 'Se creara al guardar'}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Accesos rapidos</h2>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.path} to={action.path} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="p-2 rounded-md bg-sage-100 text-sage-700"><Icon size={16} /></div>
                  <span className="text-sm font-medium text-gray-800">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {error && <div className="card border border-red-200 text-red-700">{error}</div>}
          {success && <div className="card border border-green-200 text-green-700">{success}</div>}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card space-y-5 xl:col-span-2">
              <div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Datos personales</h2>
                  <p className="text-sm text-gray-500 mt-1">Revisa tu informacion y editala solo cuando lo necesites.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                <p><span className="font-medium">Telefono:</span> {memberProfile?.telefono || 'No registrado'}</p>
                <p><span className="font-medium">Direccion:</span> {memberProfile?.direccion || 'No registrada'}</p>
                <p><span className="font-medium">Fecha de nacimiento:</span> {memberProfile?.fecha_nacimiento || 'No registrada'}</p>
                <p><span className="font-medium">Estado civil:</span> {memberProfile?.estado_civil || 'No registrado'}</p>
                <p><span className="font-medium">Cedula:</span> {memberProfile?.numero_identificacion || 'No registrada'}</p>
                <p><span className="font-medium">Participacion:</span> {memberProfile?.historial_participacion || 'Sin historial registrado'}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3">Grupo al que pertenece</p>
                <div className="flex flex-wrap gap-2">
                  {groupTags.length > 0 ? groupTags.map((group) => (
                    <span key={group} className="px-3 py-1 rounded-full bg-sage-100 text-sage-800 text-sm">{group}</span>
                  )) : <span className="text-sm text-gray-500">Sin grupo asignado.</span>}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={openProfileModal}
                  className="inline-flex items-center gap-2 rounded-md bg-sage-700 px-4 py-2 text-sm font-medium text-white hover:bg-sage-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={user?.activity_blocked}
                >
                  <Edit2 size={14} />
                  {hasPersonalData ? 'Editar datos personales' : 'Completar datos personales'}
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Estado sacramental</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'bautismo', label: 'Bautismo' },
                { key: 'confirmacion', label: 'Confirmacion' },
                { key: 'matrimonio', label: 'Matrimonio' },
              ].map((item) => {
                const state = sacramentalStatus[item.key] || { completed: false, fecha: null, parroquia: null };
                return (
                  <div key={item.key} className="border border-gray-200 rounded-xl p-4 bg-white">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                      {state.completed ? <CheckCircle2 className="text-green-600" size={18} /> : <Circle className="text-gray-300" size={18} />}
                      <span>{item.label}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">Estado: {state.completed ? 'Registrado' : 'Sin registro'}</p>
                    <p className="text-sm text-gray-600">Fecha: {state.fecha || 'No registrada'}</p>
                    <p className="text-sm text-gray-600">Parroquia: {state.parroquia || 'No registrada'}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card border border-sky-200 bg-sky-50 text-sky-900">
            <div className="flex items-start gap-3">
              <BellRing className="mt-0.5" size={18} />
              <div>
                <p className="font-semibold">Recordatorios y notificaciones</p>
                <p className="text-sm mt-1">Tu cuenta puede recibir recordatorios automaticos por correo electronico para eventos proximos.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <CalendarClock size={18} className="text-sage-700" />
                <h2 className="text-xl font-semibold">Proximos eventos para ti</h2>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-500">No hay eventos proximos registrados.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((eventItem) => (
                    <div key={eventItem.id} className="border border-gray-200 rounded-lg p-4">
                      <p className="font-medium text-gray-900">{eventItem.titulo}</p>
                      <p className="text-sm text-sage-700 mt-1">{eventItem.fecha} {eventItem.hora ? `- ${eventItem.hora}` : ''}</p>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-2"><MapPin size={14} />{eventItem.lugar || 'Lugar por confirmar'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Mis donaciones y comprobantes</h2>
              {myDonations.length === 0 ? (
                <p className="text-sm text-gray-500">Aun no hay donaciones asociadas a tu correo.</p>
              ) : (
                <div className="space-y-3">
                  {myDonations.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.categoria || 'Donacion'}</p>
                        <p className="text-sm text-gray-600">{item.fecha} · ${Number(item.monto || 0).toFixed(2)}</p>
                        {item.review_response && <p className="text-sm mt-2 whitespace-pre-wrap">Respuesta: {item.review_response}</p>}
                      </div>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleDownloadDonation(item)}
                        disabled={downloadingDonationId === item.id || item.review_status !== 'aprobado'}
                      >
                        {item.review_status !== 'aprobado' ? (item.review_status === 'rechazado' ? 'Rechazado' : 'Pendiente de revisión') : downloadingDonationId === item.id ? 'Descargando...' : 'Descargar constancia'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Historial sacramental asociado</h2>
            {mySacraments.length === 0 ? (
              <p className="text-sm text-gray-500">Todavia no hay registros sacramentales asociados a tu correo.</p>
            ) : (
              <div className="space-y-3">
                {mySacraments.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{item.tipo}</p>
                        <p className="text-sm text-gray-600">{item.nombre} {item.apellido}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-sage-100 text-sage-800">{item.fecha}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Parroquia: {item.lugar || 'No registrada'}</p>
                    <p className="text-sm text-gray-500">Certificado: {item.numero_certificado}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Editar datos personales</h2>
                <p className="text-sm text-gray-500 mt-1">Actualiza tu informacion personal y guarda los cambios cuando termines.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Telefono</label>
                <input name="telefono" className="input-field" value={formData.telefono} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Direccion</label>
                <input name="direccion" className="input-field" value={formData.direccion} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de nacimiento</label>
                <input name="fecha_nacimiento" type="date" className="input-field" value={formData.fecha_nacimiento} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado civil</label>
                <select name="estado_civil" className="input-field" value={formData.estado_civil} onChange={handleChange}>
                  <option value="">Selecciona una opcion</option>
                  <option value="soltero">Soltero/a</option>
                  <option value="casado">Casado/a</option>
                  <option value="divorciado">Divorciado/a</option>
                  <option value="viudo">Viudo/a</option>
                  <option value="union_libre">Union libre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Numero de identificacion (cedula)</label>
                <input name="numero_identificacion" className="input-field" value={formData.numero_identificacion} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Grupo al que pertenece</label>
                <input name="grupo_pastoral" className="input-field" value={formData.grupo_pastoral} onChange={handleChange} placeholder="Jovenes, Catequesis, Ministerio" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1" disabled={saving || user?.activity_blocked}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button type="button" onClick={closeProfileModal} className="btn-secondary flex-1" disabled={saving}>
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
