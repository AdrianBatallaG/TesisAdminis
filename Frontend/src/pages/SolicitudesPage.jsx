import { ProofUpload } from '../components/ProofUpload';
import { useEffect, useRef, useState } from 'react';
import { apiService } from '../services/apiService';

const initialForm = { numero_certificado: '', cedula: '', nombres_completos: '', tipo: '', anio: '', email: '' };

export const SolicitudesPage = () => {
  const [formData, setFormData] = useState(initialForm);
  const [attachment, setAttachment] = useState(null);
  const [preview, setPreview] = useState('');
  const fileInput = useRef(null);
  useEffect(() => { if (!attachment) { setPreview(''); return; } const url = URL.createObjectURL(attachment); setPreview(url); return () => URL.revokeObjectURL(url); }, [attachment]);
  const selectFile = (event) => { const file = event.target.files?.[0]; setAttachment(null); setError(''); if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.'); event.target.value = ''; return; } setAttachment(file); };
  const removeFile = () => { setAttachment(null); if (fileInput.current) fileInput.current.value = ''; };
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const loadTickets = async () => { setRefreshing(true); try { const { data } = await apiService.getMyTickets(); setTickets(data.filter((ticket) => ticket.type === 'documento')); } catch { setError('No se pudo cargar el seguimiento. Intenta actualizarlo.'); } finally { setRefreshing(false); } };
  useEffect(() => { loadTickets(); }, []);
  const download = async (ticket) => { try { const { data } = await apiService.downloadTicketDocument(ticket.id); const url = URL.createObjectURL(data); const link = document.createElement('a'); link.href = url; link.download = `certificado-ticket-${ticket.id}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch { setError('No se pudo descargar el documento.'); } }; 
  const [error, setError] = useState('');
  const change = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setResult(null);
    setError('');
  };
  const field = (name, label, options = {}) => (
    <div>
      <label htmlFor={`certificate-${name}`} className="block text-sm font-medium mb-1">{label}</label>
      <input id={`certificate-${name}`} name={name} className="input-field" value={formData[name]} onChange={change} {...options} />
    </div>
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => payload.append(key, value.trim()));
    if (attachment) payload.append('comprobante', attachment);
    try {
      const response = await apiService.solicitarCertificadoSacramento(payload);
      setResult(response.data);
      setFormData(initialForm);
      removeFile();
      await loadTickets();
    } catch (err) {
      const validation = Object.values(err?.response?.data?.errors || {}).flat()[0];
      setError(validation || err?.response?.data?.message || 'No se pudo enviar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold mb-2">Solicitar documentos</h1>
        <p className="text-gray-600">Envía tu solicitud al equipo parroquial. El tipo de sacramento, nombres completos, cédula y correo electrónico son obligatorios. Puedes adjuntar el comprobante de pago para su revisión.</p>
      </div>
      <form className="card max-w-2xl space-y-5" onSubmit={handleSubmit}>
        <fieldset disabled={loading} className="space-y-5">
          {field('nombres_completos', 'Nombres y apellidos completos', { required: true, minLength: 5, maxLength: 511 })}
          {field('cedula', 'Número de cédula', { required: true, inputMode: 'numeric', pattern: '[0-9]{10}', maxLength: 10, title: 'Ingresa los 10 dígitos de la cédula.' })}
          {field('numero_certificado', 'Número de certificado (opcional)', { maxLength: 80 })}
          <div>
            <label htmlFor="certificate-tipo" className="block text-sm font-medium mb-1">Tipo de sacramento</label>
            <select id="certificate-tipo" name="tipo" required className="input-field" value={formData.tipo} onChange={change}>
              <option value="">Selecciona un sacramento</option>
              <option value="bautismo">Bautismo</option>
              <option value="comunion">Primera comunión</option>
              <option value="confirmacion">Confirmación</option>
              <option value="matrimonio">Matrimonio</option>
            </select>
          </div>
          {field('anio', 'Año del sacramento (opcional)', { type: 'number', min: 1500, max: new Date().getFullYear() })}
          {field('email', 'Correo electrónico', { type: 'email', required: true, maxLength: 255 })}
          <div className="border rounded-lg p-4 space-y-3">
            <ProofUpload id="document-proof" label="Foto del comprobante de pago (opcional)" inputRef={fileInput} attachment={attachment} onChange={selectFile} disabled={loading} />
            {preview && <><img src={preview} alt="Vista previa del comprobante de pago" className="max-h-64 max-w-full object-contain rounded" /><button type="button" onClick={removeFile} className="text-sm underline text-red-700">Quitar foto</button></>}
          </div>
          <p className="text-sm text-gray-500">Tu solicitud se enviará a la bandeja del equipo parroquial. Aquí podrás seguir su estado y descargar el documento cuando esté listo.</p>
          <button type="submit" className="btn-primary disabled:opacity-50" disabled={loading}>{loading ? 'Enviando...' : 'Solicitar documento'}</button>
        </fieldset>
      </form>
      {error && <div role="alert" className="card border border-red-200 text-red-700">{error}</div>}
      {result && <div role="status" className="card border border-green-200 text-green-800">{result.message} Ticket #{result.ticket?.id}.</div>}
      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Mis solicitudes</h2><button type="button" className="btn-secondary" onClick={loadTickets} disabled={refreshing}>{refreshing ? 'Actualizando...' : 'Actualizar estados'}</button></div>
        {!tickets.length && <p className="text-gray-500">Todavía no tienes solicitudes de documentos.</p>}
        {tickets.map((ticket) => <div key={ticket.id} className="border rounded-lg p-4 space-y-2">
          <p className="font-semibold">Ticket #{ticket.id} · {ticket.details?.tipo || 'Documento sacramental'}</p>
          <p className="text-sm">Estado: <strong>{({ pendiente: 'Pendiente', en_revision: 'En revisión', resuelto: 'Documento listo', rechazado: 'Rechazado' })[ticket.status] || ticket.status}</strong></p>
          <p className="text-sm text-gray-600">Enviado el {new Date(ticket.created_at).toLocaleString('es-EC')}</p>
          {ticket.has_proof && <p className="text-sm text-gray-600">Comprobante de pago adjunto para revisión.</p>}
          {ticket.response && <p className="text-sm whitespace-pre-wrap">Respuesta: {ticket.response}</p>}
          {ticket.document_ready && <button type="button" className="btn-primary" onClick={() => download(ticket)}>Descargar certificado</button>}
        </div>)}
      </div>
    </div>
  );
};
