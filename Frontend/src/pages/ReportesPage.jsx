import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/apiService';
import { Download, FileText } from 'lucide-react';
import { SimpleBarChart, SimpleDonutChart, SimpleLineChart } from '../components/Charts';

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const ReportesPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({
    year,
    sacraments_by_type: [],
    attendance_by_month: [],
    financial_by_category: [],
  });

  const loadSummary = async (targetYear = year) => {
    try {
      const response = await apiService.getReportesSummary({ year: targetYear });
      setSummary(response.data);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSacraments = useMemo(
    () => summary.sacraments_by_type.reduce((acc, row) => acc + Number(row.total || 0), 0),
    [summary.sacraments_by_type]
  );

  const totalAttendance = useMemo(
    () => summary.attendance_by_month.reduce((acc, row) => acc + Number(row.total || 0), 0),
    [summary.attendance_by_month]
  );

  const totalFinance = useMemo(
    () => summary.financial_by_category.reduce((acc, row) => acc + Number(row.total || 0), 0),
    [summary.financial_by_category]
  );

  const [section, setSection] = useState('todos');
  const [exporting, setExporting] = useState('');
  const showSacraments = section !== 'finanzas';
  const showFinance = section !== 'sacramentos';
  const exportReport = async (kind, format) => {
    const key = `${kind}-${format}`;
    const suffix = format === 'csv' ? '' : format === 'xlsx' ? 'Xlsx' : 'Pdf';
    const method = `exportReportes${kind === 'sacramentos' ? 'Sacramentos' : 'Finanzas'}${suffix}`;
    setExporting(key);
    setError('');
    try {
      const response = await apiService[method]({ year: summary.year });
      downloadBlob(response.data, `reporte-${kind}-${summary.year}.${format}`);
    } catch {
      setError('No se pudo exportar el reporte. Intenta nuevamente.');
    } finally { setExporting(''); }
  };

  const applyYear = async (event) => {
    event.preventDefault();
    setLoading(true);
    await loadSummary(year);
  };

  const sacramentItems = summary.sacraments_by_type.map((row) => ({ label: row.tipo, value: Number(row.total || 0) }));
  const financeItems = summary.financial_by_category.map((row) => ({ label: row.categoria.replaceAll('_', ' '), value: Number(row.total || 0) }));
  const attendanceItems = summary.attendance_by_month.map((row) => ({ label: `M${row.month}`, value: Number(row.total || 0) }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Reportes y estadísticas</h1>
        <p className="text-gray-600 mt-1">Actividad parroquial, sacramentos y finanzas.</p>
      </header>
      {error && <div role="alert" className="card border border-red-200 text-red-700">{error}</div>}
      <div className="reports-layout">
        <section aria-label="Estadísticas del período" aria-busy={loading} className="min-w-0 space-y-4">
          {loading ? <div className="card" role="status">Cargando reportes…</div> : <>
            <div className="grid gap-3" style={{gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,11rem),1fr))'}}>
              {showSacraments && <div className="card"><p className="text-sm text-gray-500">Sacramentos · {summary.year}</p><p className="text-2xl font-bold mt-1">{totalSacraments}</p></div>}
              {section === 'todos' && <div className="card"><p className="text-sm text-gray-500">Asistencias · {summary.year}</p><p className="text-2xl font-bold mt-1">{totalAttendance}</p></div>}
              {showFinance && <div className="card"><p className="text-sm text-gray-500">Movimiento financiero · {summary.year}</p><p className="text-2xl font-bold mt-1">${totalFinance.toFixed(2)}</p></div>}
            </div>
            <div className={section === 'todos' ? 'reports-charts' : 'space-y-4'}>
              {showSacraments && <SimpleDonutChart title="Sacramentos por tipo" subtitle="Distribución anual por tipo sacramental." items={sacramentItems}/>}
              {showFinance && <SimpleBarChart title="Finanzas por categoría" subtitle="Ingresos y egresos aprobados, agrupados por categoría." items={financeItems}/>}
            </div>
            {section === 'todos' && <SimpleLineChart title="Tendencia de asistencia mensual" subtitle="Participación registrada a lo largo del año." items={attendanceItems}/>}
            <div className="card">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><FileText size={18}/>Resumen tabular</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {showSacraments && summary.sacraments_by_type.map(row => <div key={row.tipo} className="border border-gray-200 rounded-lg p-3"><p className="text-gray-500">Sacramento</p><p className="font-semibold capitalize">{row.tipo.replaceAll('_',' ')}</p><p className="text-xl font-bold mt-1">{row.total}</p></div>)}
                {showFinance && summary.financial_by_category.map(row => <div key={row.categoria} className="border border-gray-200 rounded-lg p-3"><p className="text-gray-500">Finanzas</p><p className="font-semibold capitalize">{row.categoria.replaceAll('_',' ')}</p><p className="text-xl font-bold mt-1">${Number(row.total || 0).toFixed(2)}</p></div>)}
              </div>
            </div>
          </>}
        </section>
        <aside aria-label="Filtros y exportaciones" className="reports-tools card space-y-5">
          <form onSubmit={applyYear} className="space-y-3">
            <h2 className="text-lg font-semibold">Filtros</h2>
            <label className="block text-sm font-medium">Mostrar<select className="input-field mt-1" value={section} onChange={e=>setSection(e.target.value)}><option value="todos">Todos los reportes</option><option value="sacramentos">Sacramentos</option><option value="finanzas">Finanzas</option></select></label>
            <label className="block text-sm font-medium">Año<input required type="number" className="input-field mt-1" value={year} onChange={e=>setYear(e.target.value)} min="2000" max="2100"/></label>
            <button disabled={loading} type="submit" className="btn-primary w-full disabled:opacity-50">{loading ? 'Cargando…' : 'Aplicar año'}</button>
          </form>
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <div><h2 className="text-lg font-semibold">Exportar</h2><p className="text-xs text-gray-500 mt-1">Período aplicado: {summary.year}</p></div>
            {['sacramentos','finanzas'].filter(kind=>section === 'todos' || section === kind).map(kind=><div key={kind}>
              <p className="text-sm font-medium capitalize mb-2">{kind}</p>
              <div className="grid grid-cols-3 gap-2">
                {['csv','xlsx','pdf'].map(format=><button key={format} type="button" disabled={loading || !!exporting} onClick={()=>exportReport(kind,format)} aria-label={`Exportar ${kind} ${format.toUpperCase()}`} title={`Descargar ${kind} en ${format.toUpperCase()}`} className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-2.5 text-sage-700 hover:bg-sage-50 focus-visible:ring-2 focus-visible:ring-sage-500 disabled:opacity-50"><Download size={18}/><span className="text-xs font-medium">{format.toUpperCase()}</span></button>)}
              </div>
            </div>)}
            {exporting && <p role="status" className="text-xs text-sage-700">Preparando descarga…</p>}
          </div>
        </aside>
      </div>
    </div>
  );
};
