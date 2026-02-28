// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import './Footer.css'

const defaultProjectLine = 'Zenith 2026 HACKUDC'
const defaultNames = [
  'Alberto Paz Pérez',
  'Martín Hernández González',
  'Alex Mosqueira Gundin',
]

function Footer({ links = [], projectLine = defaultProjectLine, names = defaultNames }) {
  return (
    <footer className="footer">
      {links.length > 0 ? (
        <div className="footer-links">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
      <div className="footer-copyright" aria-label="Project credits">
        <p>{projectLine}</p>
        <p>{names.join(' · ')}</p>
      </div>
    </footer>
  )
}

export default Footer
