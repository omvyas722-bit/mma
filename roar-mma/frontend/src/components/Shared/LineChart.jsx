// Simple Line Chart Component
export default function LineChart({ data, title, xLabel, color = 'blue' }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No data available</p>
      </div>
    );
  }

  const colors = {
    blue: { line: 'stroke-blue-500', fill: 'fill-blue-100', dot: 'fill-blue-500' },
    green: { line: 'stroke-green-500', fill: 'fill-green-100', dot: 'fill-green-500' },
    red: { line: 'stroke-red-500', fill: 'fill-red-100', dot: 'fill-red-500' },
    purple: { line: 'stroke-purple-500', fill: 'fill-purple-100', dot: 'fill-purple-500' },
  };

  const colorScheme = colors[color] || colors.blue;

  const maxValue = data.reduce((max, d) => Math.max(max, d.value), -Infinity);
  const minValue = data.reduce((min, d) => Math.min(min, d.value), Infinity);
  const range = maxValue - minValue || 1;

  const chartWidth = 600;
  const chartHeight = 200;
  const padding = 40;

  // Calculate points for the line
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * (chartWidth - padding * 2) + padding;
    const y = chartHeight - ((item.value - minValue) / range) * (chartHeight - padding * 2) - padding;
    return { x, y, value: item.value, label: item.label };
  });

  // Create path for line
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Create path for area fill
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-[250px]"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartHeight - ratio * (chartHeight - padding * 2) - padding;
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] text-xs fill-gray-500"
                >
                  {Math.round(minValue + ratio * range)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={areaPath}
            className={colorScheme.fill}
            opacity="0.3"
          />

          {/* Line */}
          <path
            d={linePath}
            className={colorScheme.line}
            strokeWidth="2"
            fill="none"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <g key={point.label || `point-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                className={colorScheme.dot}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="transparent"
                className="hover:fill-gray-200 cursor-pointer transition-all"
              >
                <title>{`${point.label}: ${point.value}`}</title>
              </circle>
            </g>
          ))}

          {/* X-axis labels */}
          {points.map((point, index) => {
            // Show every nth label to avoid crowding
            const showLabel = data.length <= 7 || index % Math.ceil(data.length / 7) === 0;
            if (!showLabel) return null;

            return (
              <text
                key={`xlabel-${point.label || index}`}
                x={point.x}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                className="text-[10px] text-xs fill-gray-600"
              >
                {point.label}
              </text>
            );
          })}
        </svg>
      </div>

      {xLabel && (
        <p className="text-xs text-gray-500 text-center mt-2">{xLabel}</p>
      )}
    </div>
  );
}
