import TypewriterText from '../typewriterText/TypewriterText.jsx'
import './Hero.css'

function Hero({ words, onStart }) {
  return (
    <main className="hero hero-centered" id="overview">
      <div className="hero-copy hero-copy-centered">
        <p className="eyebrow">Digital brain platform</p>
        <p className="hero-brand">Zenith</p>
        <h1>
          Capture. Organize.
          <span className="accent">Activate your Digital Brain.</span>
        </h1>
        <p className="hero-subtitle">
          Turn <TypewriterText words={words} /> into structured knowledge{' '}
          <span>you can reuse whenever you need it.</span>
        </p>
        <div className="hero-actions">
          <button className="btn primary" type="button" onClick={onStart}>
            Try app
          </button>
        </div>
        <div className="scroll-indicator">
          <span>Scroll to explore</span>
          <span className="scroll-arrow">v</span>
        </div>
      </div>
    </main>
  )
}

export default Hero
