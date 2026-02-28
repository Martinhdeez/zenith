// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useRef, useState, useEffect } from 'react'
import './ChatInput.css'

const QUICK_ACTIONS = [
  { icon: '🎵', label: 'Audios recientes', prompt: 'Listame los audios que he guardado la última semana y de qué tratan.' },
  { icon: '📊', label: 'Resumen general', prompt: 'Hazme un resumen general y estructurado de mis archivos más importantes.' },
  { icon: '🧠', label: 'Explicar concepto', prompt: 'Explícame el contenido de mis documentos recientes como si fuera un principiante.' },
  { icon: '✨', label: 'Organizar ideas', prompt: 'Ayúdame a organizar mis notas sin clasificar en diferentes carpetas temáticas.' }
]

function ChatInput({ onSend, isLoading = false }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e) => {
    setValue(e.target.value)
    // Auto-grow textarea
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  const handleQuickAction = (prompt) => {
    if (isLoading) return
    onSend(prompt)
  }

  return (
    <div className="chat-input-wrap">
      {/* Quick Actions - Hide when typing or loading */}
      <div className={`chat-quick-actions ${value.trim() || isLoading ? 'chat-quick-actions--hidden' : ''}`}>
        {QUICK_ACTIONS.map((action, idx) => (
          <button 
            key={idx} 
            className="chat-quick-action-btn"
            onClick={() => handleQuickAction(action.prompt)}
            disabled={isLoading}
          >
            <span className="chat-quick-action-icon">{action.icon}</span>
            <span className="chat-quick-action-label">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="chat-input">
        <textarea
          ref={textareaRef}
          className="chat-input__textarea"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask Zenith AI anything about your files..."
          rows={1}
          disabled={isLoading}
        />
        <button
          className="chat-input__send"
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          aria-label="Send message"
        >
          {isLoading ? (
            <span className="chat-input__spinner" />
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
      <p className="chat-input__hint">
        Zenith AI has context of your files. Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for new line.
      </p>
    </div>
  )
}

export default ChatInput
