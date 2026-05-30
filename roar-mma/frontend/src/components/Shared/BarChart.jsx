// Simple Bar Chart Component
export default function BarChart({ data, title, xLabel }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No data available</p>
      </div>
    );
  }

  const maxValue = data.reduce((max, d) => Math.max(max, d.value), -Infinity);
  const chartHeight = 200;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      <div className="relative" style={{ height: chartHeight + 40 }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-10 flex flex-col justify-between text-xs text-gray-500">
          <span>{maxValue}</span>
          <span>{Math.floor(maxValue * 0.75)}</span>
          <span>{Math.floor(maxValue * 0.5)}</span>
          <span>{Math.floor(maxValue * 0.25)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-12 h-full flex items-end justify-around gap-2 border-l border-b border-gray-300">
          {data.map((item, index) => {
            const height = (item.value / maxValue) * chartHeight;
            return (
              <div key={item.label || item.key || index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 hover:bg-blue-600 transition-all rounded-t cursor-pointer relative group"
                  style={{ height: `${height}px` }}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    {item.value}
                  </div>
                </div>
                <span className="text-xs text-gray-600 mt-2 text-center truncate w-full">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {xLabel && (
        <p className="text-xs text-gray-500 text-center mt-2">{xLabel}</p>
      )}
    </div>
  );
}
