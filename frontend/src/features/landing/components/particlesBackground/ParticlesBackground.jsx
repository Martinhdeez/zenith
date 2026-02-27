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
        color: { value: '#62f0ff' },
        links: { enable: true, color: '#62f0ff', opacity: 0.25, distance: 130 },
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
