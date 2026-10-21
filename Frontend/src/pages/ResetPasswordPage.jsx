import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Lock, Mail } from 'lucide-react';
import { authService } from '../services/authService';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isTokenValid = token.length > 0;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isTokenValid) {
      setError('El enlace no contiene un token válido.');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      setSuccess(response.message || 'Contraseña actualizada correctamente.');
      setTimeout(() => {
        navigate('/login', { replace: true, state: { message: 'Contraseña restablecida. Ya puedes iniciar sesión.' } });
      }, 1200);
    } catch (err) {
      setError(err.message || 'No se pudo restablecer la contraseña.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Restablecer contraseña</h1>
        <p className="text-gray-600 mb-6">Define una nueva contraseña para tu cuenta.</p>

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="text-green-500 mt-0.5" size={20} />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5" size={20} />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!isTokenValid && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">El enlace de recuperación está incompleto o ha expirado.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nueva contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-field pl-10"
                minLength={8}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                className="input-field pl-10"
                minLength={8}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isTokenValid}
            className="w-full btn-primary disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          <Link to="/login" className="text-sage-700 hover:text-sage-900 font-medium">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
};
