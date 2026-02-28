import { useState, useRef, useEffect } from 'react'
import './FolderCard.css'

/**
 * FolderCard component representing a directory in the file system.
 */
function FolderCard({ title, subtitle, onClick, onMenuClick, onRename, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempName, setTempName] = useState(title)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const inputRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    if (!isMenuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen])

  const handleTitleClick = (e) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (tempName !== title) {
      onRename?.(tempName)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false)
      if (tempName !== title) {
        onRename?.(tempName)
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setTempName(title)
    }
  }

  const toggleMenu = (e) => {
    e.stopPropagation()
    setIsMenuOpen(!isMenuOpen)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    setIsMenuOpen(false)
    onDelete?.()
  }
  const isPendingFolder = title?.toLowerCase() === 'pending';

  return (
    <article className={`folder-card ${isPendingFolder ? 'is-pending' : ''}`} onClick={onClick} role="button" tabIndex={0}>
      <div className="folder-card__left">
        <span className="folder-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4.3l1.6 1.7h7.1A2.5 2.5 0 0 1 21 9.2v7.3a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5V7.5Z" />
          </svg>
        </span>
        <div className="folder-card__info">
          {isEditing ? (
            <input
              ref={inputRef}
              className="folder-card__input"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 onClick={handleTitleClick}>{title}</h3>
          )}
          <p>{subtitle}</p>
        </div>
      </div>
        <div className="folder-card__menu-container" ref={menuRef}>
          <button 
            className={`card-menu ${isMenuOpen ? 'is-active' : ''}`}
            type="button" 
            aria-label={`Open ${title} options`}
            onClick={toggleMenu}
          >
            <span aria-hidden="true">⋯</span>
          </button>
          
          {isMenuOpen && (
            <div className="card-menu-dropdown">
              <button 
                type="button" 
                className="menu-item menu-item--danger" 
                onClick={handleDelete}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
    </article>
  )
}

export default FolderCard
