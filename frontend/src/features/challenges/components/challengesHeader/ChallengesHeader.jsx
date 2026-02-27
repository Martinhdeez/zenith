import SearchInput from '../../../shared/components/SearchInput.jsx'
import './ChallengesHeader.css'

function ChallengesHeader({ search, onSearchChange, viewMode, onViewModeChange, totalResults }) {
  return (
    <section className="challenges-header" aria-label="Challenges heading">
      <div className="challenges-header__copy">
        <h1>Coding Challenges</h1>
        <p>Practice real scenarios, filter by stack, and track your progress challenge by challenge.</p>
      </div>

      <div className="challenges-header__controls">
        <SearchInput
          id="challenge-search"
          label="Search challenges"
          value={search}
          onChange={onSearchChange}
          placeholder="Search by title, topic, or language..."
        />

        <div className="challenges-header__view-switch" role="group" aria-label="Display mode">
          <button
            type="button"
            className={viewMode === 'cards' ? 'is-active' : ''}
            onClick={() => onViewModeChange('cards')}
          >
            Cards
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'is-active' : ''}
            onClick={() => onViewModeChange('list')}
          >
            List
          </button>
        </div>
      </div>

      <p className="challenges-header__meta">
        Showing <strong>{totalResults}</strong> challenges
      </p>
    </section>
  )
}

export default ChallengesHeader
