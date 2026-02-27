import ChallengeCard from '../challengeCard/ChallengeCard.jsx'
import './ChallengesList.css'

const languageCodes = {
  JavaScript: 'JS',
  TypeScript: 'TS',
  Python: 'PY',
  SQL: 'SQL',
}

function ChallengeRow({ challenge, index }) {
  const code = languageCodes[challenge.language] || challenge.language.slice(0, 3).toUpperCase()
  const langClass = `is-${code.toLowerCase()}`
  const topic = challenge.topic || `${challenge.language} fundamentals`

  return (
    <article className="challenges-list-row">
      <div className="challenges-list-row__main">
        <span className="challenges-list-row__dot" aria-hidden="true" />
        <span className="challenges-list-row__index">{String(index + 1).padStart(2, '0')}.</span>
        <h3>{challenge.title}</h3>
      </div>

      <div className="challenges-list-row__meta">
        <span className={`challenges-list-row__lang ${langClass}`}>{code}</span>
        <span className="challenges-list-row__topic">{topic}</span>
        <span className="challenges-list-row__time">{challenge.estimatedTime}</span>
        <span className={`challenges-list-row__difficulty is-${challenge.difficulty.toLowerCase()}`}>
          {challenge.difficulty}
        </span>
      </div>
    </article>
  )
}

function ChallengesList({ challenges, viewMode }) {
  if (!challenges.length) {
    return (
      <section id="challenges-list" className="challenges-list-empty" aria-live="polite">
        <h2>No challenges found</h2>
        <p>Try changing the search text or selected filters.</p>
      </section>
    )
  }

  return (
    <section id="challenges-list" className={`challenges-list ${viewMode === 'list' ? 'is-list' : 'is-cards'}`} aria-label="Challenges list">
      {viewMode === 'list' ? (
        <div className="challenges-list-table">
          <div className="challenges-list-table__top">
            <p>
              Showing <strong>{challenges.length}</strong> challenges
            </p>
          </div>
          <div className="challenges-list-table__rows">
            {challenges.map((challenge, index) => (
              <ChallengeRow key={challenge.id} challenge={challenge} index={index} />
            ))}
          </div>
        </div>
      ) : (
        challenges.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} />)
      )}
    </section>
  )
}

export default ChallengesList
