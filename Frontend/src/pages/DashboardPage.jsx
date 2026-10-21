import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Church, Coins, FileText, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { SimpleLineChart } from '../components/Charts';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';

const labels = { bautismo: 'Bautismo', comunion: 'Primera comunión', confirmacion: 'Confirmación', matrimonio: 'Matrimonio' };
const money = value => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
export const DashboardPage = () => {
  const { hasPermission } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    let active = true;
    let pending = false;
    const load = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try { const { data } = await apiService.getDashboardSummary(); if (active) { setSummary(data); setError(''); } }
      catch { if (active) setError('No se pudo actualizar el dashboard. Intenta recargar la página.'); }
      finally { pending = false; }
    };
    load(); const timer = setInterval(load, 30000); window.addEventListener('focus', load);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); };
  }, []);
  if (!summary) return <div className="p-8 text-center" role="status">{error || 'Cargando dashboard…'}</div>;
  const { metrics, charts } = summary;
  const counts = summary.tickets?.counts || {};
  const ticketCount = Number(counts.documento || 0) + Number(counts.donacion || 0);
  const tickets = (summary.tickets?.recent || []).filter(t => filter === 'all' || t.type === filter);
  const actions = [
    ['Sacramentos', '/sacramentos', Church, 'sacraments.view'],
    ['Miembros', '/miembros', Users, 'members.view'],
    ['Registrar movimiento', '/finanzas', Coins, 'finance.view'],
    ['Ver reportes', '/reportes', TrendingUp, 'reports.view'],
  ];
  return <div className="dashboard-shell space-y-6">
    <h1 className="sr-only">Dashboard pastoral</h1>
    {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
    <section className="dashboard-metrics" aria-label="Resumen parroquial">
      {[[ 'Tickets por atender', ticketCount, `${counts.documento || 0} documentos · ${counts.donacion || 0} donaciones`, FileText ],
        ['Sacramentos registrados', metrics.total_sacramentos, 'Total del archivo parroquial', Church],
        ['Donaciones confirmadas', money(metrics.donaciones_mes), 'Aportes aprobados este mes', Coins],
        ['Participación del mes', metrics.participacion_mes, 'Asistencias registradas', Users]].map(([title, value, hint, Icon]) => <div key={title} className="card !p-6 min-w-0">
          <div className="flex items-start justify-between gap-2 text-gray-500 text-sm"><span>{title}</span><Icon size={18} className="text-sage-700 shrink-0" /></div>
          <p className="text-3xl font-bold my-3 break-words">{value}</p><p className="text-xs text-gray-500">{hint}</p>
        </div>)}
    </section>
    <nav aria-label="Accesos rápidos" className="flex flex-wrap items-center gap-3"><span className="text-sm text-gray-500">Accesos rápidos</span>{actions.filter(a => hasPermission(a[3])).map(([title, href, Icon], index) => <Link key={href} to={href} className={`${index === 0 ? 'btn-primary' : 'btn-secondary'} inline-flex items-center gap-2`}><Icon size={17} />{title}</Link>)}</nav>
    <div className="dashboard-columns">
      <section className="card !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-6"><div><h2 className="text-xl font-semibold">Por resolver</h2><p className="text-sm text-gray-500 mt-1">Solicitudes recientes de la comunidad</p></div><Link to="/tickets" className="text-xs text-sage-700">Ir a la bandeja ↗</Link></div>
        <div className="flex gap-4 border-b mx-6" role="group" aria-label="Filtrar tickets">{[['all','Todas',ticketCount],['documento','Documentos',counts.documento || 0],['donacion','Donaciones',counts.donacion || 0]].map(([value,title,count]) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`text-xs pb-3 border-b-2 ${filter === value ? 'border-sage-700 text-sage-900 font-semibold' : 'border-transparent text-gray-500'}`}>{title} <span className="rounded bg-sage-50 px-1">{count}</span></button>)}</div>
        {tickets.length === 0 && <p className="p-6 text-sm text-gray-500">No hay tickets de este tipo entre los más recientes. Puedes revisar todos en la bandeja.</p>}
        {tickets.map(ticket => <Link key={ticket.id} to="/tickets" className="flex items-center gap-3 p-5 border-b border-gray-100 last:border-0 hover:bg-gray-50"><span className="p-2 bg-sage-100 rounded-md text-sage-700">{ticket.type === 'documento' ? <FileText size={18} /> : <Coins size={18} />}</span><div className="flex-1 min-w-0"><p className="text-sm font-medium">{ticket.type === 'documento' ? 'Solicitud de documento' : 'Comprobante de donación'}</p><p className="text-xs text-gray-500 mt-1">#{ticket.id} · {new Date(ticket.created_at).toLocaleDateString('es-EC')}</p></div><span className="text-xs text-sage-700">{ticket.status === 'pendiente' ? 'Pendiente' : 'En revisión'}</span><ArrowRight size={16} className="shrink-0 text-sage-500" /></Link>)}
      </section>
      <section className="card !p-6"><div className="flex flex-wrap justify-between items-center gap-3 mb-5"><h2 className="text-xl font-semibold">Agenda próxima</h2><Link to="/calendarios/eventos" className="text-xs text-sage-700">Ver calendario ↗</Link></div>
        {metrics.eventos_proximos.length === 0 && <p className="text-sm text-gray-500">No hay eventos programados.</p>}
        {metrics.eventos_proximos.map(event => <div key={event.id} className="flex gap-3 py-4 border-b last:border-0 border-gray-100"><div className="rounded-md bg-sage-50 text-sage-700 p-2 text-center shrink-0"><span className="block text-xs">{String(event.fecha).slice(5,7)}</span><strong className="text-xl">{String(event.fecha).slice(8,10)}</strong></div><div><p className="text-sm font-medium">{event.titulo}</p><p className="text-xs text-gray-500 mt-1">{event.hora?.slice(0,5)} {event.lugar ? `· ${event.lugar}` : ''}</p></div></div>)}
      </section>
    </div>
    <div className="dashboard-columns">
      <SimpleLineChart title="Participación de la comunidad" subtitle="Asistencias registradas en los últimos meses" items={charts.tendencia_asistencia.map(item => ({ label:item.mes, value:Number(item.total) }))} emptyText="Aún no hay asistencias registradas." />
      <section className="card !p-6"><h2 className="text-xl font-semibold">Archivo sacramental</h2><p className="text-sm text-gray-500 mt-1 mb-5">{metrics.total_sacramentos} registros por sacramento</p>{charts.sacramentos_por_tipo.length === 0 && <p className="text-sm text-gray-500">Aún no hay sacramentos registrados.</p>}{charts.sacramentos_por_tipo.map(item => <div key={item.tipo} className="mb-4"><div className="flex justify-between text-sm mb-2"><span>{labels[item.tipo] || item.tipo}</span><span>{item.total}</span></div><div className="h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-sage-500 rounded-full" style={{ width:`${metrics.total_sacramentos ? Number(item.total) / metrics.total_sacramentos * 100 : 0}%` }} /></div></div>)}</section>
    </div>
  </div>;
};
