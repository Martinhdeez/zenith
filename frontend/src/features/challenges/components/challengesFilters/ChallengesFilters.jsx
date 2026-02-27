import './ChallengesFilters.css'

function FilterGroup({ label, options, selected, onChange }) {
  return (
    <div className="challenges-filters__group">
      <p>{label}</p>
      <div className="challenges-filters__chips">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={selected === option ? 'is-active' : ''}
            onClick={() => onChange(option)}
            aria-pressed={selected === option}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function ChallengesFilters({
  difficultyOptions,
  languageOptions,
  selectedDifficulty,
  selectedLanguage,
  onDifficultyChange,
  onLanguageChange,
}) {
  return (
    <section className="challenges-filters" aria-label="Challenge filters">
      <FilterGroup
        label="Difficulty"
        options={difficultyOptions}
        selected={selectedDifficulty}
        onChange={onDifficultyChange}
      />
      <FilterGroup
        label="Language"
        options={languageOptions}
        selected={selectedLanguage}
        onChange={onLanguageChange}
      />
    </section>
  )
}

export default ChallengesFilters
