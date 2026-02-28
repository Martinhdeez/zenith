import { useState, useRef, useEffect, useCallback } from 'react'
import { fileService } from '../services/fileService'
import './FileCard.css'

/**
 * FileCard component representing a file in the file system.
 */
function FileCard({ file, userChar = 'U', onClick, onMenuClick, onRename, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempName, setTempName] = useState(file?.name || '')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [textContent, setTextContent] = useState(null)
  
  const inputRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Map backend mime types or formats to frontend types for styling
  const getTypeClass = (type) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('pdf')) return 'pdf';
    if (typeLower.includes('sheet') || typeLower.includes('xls')) return 'sheet';
    if (typeLower.includes('slides') || typeLower.includes('ppt')) return 'slides';
    if (typeLower.includes('doc') || typeLower.includes('txt') || typeLower === 'md' || typeLower.includes('markdown')) return 'doc';
    if (typeLower.includes('video') || typeLower.includes('mp4')) return 'video';
    if (typeLower.includes('image') || typeLower.includes('jpg') || typeLower.includes('png') || typeLower.includes('webp')) return 'image';
    return 'generic';
  };

  const typeClass = getTypeClass(file?.mime_type || file?.format);
  const isImage = typeClass === 'image' && file?.url && !imageError;
  const isTextLike = typeClass === 'doc';

  // Fetch text preview if it's a doc and there is no summary
  const fetchTextContent = useCallback(async () => {
    if (!isTextLike || file?.summary || textContent || !file?.id) return;
    try {
      const res = await fileService.downloadFile(file.id);
      const raw = res?.content || '';
      let result = raw;
      
      const b64Candidate = typeof raw === 'string' 
        ? raw.replace(/^data:.*?;base64,/, '').replace(/\s/g, '') : '';
        
      const isProbablyBase64 = b64Candidate.length > 0 && 
                               /^[A-Za-z0-9+/]*={0,2}$/.test(b64Candidate) &&
                               (b64Candidate.length % 4 === 0);

      if (isProbablyBase64) {
        try {
          const binary = window.atob(b64Candidate);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          result = new TextDecoder('utf-8').decode(bytes);
        } catch (atobErr) {
          // Fallback to raw if decoding fails
        }
      }
      
      const snippet = result.length > 150 ? result.substring(0, 150) + '...' : result;
      setTextContent(snippet);
    } catch (err) {
      console.error('FileCard text preview fetch error:', err);
    }
  }, [isTextLike, file?.summary, file?.id, textContent]);

  useEffect(() => {
    fetchTextContent();
  }, [fetchTextContent]);

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
    if (tempName !== file.name) {
      onRename?.(tempName)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false)
      if (tempName !== file.name) {
        onRename?.(tempName)
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setTempName(file.name)
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

  // Use AI summary if present, otherwise fallback to the fetched text snippet
  const displaySnippet = file?.summary 
    ? (file.summary.length > 150 ? file.summary.substring(0, 150) + '...' : file.summary)
    : textContent;

  const activity = file?.updated_at 
    ? `Modified · ${new Date(file.updated_at).toLocaleDateString()}` 
    : 'New file';

  return (
    <article className="file-card" onClick={onClick} role="button" tabIndex={0}>
      <header className="file-card__header">
        <span className={`file-card__type file-card__type--${typeClass}`}>
          {typeClass.toUpperCase()}
        </span>
        {isEditing ? (
          <input
            ref={inputRef}
            className="file-card__input"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 onClick={handleNameClick}>{file.name}</h3>
        )}
        <div className="file-card__menu-container" ref={menuRef}>
          <button 
            className={`card-menu ${isMenuOpen ? 'is-active' : ''}`}
            type="button" 
            aria-label={`Open ${file.name} options`}
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
      </header>
      
      <div className={`file-card__preview file-card__preview--${typeClass}`}>
        {isImage && (
          <img 
            src={file.url} 
            alt={file.name} 
            className="file-card__preview-image" 
            onError={() => setImageError(true)}
          />
        )}
        {isTextLike && displaySnippet && (
          <div className="file-card__preview-text">
            <p className={!file?.summary ? 'is-raw-text' : ''}>{displaySnippet}</p>
          </div>
        )}
      </div>
      
      <footer className="file-card__meta">
        <span className="file-card__avatar" aria-hidden="true">
          {userChar}
        </span>
        <span>{activity}</span>
      </footer>
    </article>
  )
}

export default FileCard
