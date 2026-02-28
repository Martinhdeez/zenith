import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { chatService } from '../../assistant/services/chatService.js'
import './StudyPanel.css'

/**
 * StudyPanel — AI-powered side panel for generating study material from files.
 */
function StudyPanel({ file, onClose, onFullscreenToggle }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeMode, setActiveMode] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [showOptions, setShowOptions] = useState(true)
  
  // Resize and Fullscreen State
  const [width, setWidth] = useState(380)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isResizing = useRef(false)
  const panelRef = useRef(null)

  const startResizing = useCallback((e) => {
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const stopResizing = useCallback(() => {
    isResizing.current = false
    document.body.style.cursor = 'default'
    document.body.style.userSelect = 'auto'
  }, [])

  const resize = useCallback((e) => {
    if (!isResizing.current) return
    
    // Calculate new width (the panel is on the right, so we subtract from window width or similar)
    // Actually, it's easier to just use the mouse X position relative to the right edge
    const newWidth = window.innerWidth - e.clientX
    
    // Constraints
    if (newWidth > 300 && newWidth < window.innerWidth * 0.8) {
      setWidth(newWidth)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', resize)
    window.addEventListener('mouseup', stopResizing)
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [resize, stopResizing])

  const toggleFullscreen = () => {
    const newState = !isFullscreen
    setIsFullscreen(newState)
    if (onFullscreenToggle) onFullscreenToggle(newState)
  }

  const handleGenerate = async (mode, prompt = null) => {
    setLoading(true)
    setActiveMode(mode)
    setContent(null)
    setShowCustomInput(false)

    try {
      const res = await chatService.generateStudy(file.id, mode, prompt)
      setContent(res.content)
      setShowOptions(false) // Auto-hide options to maximize reading area
    } catch (err) {
      console.error('Study generation failed:', err)
      setContent('❌ Error generating study material. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomSubmit = () => {
    if (!customPrompt.trim()) return
    handleGenerate('custom', customPrompt.trim())
  }

  const modes = [
    {
      id: 'quiz',
      label: 'Quiz',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      desc: 'Generate quiz questions',
    },
    {
      id: 'outline',
      label: 'Outline',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
      desc: 'Structured summary',
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      desc: 'Study flashcards',
    },
  ]

  return (
    <aside 
      ref={panelRef}
      className={`study-panel ${isFullscreen ? 'study-panel--fullscreen' : ''}`}
      style={!isFullscreen ? { width: `${width}px` } : {}}
    >
      <div className="study-panel__resize-handle" onMouseDown={startResizing} />
      
      <header className="study-panel__header">
        <div className="study-panel__title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff857a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <h3>AI Study</h3>
        </div>
        <div className="study-panel__header-actions">
          <button 
            className="study-panel__icon-btn" 
            onClick={toggleFullscreen} 
            title={isFullscreen ? "Restore size" : "Maximize panel"}
          >
            {isFullscreen ? (
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
               </svg>
            ) : (
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
               </svg>
            )}
          </button>
          <button className="study-panel__close" onClick={onClose} aria-label="Close panel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      <div 
        className="study-panel__options-header" 
        onClick={() => setShowOptions(!showOptions)}
      >
        <span>Study Options {activeMode ? `· ${activeMode.charAt(0).toUpperCase() + activeMode.slice(1)}` : ''}</span>
        <svg 
          width="16" height="16" 
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: showOptions ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {showOptions && (
        <div className="study-panel__options-body">
          <div className="study-panel__actions">
            {modes.map((m) => (
              <button
                key={m.id}
                className={`study-action-btn ${activeMode === m.id ? 'is-active' : ''}`}
                onClick={() => handleGenerate(m.id)}
                disabled={loading}
              >
                {m.icon}
                <span className="study-action-btn__label">{m.label}</span>
                <span className="study-action-btn__desc">{m.desc}</span>
              </button>
            ))}
          </div>

          {/* Custom prompt area */}
          <div className="study-panel__custom">
            {!showCustomInput ? (
              <button
                className="study-custom-toggle"
                onClick={() => setShowCustomInput(true)}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Ask something custom...
              </button>
            ) : (
              <div className="study-custom-input">
                <textarea
                  placeholder="e.g. Explain the main concepts in simple terms..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  autoFocus
                />
                <div className="study-custom-input__btns">
                  <button onClick={() => setShowCustomInput(false)} className="study-custom-cancel">
                    Cancel
                  </button>
                  <button
                    onClick={handleCustomSubmit}
                    className="study-custom-submit"
                    disabled={loading || !customPrompt.trim()}
                  >
                    {loading ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="study-panel__content">
        {loading && (
          <div className="study-loading">
            <div className="study-loading__spinner" />
            <p>Generating {activeMode}...</p>
          </div>
        )}

        {!loading && content && (
          <div className="study-result">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {/* Transcription section for quick reference */}
        {!loading && file.transcription && (
          <div className="study-transcription-box">
            <h4>Original Transcription</h4>
            <p>{file.transcription}</p>
          </div>
        )}

        {!loading && !content && !file.transcription && (
          <div className="study-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <p>Select a study mode to generate AI-powered material from this file</p>
          </div>
        )}
      </div>
    </aside>
  )
}

export default StudyPanel
