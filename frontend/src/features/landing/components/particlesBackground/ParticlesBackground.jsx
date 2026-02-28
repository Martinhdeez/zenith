// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useMemo, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadStarsPreset } from '@tsparticles/preset-stars'
import './ParticlesBackground.css'

function ParticlesBackground() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadStarsPreset(engine)
    }).then(() => {
      setIsReady(true)
    })
  }, [])

  const options = useMemo(
    () => ({
      preset: 'stars',
      fullScreen: { enable: false },
      background: { color: { value: 'transparent' } },
      detectRetina: true,
      fpsLimit: 60,
      particles: {
        number: { value: 120, density: { enable: true, area: 900 } },
        color: { value: ['#b24f49', '#c95f58', '#e07a6d'] },
        links: { enable: true, color: '#c95f58', opacity: 0.28, distance: 130 },
        opacity: { value: 0.65 },
        size: { value: { min: 1, max: 2 } },
        move: { enable: true, speed: 0.5 },
      },
      interactivity: {
        events: {
          onHover: { enable: false },
          onClick: { enable: false },
          resize: true,
        },
      },
    }),
    [],
  )

  if (!isReady) {
    return null
  }

  return (
    <div className="particles-background" aria-hidden="true">
      <Particles id="tsparticles" className="particles-canvas" options={options} />
    </div>
  )
}

export default ParticlesBackground
