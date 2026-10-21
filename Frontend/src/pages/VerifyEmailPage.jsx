import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Validando enlace de verificación...');

  const verificationData = useMemo(
    () => ({
      id: searchParams.get('id'),
      hash: searchParams.get('hash'),
      expires: searchParams.get('expires'),
      signature: searchParams.get('signature'),
    }),
    [searchParams]
  );

  useEffect(() => {
    const verify = async () => {
      if (!verificationData.id || !verificationData.hash || !verificationData.expires || !verificationData.signature) {
        setStatus('error');
        setMessage('El enlace de verificación está incompleto o es inválido.');
        return;
      }

      try {
        const response = await authService.verifyEmail(verificationData);
        setStatus('success');
        setMessage(response.message || 'Correo verificado correctamente.');
      } catch (error) {
        setStatus('error');
        setMessage(error.message || 'No se pudo verificar el correo.');
      }
    };

    verify();
  }, [verificationData]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="card max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-4">Verificación de correo</h1>

        {status === 'loading' && (
          <div className="flex items-center gap-3 text-gray-700">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sage-700"></div>
            <p>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="text-green-600 mt-0.5" size={20} />
            <div>
              <p className="text-green-800 text-sm">{message}</p>
              <Link to="/login" className="inline-block mt-3 text-sm text-sage-700 hover:text-sage-900 font-medium">
                Ir a iniciar sesión
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-0.5" size={20} />
            <div>
              <p className="text-red-800 text-sm">{message}</p>
              <Link to="/login" className="inline-block mt-3 text-sm text-sage-700 hover:text-sage-900 font-medium">
                Volver a iniciar sesión
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
