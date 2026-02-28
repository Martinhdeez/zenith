// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useState } from 'react'
import './TypewriterText.css'

function TypewriterText({ words }) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = words[currentWordIndex]

    if (isDeleting) {
      if (currentText.length === 0) {
        setIsDeleting(false)
        setCurrentWordIndex((prev) => (prev + 1) % words.length)
        return
      }
      const timer = setTimeout(() => {
        setCurrentText((prev) => prev.slice(0, -1))
      }, 70)
      return () => clearTimeout(timer)
    }

    if (currentText === currentWord) {
      const pause = setTimeout(() => setIsDeleting(true), 1400)
      return () => clearTimeout(pause)
    }

    const timer = setTimeout(() => {
      setCurrentText(currentWord.slice(0, currentText.length + 1))
    }, 110)

    return () => clearTimeout(timer)
  }, [currentText, currentWordIndex, isDeleting, words])

  return (
    <span className="typewriter">
      {currentText}
      <span className="typewriter-caret" aria-hidden="true">
        |
      </span>
    </span>
  )
}

export default TypewriterText
