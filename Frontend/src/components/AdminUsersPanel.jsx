import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Ban, CheckCircle2, Shield, Trash2 } from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export const AdminUsersPanel = () => {
  const { user: currentUser, setAuthenticatedUser, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const roleOptions = useMemo(() => (roles.length ? roles : ['usuario', 'editor', 'admin']), [roles]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [rolesData, usersData] = await Promise.all([authService.getRoles(), authService.getAdminUsers()]);
      const loadedUsers = usersData.users || [];
      const loadedRoles = rolesData.roles || [];

      setRoles(loadedRoles);
      setUsers(loadedUsers);
      setSelectedRoles(
        loadedUsers.reduce((acc, item) => {
          acc[item.id] = item.role || 'usuario';
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err.message || 'No se pudo cargar la administracion de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = (userId, role) => {
    setSelectedRoles((prev) => ({ ...prev, [userId]: role }));
  };

  const saveRole = async (targetUser) => {
    const nextRole = selectedRoles[targetUser.id];

    if (!nextRole || nextRole === targetUser.role) {
      return;
    }

    setSavingUserId(targetUser.id);
    setError('');
    setSuccess('');

    try {
      const response = await authService.updateUserRole(targetUser.id, nextRole);
      const updatedUser = response.user;

      setUsers((prev) => prev.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
      setSelectedRoles((prev) => ({ ...prev, [updatedUser.id]: updatedUser.role }));

      if (currentUser?.id === updatedUser.id) {
        setAuthenticatedUser(updatedUser);
      }

      setSuccess(`Rol actualizado para ${updatedUser.name}.`);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el rol.');
    } finally {
      setSavingUserId(null);
    }
  };

  const toggleActivityBlock = async (targetUser) => {
    const nextStatus = !Boolean(targetUser.activity_blocked);
    const actionLabel = nextStatus ? 'bloquear' : 'desbloquear';

    if (!window.confirm(`Deseas ${actionLabel} la actividad de ${targetUser.name}?`)) {
      return;
    }

    setSavingUserId(targetUser.id);
    setError('');
    setSuccess('');

    try {
      const response = await authService.updateUserActivityBlock(targetUser.id, nextStatus);
      const updatedUser = response.user;

      setUsers((prev) => prev.map((item) => (item.id === updatedUser.id ? updatedUser : item)));

      if (currentUser?.id === updatedUser.id) {
        setAuthenticatedUser(updatedUser);
      }

      setSuccess(response.message || `Actividad actualizada para ${updatedUser.name}.`);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el bloqueo de actividad.');
    } finally {
      setSavingUserId(null);
    }
  };

  const deleteUser = async (targetUser) => {
    if (!window.confirm(`Eliminar definitivamente a ${targetUser.name} de la base de datos? Esta accion no se puede deshacer.`)) {
      return;
    }

    setSavingUserId(targetUser.id);
    setError('');
    setSuccess('');

    try {
      const response = await authService.deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((item) => item.id !== targetUser.id));
      setSuccess(response.message || `Usuario ${targetUser.name} eliminado correctamente.`);
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el usuario.');
    } finally {
      setSavingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p className="text-gray-600">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-md bg-sage-100 text-sage-700">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Administracion de usuarios y roles</h2>
            <p className="text-sm text-gray-600">Gestiona roles, bloqueo de actividad y eliminacion definitiva de cuentas.</p>
          </div>
        </div>
        <p className="text-sm text-gray-700">Roles disponibles: <span className="font-medium">{roleOptions.join(', ')}</span>.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={18} className="text-red-600 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle2 size={18} className="text-green-600 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-3 pr-3">Usuario</th>
              <th className="py-3 pr-3">Correo</th>
              <th className="py-3 pr-3">Verificado</th>
              <th className="py-3 pr-3">Estado</th>
              <th className="py-3 pr-3">Actividad</th>
              <th className="py-3 pr-3">Rol actual</th>
              <th className="py-3 pr-3">Nuevo rol</th>
              <th className="py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => {
              const currentRole = item.role || 'usuario';
              const nextRole = selectedRoles[item.id] || currentRole;
              const isSaving = savingUserId === item.id;
              const isSelf = currentUser?.id === item.id;

              return (
                <tr key={item.id} className="border-b border-gray-100 align-top">
                  <td className="py-3 pr-3 font-medium">{item.name}</td>
                  <td className="py-3 pr-3 text-gray-600">{item.email}</td>
                  <td className="py-3 pr-3">{item.email_verified_at ? <span className="text-green-700">Si</span> : <span className="text-amber-700">No</span>}</td>
                  <td className="py-3 pr-3">{item.is_active ? <span className="text-green-700">Activa</span> : <span className="text-red-700">Inactiva</span>}</td>
                  <td className="py-3 pr-3">
                    {item.activity_blocked ? <span className="text-amber-700">Bloqueada</span> : <span className="text-green-700">Habilitada</span>}
                  </td>
                  <td className="py-3 pr-3 capitalize">{currentRole}</td>
                  <td className="py-3 pr-3">
                    <select className="input-field py-2" value={nextRole} onChange={(event) => handleRoleChange(item.id, event.target.value)} disabled={isSaving || !hasPermission('users.manage_roles')}>
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap text-xs">
                      <button
                        type="button"
                        onClick={() => saveRole(item)}
                        disabled={isSaving || nextRole === currentRole || !hasPermission('users.manage_roles')}
                        className="btn-primary !px-2 !py-2 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? 'Guardando...' : 'Actualizar rol'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActivityBlock(item)}
                        disabled={isSaving || isSelf || !hasPermission('users.block_activity')}
                        className={`px-2 py-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                          item.activity_blocked ? 'bg-sage-700 hover:bg-sage-800' : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                        title={isSelf ? 'No puedes bloquear tu propia actividad' : ''}
                      >
                        <Ban size={16} />
                        {item.activity_blocked ? 'Desbloquear' : 'Bloquear'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUser(item)}
                        disabled={isSaving || isSelf || !hasPermission('users.delete')}
                        className="px-2 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title={isSelf ? 'No puedes eliminar tu propia cuenta' : ''}
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
