import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSocialErrorMessage } from '../lib/socialAuth';

const inflightSocialRequests = new Map();
const completedSocialTickets = new Set();

export const SocialAuthCallbackPage = () => {
  const [error, setError] = useState('');
  const { completeSocialLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { provider, ticket, socialErrorCode } = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      provider: searchParams.get('provider') || 'google',
      ticket: searchParams.get('ticket') || '',
      socialErrorCode: searchParams.get('social_error') || '',
    };
  }, [location.search]);

  const requestKey = useMemo(() => `${provider}:${ticket}`, [provider, ticket]);

  useEffect(() => {
    let cancelled = false;

    const syncSession = async () => {
      if (!ticket) {
        const fallbackError = getSocialErrorMessage(socialErrorCode) || 'No se recibio un ticket valido para completar el acceso.';

        setError(fallbackError);

        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: { message: fallbackError },
          });
        }, 1800);

        return;
      }

      if (completedSocialTickets.has(requestKey)) {
        return;
      }

      try {
        let pendingRequest = inflightSocialRequests.get(requestKey);

        if (!pendingRequest) {
          pendingRequest = completeSocialLogin(provider, ticket).finally(() => {
            inflightSocialRequests.delete(requestKey);
          });

          inflightSocialRequests.set(requestKey, pendingRequest);
        }

        const result = await pendingRequest;

        if (!result.success) {
          throw new Error(result.error || `No se pudo finalizar el acceso con ${provider}.`);
        }

        completedSocialTickets.add(requestKey);

        if (cancelled) {
          return;
        }

        const role = result.role || 'usuario';
        const landingRoute = role === 'usuario' ? '/' : '/dashboard';

        navigate(landingRoute, { replace: true });
      } catch (err) {
        const socialError = getSocialErrorMessage(socialErrorCode);
        const fallbackError = `No se pudo finalizar el acceso con ${provider}.`;

        setError(err instanceof Error && err.message ? err.message : socialError || fallbackError);

        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: { message: err instanceof Error && err.message ? err.message : socialError || fallbackError },
          });
        }, 1800);
      }
    };

    syncSession();

    return () => {
      cancelled = true;
    };
  }, [completeSocialLogin, navigate, provider, requestKey, socialErrorCode, ticket]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="card max-w-md w-full text-center space-y-4">
        {error ? (
          <>
            <AlertCircle className="mx-auto text-red-500" size={36} />
            <h1 className="text-2xl font-bold text-gray-900">No se pudo completar el acceso</h1>
            <p className="text-sm text-red-700">{error}</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="mx-auto text-green-500" size={36} />
            <h1 className="text-2xl font-bold text-gray-900">Conectando tu cuenta</h1>
            <p className="text-sm text-gray-600">Estamos terminando el acceso con {provider}.</p>
          </>
        )}
      </div>
    </div>
  );
};
