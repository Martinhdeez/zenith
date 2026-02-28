import { useEffect, useRef, useState } from 'react'
import SearchInput from './SearchInput.jsx'
import './DashboardToolbar.css'

const FILTER_OPTIONS = [
  { key: 'document', label: 'Documents', icon: '📄' },
  { key: 'image',    label: 'Images',    icon: '🖼️' },
  { key: 'video',    label: 'Videos',    icon: '🎬' },
  { key: 'audio',    label: 'Audio',     icon: '🎵' },
  { key: 'folder',   label: 'Folders',   icon: '📁' },
]

function DashboardToolbar({
  search,
  onSearchChange,
  searchMode = 'name',
  onModeChange,
  activeFilters = [],
  onFilterChange,
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef(null)

  // Close filter dropdown on outside click / escape
  useEffect(() => {
    if (!isFilterOpen) return

    const handlePointerDown = (event) => {
      if (!filterRef.current?.contains(event.target)) {
        setIsFilterOpen(false)
      }
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsFilterOpen(false)
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isFilterOpen])

  const toggleFilter = (key) => {
    if (activeFilters.includes(key)) {
      onFilterChange?.(activeFilters.filter((f) => f !== key))
    } else {
      onFilterChange?.([...activeFilters, key])
    }
  }

  const clearFilters = () => {
    onFilterChange?.([])
  }

  const activeCount = activeFilters.length

  return (
    <div className="dashboard-toolbar-container">
      <div className="dashboard-toolbar__header">
        <span className="dashboard-toolbar__badge">AI POWERED</span>
        <h2 className="dashboard-toolbar__title">Search your workspace intelligently with Zenith AI</h2>
      </div>
      
      <div className="dashboard-toolbar" role="region" aria-label="Dashboard toolbar">
        <SearchInput
          id="dashboard-search"
          label="Search"
          value={search}
          onChange={onSearchChange}
          placeholder="Search..."
        />

        {/* AI Search Toggle */}
        <div className="dashboard-toolbar__ai-toggle">
          <button
            className={`dashboard-toolbar__ai-btn ${searchMode === 'semantic' ? 'is-active' : ''}`}
            type="button"
            onClick={() => onModeChange?.(searchMode === 'semantic' ? 'name' : 'semantic')}
            title="AI Semantic Search — find files by meaning"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h2a6 6 0 0 1 6 6h2v4h-2v-2H2v2H0v-4h2a6 6 0 0 1 6-6h2V9.5A4 4 0 0 1 8 6a4 4 0 0 1 4-4z"/>
            </svg>
            AI
          </button>
        </div>

        {/* Filter Button & Dropdown */}
        <div className="dashboard-toolbar__filter-wrap" ref={filterRef}>
          <button
            className={`dashboard-toolbar__filter-btn ${activeCount > 0 ? 'has-active' : ''}`}
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-expanded={isFilterOpen}
            aria-haspopup="listbox"
            title="Filter by type"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="dashboard-toolbar__filter-count">{activeCount}</span>
            )}
          </button>

          <div className={`dashboard-toolbar__filter-dropdown ${isFilterOpen ? 'is-open' : ''}`}>
            <div className="filter-dropdown__header">
              <span className="filter-dropdown__title">Filter by type</span>
              {activeCount > 0 && (
                <button className="filter-dropdown__clear" type="button" onClick={clearFilters}>
                  Clear all
                </button>
              )}
            </div>
            <div className="filter-dropdown__chips">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  className={`filter-chip ${activeFilters.includes(opt.key) ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => toggleFilter(opt.key)}
                  aria-pressed={activeFilters.includes(opt.key)}
                >
                  <span className="filter-chip__icon">{opt.icon}</span>
                  <span className="filter-chip__label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active filter pills shown below toolbar */}
      {activeCount > 0 && (
        <div className="dashboard-toolbar__active-filters">
          {activeFilters.map((key) => {
            const opt = FILTER_OPTIONS.find((o) => o.key === key)
            if (!opt) return null
            return (
              <span key={key} className="active-filter-pill">
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
                <button type="button" onClick={() => toggleFilter(key)} aria-label={`Remove ${opt.label} filter`}>
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DashboardToolbar
