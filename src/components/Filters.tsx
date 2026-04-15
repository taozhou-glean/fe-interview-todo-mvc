import { FilterMode } from '../types';

interface FiltersProps {
  filter: FilterMode;
  searchQuery: string;
  totalCount: number;
  activeCount: number;
  completedCount: number;
  onFilterChange: (filter: FilterMode) => void;
  onSearchChange: (query: string) => void;
}

const FILTER_OPTIONS: Array<{ value: FilterMode; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

export function Filters({
  filter,
  searchQuery,
  totalCount,
  activeCount,
  completedCount,
  onFilterChange,
  onSearchChange,
}: FiltersProps) {
  const countsByFilter: Record<FilterMode, number> = {
    all: totalCount,
    active: activeCount,
    completed: completedCount,
  };

  return (
    <div className="controls">
      <input
        className="search"
        placeholder="Search todos..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="filters">
        {FILTER_OPTIONS.map((option, idx) => {
          const isActive = filter === option.value;

          return (
            <button
              key={idx}
              type="button"
              className={`filter-btn ${isActive ? 'active' : ''}`}
              onClick={() => onFilterChange(option.value)}
              style={isActive ? { appearance: 'none', fontFamily: 'inherit' } : { appearance: 'none', background: 'transparent', fontFamily: 'inherit' }}
            >
              {option.label} ({countsByFilter[option.value]})
            </button>
          );
        })}
      </div>
    </div>
  );
}
