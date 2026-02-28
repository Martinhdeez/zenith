// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import TypewriterText from '../typewriterText/TypewriterText.jsx'
import zenithLogo from '../../../../assets/logo/LOGO-DEFINITIVO.png'
import './Hero.css'

function Hero({ words, onStart }) {
  return (
    <main className="hero hero-centered" id="overview">
      <div className="hero-copy hero-copy-centered">
        <p className="eyebrow">Digital brain platform</p>
        <p className="hero-brand">
          <span className="hero-brand-z" aria-hidden="true">
            <img src={zenithLogo} alt="" className="hero-brand-logo" />
          </span>
          <span className="hero-brand-rest">enith</span>
        </p>
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
