import { ProofUpload } from '../components/ProofUpload';
import { useEffect, useRef, useState } from 'react';
import { apiService } from '../services/apiService';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';

const emptyForm = {
  nombre_donante: '',
  email_donante: '',
  monto: '',
  categoria: 'donacion_general',
  descripcion: '',
};

export const DonacionesPage = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [preview, setPreview] = useState('');
  const fileInput = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const tracking = new URLSearchParams(location.hash.slice(1));
  const trackedId = tracking.get('aporte');
  const trackedToken = tracking.get('token');
  const refreshStatus = async () => {
    if (!trackedId || !trackedToken) return;
    setChecking(true);
    try { const { data } = await apiService.getDonationStatus(trackedId, trackedToken); setReceipt((prev) => ({ ...prev, ...data })); setError(''); }
    catch { setError('No se pudo consultar el seguimiento. Verifica el enlace o inténtalo de nuevo.'); }
    finally { setChecking(false); }
  };
  useEffect(() => { refreshStatus(); }, [trackedId, trackedToken]);

  useEffect(() => {
    if (!attachment) { setPreview(''); return; }
    const url = URL.createObjectURL(attachment);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const selectAttachment = (event) => {
    const file = event.target.files?.[0];
    setError('');
    setAttachment(null);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Selecciona una foto JPG, PNG o WebP de hasta 5 MB.');
      event.target.value = '';
      return;
    }
    setAttachment(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (!attachment) { setError('Debes adjuntar una foto del comprobante.'); return; }
    setLoading(true);
    setError('');
    setReceipt(null);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
      if (attachment) payload.append('comprobante', attachment);
      const response = await apiService.createDonacionPublica(payload);
      setReceipt(response.data?.receipt || null);
      const saved = response.data?.receipt;
      if (saved) navigate(`/donaciones#aporte=${saved.id}&token=${encodeURIComponent(saved.token)}`, { replace: true });
      setFormData(emptyForm);
      clearAttachment();
    } catch (err) {
      setError(err?.response?.data?.errors?.comprobante?.[0] || err?.response?.data?.message || 'No se pudo registrar la donación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="card text-center">
        <HeartHandshake size={36} className="mx-auto text-sage-700 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900">Donaciones y ofrendas</h1>
        <p className="text-gray-600 mt-2">Registra tu donación u ofrenda realizada por transferencia, depósito o entrega presencial. Aquí no se realizan pagos en línea.</p>
      </div>

      {error && <div role="alert" className="card border border-red-200 text-red-700">{error}</div>}

      {receipt && (
        <div role="status" className="card border border-sage-200 space-y-3">
          <p className="font-semibold">{receipt.review_status === 'aprobado' ? 'Donación aprobada. Tu constancia está disponible.' : receipt.review_status === 'rechazado' ? 'El comprobante no fue aprobado.' : 'Comprobante recibido. Tu donación está siendo revisada.'}</p>
          <p className="text-sm">Ticket #{receipt.ticket_id} · Aporte #{receipt.id}</p>
          {!['aprobado', 'rechazado'].includes(receipt.review_status) && <p className="text-sm">El equipo parroquial verificará el comprobante y la recepción del aporte. Podrás descargar la constancia cuando lo apruebe.</p>}
          {receipt.response && <p className="text-sm whitespace-pre-wrap">Respuesta: {receipt.response}</p>}
          <p className="text-sm">Guarda este <a className="underline" href={`/donaciones#aporte=${receipt.id}&token=${encodeURIComponent(trackedToken || receipt.token || '')}`}>enlace privado de seguimiento</a> para volver a revisar el estado. Si enviaste el aporte con tu sesión iniciada, también aparecerá en <Link className="underline" to="/mi-cuenta">Mi cuenta</Link>.</p>
          <button type="button" className="btn-secondary" onClick={refreshStatus} disabled={checking}>{checking ? 'Actualizando...' : 'Actualizar estado'}</button>
          {receipt.review_status === 'aprobado' && receipt.download_url && <a href={receipt.download_url} className="btn-primary inline-flex ml-2" target="_blank" rel="noreferrer">Descargar constancia de registro</a>}
        </div>
      )}

      <form className="card space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input className="input-field" value={formData.nombre_donante} onChange={(e) => setFormData((prev) => ({ ...prev, nombre_donante: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Correo</label>
          <input type="email" className="input-field" value={formData.email_donante} onChange={(e) => setFormData((prev) => ({ ...prev, email_donante: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Monto</label>
          <input type="number" min="0.01" step="0.01" className="input-field" value={formData.monto} onChange={(e) => setFormData((prev) => ({ ...prev, monto: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Categoría</label>
          <select className="input-field" value={formData.categoria} onChange={(e) => setFormData((prev) => ({ ...prev, categoria: e.target.value }))}>
            <option value="donacion_general">Donación general</option>
            <option value="ofrenda">Ofrenda</option>
            <option value="ayuda_social">Ayuda social</option>
            <option value="mantenimiento">Mantenimiento parroquial</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea rows={4} className="input-field" value={formData.descripcion} onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))} />
        </div>
        <div className="rounded-lg border border-sage-200 bg-sage-50 p-4 space-y-3">
          <ProofUpload id="donation-proof" label="Foto del comprobante (obligatoria)" inputRef={fileInput} attachment={attachment} onChange={selectAttachment} disabled={loading} required />
          {preview && (
            <div className="space-y-2">
              <img src={preview} alt="Vista previa de la foto del comprobante" className="max-h-64 max-w-full rounded border border-gray-200 bg-white object-contain" />
              <p className="text-sm text-gray-600 break-all">{attachment?.name}</p>
              <button type="button" onClick={clearAttachment} disabled={loading} className="text-sm text-red-700 underline disabled:opacity-50">Quitar foto</button>
            </div>
          )}
        </div>
        <button type="submit" className="btn-primary disabled:opacity-50" disabled={loading || !attachment}>{loading ? 'Registrando...' : 'Registrar donación u ofrenda'}</button>
      </form>
    </div>
  );
};
