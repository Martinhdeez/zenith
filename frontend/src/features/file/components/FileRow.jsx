import { useState, useRef, useEffect } from 'react'
import './FileRow.css'

/**
 * FileRow component representing a file in list view.
 */
function FileRow({ name, type, activity, userChar = 'U', onClick, onMenuClick, onRename, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempName, setTempName] = useState(name)
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

  const handleNameClick = (e) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (tempName !== name) {
      onRename?.(tempName)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false)
      if (tempName !== name) {
        onRename?.(tempName)
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setTempName(name)
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
  const getTypeClass = (type) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('pdf')) return 'pdf';
    if (typeLower.includes('sheet') || typeLower.includes('xls')) return 'sheet';
    if (typeLower.includes('slides') || typeLower.includes('ppt')) return 'slides';
    if (typeLower.includes('doc') || typeLower.includes('txt')) return 'doc';
    if (typeLower.includes('video') || typeLower.includes('mp4')) return 'video';
    if (typeLower.includes('image') || typeLower.includes('jpg') || typeLower.includes('png')) return 'image';
    return 'generic';
  };

  const typeClass = getTypeClass(type);

  return (
    <div className="file-row" onClick={onClick} role="button" tabIndex={0}>
      <div className="file-row__main">
        <span className={`file-row__type-icon file-row__type-icon--${typeClass}`}>
          {typeClass.substring(0, 1).toUpperCase()}
        </span>
        {isEditing ? (
          <input
            ref={inputRef}
            className="file-row__input"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="file-row__name" onClick={handleNameClick}>{name}</span>
        )}
      </div>
      
      <div className="file-row__meta">
        <span className="file-row__activity">{activity}</span>
        <div className="file-row__owner">
          <span className="file-row__avatar">{userChar}</span>
        </div>
        <div className="file-row__menu-container" ref={menuRef}>
          <button 
            className={`row-menu ${isMenuOpen ? 'is-active' : ''}`}
            type="button" 
            onClick={toggleMenu}
            aria-label={`Open ${name} options`}
          >
            ⋯
          </button>
          
          {isMenuOpen && (
            <div className="row-menu-dropdown">
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
      </div>
    </div>
  )
}

export default FileRow
