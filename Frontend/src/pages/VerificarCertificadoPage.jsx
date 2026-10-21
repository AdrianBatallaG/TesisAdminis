import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiService } from '../services/apiService';

export const VerificarCertificadoPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verificando certificado...');
  const [record, setRecord] = useState(null);

  const params = useMemo(
    () => ({
      id: searchParams.get('id'),
      token: searchParams.get('token'),
    }),
    [searchParams]
  );

  useEffect(() => {
    const run = async () => {
      if (!params.id || !params.token) {
        setStatus('error');
        setMessage('El enlace de verificación es inválido.');
        return;
      }

      try {
        const response = await apiService.verifyCertificadoSacramento(params);
        setStatus('success');
        setMessage(response.data?.message || 'Certificado válido.');
        setRecord(response.data?.record || null);
      } catch (err) {
        setStatus('error');
        setMessage(err?.response?.data?.message || 'No se pudo verificar el certificado.');
      }
    };

    run();
  }, [params]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4 flex items-center justify-center">
      <div className="card max-w-2xl w-full space-y-4">
        <h1 className="text-2xl font-bold">Verificación de certificado</h1>
        <p className={status === 'success' ? 'text-green-700' : status === 'error' ? 'text-red-700' : 'text-gray-700'}>
          {message}
        </p>

        {status === 'success' && record && (
          <div className="border border-green-200 rounded-lg p-4 space-y-1 text-sm">
            <p>
              <span className="font-medium">Tipo:</span> {record.tipo}
            </p>
            <p>
              <span className="font-medium">Nombre:</span> {record.nombre} {record.apellido}
            </p>
            <p>
              <span className="font-medium">Fecha:</span> {record.fecha}
            </p>
            <p>
              <span className="font-medium">N.º certificado:</span> {record.numero_certificado}
            </p>
          </div>
        )}

        <Link to="/" className="btn-secondary inline-block">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
};
