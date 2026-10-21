import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';

export const NotificationBell = ({ user }) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread_count: 0 });
  const [error, setError] = useState('');
  const container = useRef(null);
  const navigate = useNavigate();
  const eligible = Boolean(user?.email_verified_at && !user?.activity_blocked);
  useEffect(() => {
    let active = true;
    let pending = false;
    setData({ items: [], unread_count: 0 });
    if (!eligible) return;
    const refresh = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try { const result = await apiService.getNotifications(); if (active) { setData(result.data); setError(''); } }
      catch { if (active) setError('No se pudieron cargar las notificaciones.'); }
      finally { pending = false; }
    };
    refresh();
    const timer = setInterval(refresh, 20000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [user?.id, eligible]);
  useEffect(() => {
    if (!open) return;
    const close = (event) => { if (!container.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  const read = async (item) => {
    try {
      await apiService.readNotification(item.id);
      setData(current => ({ unread_count: Math.max(0, current.unread_count - (item.read_at ? 0 : 1)), items: current.items.map(n => n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n) }));
      setOpen(false); navigate(item.url);
    } catch { setError('No se pudo abrir la notificación. Intenta nuevamente.'); }
  };
  if (!eligible) return null;
  return <div ref={container} className="relative">
    <button type="button" onClick={() => setOpen(value => !value)} aria-label={`Notificaciones: ${data.unread_count} sin leer`} aria-expanded={open} aria-controls="notification-panel" className="relative p-2 text-sage-700 rounded-md hover:bg-sage-50">
      <Bell size={22} />{data.unread_count > 0 && <span className="absolute -top-1 -right-1 bg-sage-700 text-white rounded-full text-[10px] min-w-4 px-1">{data.unread_count > 99 ? '99+' : data.unread_count}</span>}
    </button>
    {open && <section id="notification-panel" aria-label="Notificaciones" className="fixed right-3 top-20 w-[calc(100vw-1.5rem)] max-w-sm bg-white rounded-xl shadow-xl border border-gray-200 z-50">
      <div className="flex justify-between items-center p-4 border-b"><h2 className="text-lg font-semibold">Notificaciones</h2><button type="button" aria-label="Cerrar notificaciones" onClick={() => setOpen(false)}><X size={18} /></button></div>
      {error && <p role="alert" className="p-4 text-sm text-red-700">{error}</p>}
      <div className="max-h-[65vh] overflow-y-auto">{data.items.length === 0 && !error && <p className="p-4 text-sm text-gray-500">No tienes notificaciones.</p>}
        {data.items.map(item => <button key={item.id} type="button" onClick={() => read(item)} className={`block w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${item.read_at ? '' : 'bg-sage-50'}`}>
          <p className={`text-sm ${item.read_at ? 'text-gray-600' : 'font-medium text-sage-900'}`}>{item.message}</p><span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString('es-EC')}{!item.read_at && ' · Sin leer'}</span>
        </button>)}
      </div>
    </section>}
  </div>;
};
