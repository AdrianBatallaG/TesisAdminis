const chartPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

const getColor = (index) => chartPalette[index % chartPalette.length];

const getMaxValue = (items) => Math.max(...items.map((item) => Number(item.value || 0)), 1);

export const SimpleBarChart = ({ title, subtitle, items = [], emptyText = 'Sin datos disponibles.' }) => {
  if (!items.length) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        <p className="text-sm text-gray-500 mt-6">{emptyText}</p>
      </div>
    );
  }

  const maxValue = getMaxValue(items);

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      <div className="mt-6 space-y-4">
        {items.map((item, index) => {
          const width = Math.max(6, (Number(item.value || 0) / maxValue) * 100);
          return (
            <div key={`${item.label}-${index}`}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{item.label}</span>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-3 rounded-full" style={{ width: `${width}%`, backgroundColor: getColor(index) }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SimpleDonutChart = ({ title, subtitle, items = [], emptyText = 'Sin datos disponibles.' }) => {
  if (!items.length) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        <p className="text-sm text-gray-500 mt-6">{emptyText}</p>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  let currentAngle = -90;
  const segments = items.map((item, index) => {
    const value = Number(item.value || 0);
    const angle = (value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const polarToCartesian = (angleInDegrees) => {
      const angleInRadians = (angleInDegrees * Math.PI) / 180;
      return {
        x: 60 + 46 * Math.cos(angleInRadians),
        y: 60 + 46 * Math.sin(angleInRadians),
      };
    };

    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    const largeArcFlag = angle > 180 ? 1 : 0;

    const path = [
      `M ${start.x} ${start.y}`,
      `A 46 46 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    ].join(' ');

    return { path, color: getColor(index), label: item.label, value };
  });

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-[140px_1fr] gap-6 items-center">
        <div className="mx-auto relative w-[120px] h-[120px]">
          <svg viewBox="0 0 120 120" className="w-[120px] h-[120px] -rotate-90">
            <circle cx="60" cy="60" r="46" fill="none" stroke="#e5e7eb" strokeWidth="16" />
            {segments.map((segment, index) => (
              <path key={`${segment.label}-${index}`} d={segment.path} fill="none" stroke={segment.color} strokeWidth="16" strokeLinecap="round" />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-gray-900">{total}</span>
            <span className="text-xs text-gray-500">total</span>
          </div>
        </div>
        <div className="space-y-3">
          {segments.map((segment, index) => (
            <div key={`${segment.label}-${index}`} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                <span>{segment.label}</span>
              </div>
              <span className="font-semibold text-gray-900">{segment.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const SimpleLineChart = ({ title, subtitle, items = [], emptyText = 'Sin datos disponibles.' }) => {
  if (!items.length) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        <p className="text-sm text-gray-500 mt-6">{emptyText}</p>
      </div>
    );
  }

  const maxValue = getMaxValue(items);
  const stepX = items.length > 1 ? 280 / (items.length - 1) : 0;

  const points = items
    .map((item, index) => {
      const x = 20 + index * stepX;
      const y = 160 - ((Number(item.value || 0) / maxValue) * 120 + 10);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      <div className="mt-6 overflow-x-auto">
        <svg viewBox="0 0 320 190" className="w-full min-w-[320px] h-[210px]">
          <line x1="20" y1="160" x2="300" y2="160" stroke="#d1d5db" strokeWidth="1" />
          <line x1="20" y1="20" x2="20" y2="160" stroke="#d1d5db" strokeWidth="1" />
          <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points} />
          {items.map((item, index) => {
            const x = 20 + index * stepX;
            const y = 160 - ((Number(item.value || 0) / maxValue) * 120 + 10);
            return (
              <g key={`${item.label}-${index}`}>
                <circle cx={x} cy={y} r="4" fill="#3b82f6" />
                <text x={x} y="178" textAnchor="middle" fontSize="10" fill="#6b7280">{item.label}</text>
                <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="#111827">{item.value}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
