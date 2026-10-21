import { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';

const states = { pendiente: 'Pendiente', en_revision: 'En revisión', aprobado: 'Aprobado', rechazado: 'Rechazado', resuelto: 'Documento listo' };
const labels = { nombres_completos: 'Nombres completos', cedula: 'Cédula', numero_certificado: 'Certificado', tipo: 'Sacramento', anio: 'Año', fecha: 'Fecha', lugar: 'Lugar', email: 'Correo', nombre: 'Nombre' };
export const TicketsPage = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState({ status: 'pendiente', type: '' });
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [proof, setProof] = useState('');
  const [records, setRecords] = useState([]);
  const [recordId, setRecordId] = useState('');
  const [query, setQuery] = useState('');
  const [cedula, setCedula] = useState('');
  const [searched, setSearched] = useState(false);
  useEffect(() => () => { if (proof) URL.revokeObjectURL(proof); }, [proof]);
  const load = async () => {
    setLoading(true);
    try { const { data } = await apiService.getTickets({ ...filter, page }); setTickets(data.data); setLastPage(data.last_page); }
    catch { setError('No se pudo cargar la bandeja.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter, page]);
  const open = async (ticket) => {
    setBusy(true); setError(''); setProof(''); setRecords([]); setRecordId(''); setConfirmed(false); setSearched(false); setSelected(null);
    try { const { data } = await apiService.getTicket(ticket.id); setSelected(data); setResponse(data.response || ''); setCedula(data.details?.cedula || ''); setQuery(''); }
    catch { setError('No se pudo abrir el ticket.'); }
    finally { setBusy(false); }
  };
  const action = async (value) => {
    setBusy(true); setError('');
    try { const { data } = await apiService.updateTicket(selected.id, { action: value, version: selected.version, response, confirmed, sacrament_id: recordId ? Number(recordId) : null }); setSelected(data); await load(); }
    catch (err) { setError(Object.values(err.response?.data?.errors || {}).flat()[0] || err.response?.data?.message || 'No se pudo actualizar el ticket.'); }
    finally { setBusy(false); }
  };
  const viewProof = async () => {
    setBusy(true); setError('');
    try { const { data } = selected.type === 'documento' ? await apiService.getTicketProof(selected.id) : await apiService.getFotoComprobanteDonacion(selected.donation.id); setProof(URL.createObjectURL(data)); }
    catch { setError('No se pudo cargar la foto del comprobante.'); }
    finally { setBusy(false); }
  };
  const search = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setRecordId(''); setConfirmed(false);
    try { const { data } = await apiService.getSacramentos({ cedula: cedula.trim(), q: query.trim() }); setRecords(data); setSearched(true); }
    catch { setError('No se pudieron buscar los registros.'); }
    finally { setBusy(false); }
  };
  const mine = selected?.assigned_to === user?.id;
  const active = selected && ['pendiente', 'en_revision'].includes(selected.status);
  return <div className="space-y-6">
    <div className="card"><h1 className="text-2xl font-bold">Bandeja de tickets</h1><p className="text-gray-600 mt-2">Solicitudes de documentos y comprobantes de donación pendientes. Toma un ticket para atenderlo y deja una respuesta al solicitante.</p></div>
    {error && <div role="alert" className="card border border-red-200 text-red-700">{error}</div>}
    <div className="card flex flex-wrap gap-3 items-end">
      <label className="text-sm">Estado<select className="input-field mt-1" value={filter.status} onChange={(e) => { setPage(1); setFilter({ ...filter, status: e.target.value }); }}><option value="">Todos</option>{Object.entries(states).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
      <label className="text-sm">Tipo<select className="input-field mt-1" value={filter.type} onChange={(e) => { setPage(1); setFilter({ ...filter, type: e.target.value }); }}><option value="">Todos</option><option value="documento">Documentos</option><option value="donacion">Donaciones</option></select></label>
      <button className="btn-secondary" onClick={load} disabled={loading}>Actualizar bandeja</button>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
      <div className="card space-y-3">
        {loading && <p>Cargando tickets...</p>}
        {!loading && !tickets.length && <p className="text-gray-500">No hay tickets con estos filtros.</p>}
        {tickets.map((ticket) => <button key={ticket.id} type="button" disabled={busy} onClick={() => open(ticket)} className={`w-full text-left border rounded-lg p-4 space-y-1 ${selected?.id === ticket.id ? 'border-sage-600 bg-sage-50' : 'hover:bg-gray-50'}`}>
          <p className="font-semibold">#{ticket.id} · {ticket.type === 'donacion' ? 'Revisión de donación' : 'Solicitud de documento'}</p>
          <p className="text-sm">{ticket.details?.nombres_completos || ticket.donation?.nombre}</p>
          <p className="text-sm text-sage-700">{states[ticket.status]} · {ticket.assigned_name || 'Sin asignar'}</p>
          <p className="text-xs text-gray-500">{new Date(ticket.created_at).toLocaleString('es-EC')}</p>
        </button>)}
        <div className="flex gap-3 items-center"><button className="btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Anterior</button><span>{page} / {lastPage}</span><button className="btn-secondary" disabled={page >= lastPage || loading} onClick={() => setPage(page + 1)}>Siguiente</button></div>
      </div>
      {selected && <section className="card space-y-4" aria-label="Detalle del ticket">
        <h2 className="text-xl font-semibold">Ticket #{selected.id} · {states[selected.status]}</h2>
        <p className="text-sm">Responsable: {selected.assigned_name || 'Sin asignar'}</p>
        <dl className="text-sm space-y-2 break-words">{Object.entries(selected.details || {}).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt className="font-semibold inline">{labels[key] || key}: </dt><dd className="inline">{value}</dd></div>)}<div>Contacto de la cuenta: {selected.requester_email || 'Enlace privado de seguimiento'}</div></dl>
        {selected.type === 'documento' && selected.has_proof && <div className="border rounded-lg p-4 space-y-3"><button className="btn-secondary" onClick={viewProof} disabled={busy}>Ver comprobante de pago</button>{proof && <><img src={proof} alt="Comprobante de pago de la solicitud" className="max-h-96 w-full object-contain border rounded" /><a href={proof} target="_blank" rel="noreferrer" className="underline text-sm">Abrir foto en tamaño completo</a></>}</div>}
        {selected.donation && <div className="border rounded-lg p-4 space-y-3">
          <p className="font-semibold">${Number(selected.donation.monto).toFixed(2)} · {selected.donation.fecha}</p><p>{selected.donation.categoria?.replaceAll('_', ' ')}</p>
          {selected.donation.tiene_comprobante ? <button className="btn-secondary" onClick={viewProof} disabled={busy}>Ver foto del comprobante</button> : <p className="text-amber-800">Este aporte no tiene una foto adjunta.</p>}
          {proof && <><img src={proof} alt="Comprobante enviado por el donante" className="max-h-96 w-full object-contain border rounded" /><a href={proof} target="_blank" rel="noreferrer" className="underline text-sm">Abrir foto en tamaño completo</a></>}
        </div>}
        {active && !selected.assigned_to && <button className="btn-primary" onClick={() => action('tomar')} disabled={busy}>Tomar ticket</button>}
        {active && selected.assigned_to && !mine && <p className="text-amber-800">Otro colaborador está atendiendo este ticket.</p>}
        {active && selected.assigned_to && (mine || user?.role === 'admin') && <button className="btn-secondary" onClick={() => action('liberar')} disabled={busy}>Devolver a pendientes</button>}
        {active && mine && <>
          {selected.type === 'documento' && <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold">Localizar registro sacramental</h3>
            <p className="text-sm text-gray-600">Si el archivo antiguo no tiene cédula, borra ese filtro y busca por nombre o certificado. Verifica la identidad antes de entregar el documento.</p>
            <form onSubmit={search} className="space-y-3"><label className="block text-sm">Cédula del registro<input className="input-field mt-1" value={cedula} onChange={(e) => setCedula(e.target.value)} /></label><label className="block text-sm">Nombre, apellido o certificado<input className="input-field mt-1" value={query} onChange={(e) => setQuery(e.target.value)} /></label><button className="btn-secondary" disabled={busy || (!cedula.trim() && !query.trim())}>Buscar registros</button></form>
            {searched && !records.length && <p className="text-sm">Sin coincidencias. Revisa el archivo parroquial o registra el sacramento desde el módulo de Sacramentos.</p>}
            <div className="max-h-64 overflow-auto space-y-2">{records.map((record) => <label key={record.id} className="block border rounded p-3 text-sm"><input type="radio" name="sacrament" value={record.id} checked={recordId === String(record.id)} onChange={() => { setRecordId(String(record.id)); setConfirmed(false); }} /> {record.nombre} {record.apellido}<span className="block">{record.tipo} · {record.fecha} · {record.numero_certificado} · Cédula: {record.cedula || 'Sin registrar'}</span></label>)}</div>
          </div>}
          <label className="block text-sm font-medium">Respuesta para el solicitante<textarea className="input-field mt-1" rows={3} maxLength={2000} value={response} onChange={(e) => setResponse(e.target.value)} /></label>
          <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />{selected.type === 'donacion' ? 'He revisado la foto y confirmado la recepción real del aporte.' : 'He verificado que el registro seleccionado corresponde a la persona solicitante.'}</label>
          <div className="flex flex-wrap gap-3"><button className="btn-secondary disabled:opacity-50" disabled={busy || !response.trim()} onClick={() => action('responder')}>Enviar respuesta sin cerrar</button><button className="btn-primary disabled:opacity-50" disabled={busy || !response.trim() || !confirmed || (selected.type === 'documento' && !recordId) || (selected.type === 'donacion' && !proof)} onClick={() => action(selected.type === 'donacion' ? 'aprobar' : 'resolver')}>{selected.type === 'donacion' ? 'Aprobar donación' : 'Entregar certificado'}</button><button className="btn-secondary disabled:opacity-50" disabled={busy || !response.trim()} onClick={() => action('rechazar')}>Rechazar con respuesta</button></div>
        </>}
        {!active && <p className="whitespace-pre-wrap text-sm">Respuesta: {selected.response}</p>}
        <button type="button" className="text-sm underline" disabled={busy} onClick={() => open(selected)}>Actualizar detalle</button>
      </section>}
    </div>
  </div>;
};
