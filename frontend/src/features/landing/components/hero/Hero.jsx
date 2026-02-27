import TypewriterText from '../typewriterText/TypewriterText.jsx'
import './Hero.css'

function HeroStats({ stats }) {
  return (
    <div className="hero-stats">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-card">
          <div className="stat-value">{stat.value}</div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

function Hero({ words, stats, onStart }) {
  return (
    <main className="hero hero-centered" id="challenges">
      <div className="hero-copy hero-copy-centered">
        <p className="eyebrow">Coding challenge platform</p>
        <h1>
          Compete. Learn.
          <span className="accent">Master the code.</span>
        </h1>
        <p className="hero-subtitle">
          Train with <TypewriterText words={words} /> challenges{' '}
          <span>, level up, and build your portfolio with real solutions.</span>
        </p>
        <div className="hero-actions">
          <button className="btn primary" type="button" onClick={onStart}>
            Start now
          </button>
          <button className="btn secondary">Explore arena</button>
        </div>
        <HeroStats stats={stats} />
        <div className="scroll-indicator">
          <span>Scroll to explore</span>
          <span className="scroll-arrow">v</span>
        </div>
      </div>
    </main>
  )
}

export default Hero
