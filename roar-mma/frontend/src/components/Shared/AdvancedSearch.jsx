// Advanced Search Component with Filters
import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../../hooks/useCommon';

export default function AdvancedSearch({
  onSearch,
  filters = [],
  placeholder = 'Search...',
  debounceDelay = 300,
  showFilters = true,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, debounceDelay);
  const onSearchRef = useRef();
  onSearchRef.current = onSearch;

  useEffect(() => {
    onSearchRef.current({
      query: debouncedQuery,
      filters: activeFilters,
    });
  }, [debouncedQuery, activeFilters]);

  const handleFilterChange = (filterKey, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value,
    }));
  };

  const clearFilters = () => {
    setActiveFilters({});
    setSearchQuery('');
  };

  const activeFilterCount = Object.values(activeFilters).filter(v => v !== '' && v !== null).length;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="input pl-10"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {showFilters && filters.length > 0 && (
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="btn btn-secondary relative"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {(searchQuery || activeFilterCount > 0) && (
          <button onClick={clearFilters} className="btn btn-secondary">
            Clear
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilterPanel && filters.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <FilterField
                key={filter.key}
                filter={filter}
                value={activeFilters[filter.key] || ''}
                onChange={(value) => handleFilterChange(filter.key, value)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters)
            .filter(([_, value]) => value !== '' && value !== null)
            .map(([key, value]) => {
              const filter = filters.find(f => f.key === key);
              const label = typeof filter?.getLabel === 'function' ? filter.getLabel(value) : value;
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  <span className="font-medium">{filter?.label}:</span>
                  <span>{label}</span>
                  <button
                    onClick={() => handleFilterChange(key, '')}
                    className="ml-1 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              );
            })}
        </div>
      )}
    </div>
  );
}

FilterField.displayName = 'FilterField';

function FilterField({ filter, value, onChange }) {
  FilterField.displayName = 'FilterField';
  switch (filter.type) {
    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {filter.label}
          </label>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input"
          >
            <option value="">All</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'date':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {filter.label}
          </label>
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input"
          />
        </div>
      );

    case 'dateRange':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {filter.label}
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={value?.from || ''}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              className="input"
              placeholder="From"
            />
            <input
              type="date"
              value={value?.to || ''}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              className="input"
              placeholder="To"
            />
          </div>
        </div>
      );

    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {filter.label}
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input"
            min={filter.min}
            max={filter.max}
          />
        </div>
      );

    case 'checkbox':
      return (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            className="mr-2"
          />
          <label className="text-sm font-medium text-gray-700">
            {filter.label}
          </label>
        </div>
      );

    default:
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {filter.label}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input"
          />
        </div>
      );
  }
}

// Usage example:
/*
const filters = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'trial', label: 'Trial' },
      { value: 'paused', label: 'Paused' },
    ],
    getLabel: (value) => value.charAt(0).toUpperCase() + value.slice(1),
  },
  {
    key: 'location',
    label: 'Location',
    type: 'select',
    options: [
      { value: 'burleigh_heads', label: 'Burleigh Heads' },
      { value: 'varsity_lakes', label: 'Varsity Lakes' },
    ],
  },
  {
    key: 'joined_date',
    label: 'Joined Date',
    type: 'dateRange',
  },
];

<AdvancedSearch
  onSearch={({ query, filters }) => {
    console.log('Search:', query, filters);
    // Perform search with query and filters
  }}
  filters={filters}
  placeholder="Search members..."
  showFilters={true}
/>
*/
