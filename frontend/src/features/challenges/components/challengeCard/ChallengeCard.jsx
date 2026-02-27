import './ChallengeCard.css'

const languageCodes = {
  JavaScript: 'JS',
  TypeScript: 'TS',
  Python: 'PY',
  SQL: 'SQL',
}

function ChallengeCard({ challenge }) {
  const code = languageCodes[challenge.language] || challenge.language.slice(0, 3).toUpperCase()
  const langClass = `is-${code.toLowerCase()}`

  return (
    <article className="challenge-card">
      <div className="challenge-card__main">
        <header className="challenge-card__head">
          <h3>{challenge.title}</h3>
          <span className={`challenge-card__difficulty is-${challenge.difficulty.toLowerCase()}`}>{challenge.difficulty}</span>
        </header>

        <p className="challenge-card__description">{challenge.description}</p>
      </div>

      <footer className="challenge-card__foot">
        <span className={`challenge-card__lang ${langClass}`}>{code}</span>
        <span className="challenge-card__meta">{challenge.estimatedTime}</span>
      </footer>
    </article>
  )
}

export default ChallengeCard
