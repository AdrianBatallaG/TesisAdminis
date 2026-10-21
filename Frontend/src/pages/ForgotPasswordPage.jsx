import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Mail, Send } from 'lucide-react';
import { authService } from '../services/authService';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.forgotPassword(email);
      setSuccess(response.message || 'Enlace enviado. Revisa tu correo.');
    } catch (err) {
      setError(err.message || 'No se pudo enviar el enlace de recuperación.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Recuperar contraseña</h1>
        <p className="text-gray-600 mb-6">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>

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
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Enviar enlace</span>
              </>
            )}
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
